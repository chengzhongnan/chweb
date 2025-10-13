import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie } from 'hono/cookie'

// 定义 Hono App 的类型，包含我们的绑定
type Env = {
	Bindings: {
		SITE_BUCKET: R2Bucket;
		ADMIN_API_KEY: string;
		SITE_JSON: string;
	}
}

const app = new Hono<Env>()

app.post('/login', async (c) => {
	const { password } = await c.req.json();
	if (password === c.env.ADMIN_API_KEY) {
		// 密码正确，设置cookie
		setCookie(c, 'admin_token', password, {
			path: '/',
			secure: true,   // 仅在HTTPS下发送
			httpOnly: true, // 防止客户端JS读取
			maxAge: 60 * 60 * 24 * 7, // 7天有效期
			sameSite: 'Lax'
		});
		return c.json({ success: true, message: 'Login successful' });
	}
	return c.json({ success: false, error: 'Invalid password' }, 401);
});

// --- 1. 管理后台的认证中间件 ---
const authMiddleware = async (c, next) => {
	const token = getCookie(c, 'admin_token');
	if (token !== c.env.ADMIN_API_KEY) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	await next();
};

// --- 2. 公共 API：获取站点数据 ---
app.get('/api/sites', async (c) => {
	const object = await c.env.SITE_BUCKET.get(c.env.SITE_JSON);
	if (object === null) {
		return c.json({ error: 'Data file not found' }, 404);
	}

	const sitesData: any[] = await object.json();
	const token = getCookie(c, 'admin_token');

	// 检查是否已认证
	if (token === c.env.ADMIN_API_KEY) {
		// 已认证，返回完整数据
		console.log("Admin authenticated, returning full data.");
		return c.json(sitesData);
	} else {
		// 未认证，过滤私有站点
		console.log("Public access, returning filtered data.");
		const publicData = sitesData.map(category => {
			return {
				...category,
				sites: category.sites.filter(site => !site.private)
			};
		});
		return c.json(publicData);
	}
});

// 更新站点数据
app.post('/admin/sites', authMiddleware, async (c) => {
	try {
		const newSitesData = await c.req.json();
		await c.env.SITE_BUCKET.put(c.env.SITE_JSON, JSON.stringify(newSitesData, null, 2));
		return c.json({ success: true, message: 'Data updated successfully.' });
	} catch (error: any) {
		return c.json({ error: 'Failed to update data', details: error.message }, 500);
	}
});

// --- 4. 静态文件服务 (从R2提供) ---
// 这个中间件会尝试从 R2 提供文件，如果找不到，则提供 index.html (SPA模式)
app.get('*', async (c) => {

	if (c.req.url.startsWith('http://127.0.0.1')) {
		const resp = await fetch(c.req.url.replace('8787', '8080'));
		return resp;
	}

	const url = new URL(c.req.url);
	let key = url.pathname.substring(1); // 移除开头的 '/'

	// 根路径请求 'public/index.html'
	if (key === '') {
		key = 'index.html';
	}
	// 如果是 admin 页面
	else if (key === 'admin') {
		key = 'admin/admin.html';
	}
	// 静态资源路径处理
	else if (!key.includes('.')) {
		// 对于没有扩展名的路径(如 /about)，也返回 index.html 让前端路由处理
		key = 'index.html';
	} else {
		// 默认文件都在 public 文件夹下
		// 如果是 admin.js 或 admin.css，则从 admin 文件夹下找
		if (key.startsWith('admin/')) {
			// 路径已包含 admin/
		} else {
			key = `${key}`;
		}
	}

	const object = await c.env.SITE_BUCKET.get(key);
	if (object === null) {
		return c.text('Not Found', 404);
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);

	// 对于HTML/CSS/JS文件，添加正确的 Content-Type
	if (key.endsWith('.html')) headers.set('Content-Type', 'text/html;charset=UTF-8');
	if (key.endsWith('.css')) headers.set('Content-Type', 'text/css;charset=UTF-8');
	if (key.endsWith('.js')) headers.set('Content-Type', 'application/javascript;charset=UTF-8');

	return new Response(object.body, { headers });
});

export default app