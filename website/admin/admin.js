document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素获取 ---
    const loginSection = document.getElementById('login-section');
    const editor = document.getElementById('editor');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const loginStatus = document.getElementById('login-status');
    const adminNavList = document.getElementById('admin-nav-list');
    const categoriesList = document.getElementById('categories-list');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const saveBtn = document.getElementById('save-btn');
    const saveStatus = document.getElementById('save-status');

    // [新增] 模态框相关元素
    const modalOverlay = document.getElementById('site-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const siteForm = document.getElementById('site-form');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const logoInput = document.getElementById('site-logo-input');
    const logoPreview = document.getElementById('logo-preview');

    // 用于在编辑时追踪当前操作的元素
    let currentlyEditingSiteElement = null;

    // =======================================================================
    // [核心修改] 页面加载后立即执行的函数
    // =======================================================================
    async function initializeApp() {
        // 尝试获取站点数据，这个请求会自动携带cookie
        try {
            const response = await fetch('/api/sites', { credentials: 'include' });
            if (response.ok) {
                const siteData = await response.json();
                showEditor(siteData);
            } else {
                showLogin();
            }
        } catch (error) {
            showLogin('无法连接到服务器。');
        }
    }

    // --- 显示登录界面的辅助函数 ---
    function showLogin(message = '') {
        editor.classList.add('hidden');
        loginSection.classList.remove('hidden');
        loginStatus.textContent = message;
    }

    // --- 显示编辑器界面的辅助函数 ---
    function showEditor(data) {
        loginSection.classList.add('hidden');
        editor.classList.remove('hidden');
        renderUI(data);
    }

    // --- 登录按钮事件 ---
    loginBtn.addEventListener('click', async () => {
        const password = passwordInput.value;
        if (!password) {
            loginStatus.textContent = '请输入密码!';
            return;
        }
        loginStatus.textContent = '登录中...';

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const result = await response.json();

            if (result.success) {
                loginStatus.textContent = '登录成功!';
                await initializeApp(); // 登录成功后，重新执行初始化逻辑
            } else {
                loginStatus.textContent = '密码错误!';
            }
        } catch (error) {
            loginStatus.textContent = '登录请求失败。';
        }
    });

    // --- 渲染整个UI界面 ---
    function renderUI(data) {
        // 清空旧内容
        adminNavList.innerHTML = '';
        categoriesList.innerHTML = '';

        if (data.length === 0) return;

        data.forEach((categoryData, index) => {
            // 1. 渲染导航栏链接
            const navLink = createNavLink(categoryData.category, index === 0);
            adminNavList.appendChild(navLink);

            // 2. 渲染分类内容区块
            const categoryElement = createCategoryElement(categoryData, index === 0);
            categoriesList.appendChild(categoryElement);
        });

        // 3. 启用站点拖拽
        initSiteSortable();
        // 4. 绑定所有事件
        bindEventListeners();
    }

    function createNavLink(categoryName, isActive = false) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = categoryName;
        a.dataset.category = categoryName;
        if (isActive) {
            a.classList.add('active');
        }
        li.appendChild(a);
        return li;
    }

    // --- 创建分类的DOM元素 ---
    function createCategoryElement(categoryData, isActive = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'category-section';
        if (isActive) {
            wrapper.classList.add('active');
        }
        wrapper.dataset.categoryName = categoryData.category;

        wrapper.innerHTML = `
        <div class="category-header">
            <h3 class="category-title">${categoryData.category}</h3>
            <div class="category-actions">
                <button class="action-btn edit-category-btn">改名</button>
                <button class="action-btn delete-category-btn">删除分类</button>
                <button class="action-btn add-site-btn">＋ 添加站点</button>
            </div>
        </div>
        <ol class="sites-list"></ol>
    `;

        const sitesList = wrapper.querySelector('.sites-list');
        if (categoryData.sites && categoryData.sites.length > 0) {
            categoryData.sites.forEach(siteData => {
                sitesList.appendChild(createSiteElement(siteData));
            });
        }
        return wrapper;
    }

    // --- 事件和排序 ---
    function initSiteSortable() {
        // [修改] 只初始化站点的排序，不再对分类排序
        document.querySelectorAll('.sites-list').forEach(list => {
            new Sortable(list, {
                group: 'sites',
                animation: 150,
                handle: '.site-drag-handle',
                ghostClass: 'sortable-ghost'
            });
        });
    }

    // --- 创建站点的DOM元素 ---
    function createSiteElement(siteData) {
        const siteItem = document.createElement('li');
        siteItem.className = 'site-item';
        // 将数据存储在元素的 dataset 中，方便读取
        siteItem.dataset.name = siteData.name;
        siteItem.dataset.url = siteData.url;
        siteItem.dataset.desc = siteData.desc || '';
        siteItem.dataset.logo = siteData.logo || '';
        siteItem.dataset.private = siteData.private || false;

        siteItem.innerHTML = `
            <span class="drag-handle site-drag-handle">⠿</span>
            <div class="site-info">
                <p class="site-name">${siteData.name} ${siteData.private ? '<span class="private-tag">私有</span>' : ''}</p>
                <p class="site-url">${siteData.url}</p>
            </div>
            <div class="site-actions">
                <button class="action-btn edit-site-btn">编辑</button>
                <button class="action-btn delete-site-btn">删除</button>
            </div>
        `;
        return siteItem;
    }

    // --- 初始化拖拽排序 ---
    function initSortable() {
        new Sortable(categoriesList, {
            animation: 150,
            handle: '.category-drag-handle',
            ghostClass: 'sortable-ghost'
        });
        document.querySelectorAll('.sites-list').forEach(list => {
            new Sortable(list, {
                group: 'sites',
                animation: 150,
                handle: '.site-drag-handle',
                ghostClass: 'sortable-ghost'
            });
        });
    }

    // --- 事件绑定 (使用事件委托) ---
    function bindEventListeners() {

        adminNavList.addEventListener('click', e => {
            e.preventDefault();
            if (e.target.tagName === 'A') {
                const categoryName = e.target.dataset.category;
                switchTab(categoryName);
            }
        });

        addCategoryBtn.onclick = () => {
            const name = prompt('请输入新的分类名称:');
            if (name && name.trim()) {
                // 检查分类是否已存在
                const existing = [...document.querySelectorAll('#admin-nav-list a')].find(a => a.dataset.category === name);
                if (existing) {
                    alert('该分类已存在！');
                    return;
                }
                adminNavList.appendChild(createNavLink(name, false));
                categoriesList.appendChild(createCategoryElement({ category: name, sites: [] }, false));
                initSiteSortable();
                switchTab(name); // 切换到新创建的分类
            }
        };

        saveBtn.onclick = handleSave;
        categoriesList.addEventListener('click', e => {
            const target = e.target;
            const categorySection = target.closest('.category-section');
            const siteItem = target.closest('.site-item');
            const currentCategoryName = categorySection.dataset.categoryName;


            if (target.matches('.edit-category-btn')) {
                const titleEl = categorySection.querySelector('.category-title');
                const newName = prompt('请输入新的分类名称:', currentCategoryName);
                if (newName && newName.trim() && newName !== currentCategoryName) {
                    // 更新UI
                    titleEl.textContent = newName;
                    categorySection.dataset.categoryName = newName;
                    // 更新导航栏
                    const navLink = adminNavList.querySelector(`a[data-category="${currentCategoryName}"]`);
                    navLink.textContent = newName;
                    navLink.dataset.category = newName;
                }
            } else if (target.matches('.delete-category-btn')) {
                if (confirm(`确定要删除分类 "${currentCategoryName}" 及其所有站点吗？`)) {
                    // 从DOM中删除
                    categorySection.remove();
                    adminNavList.querySelector(`a[data-category="${currentCategoryName}"]`).parentElement.remove();

                    // 切换到第一个标签页
                    const firstNavLink = adminNavList.querySelector('a');
                    if (firstNavLink) {
                        switchTab(firstNavLink.dataset.category);
                    }
                }
            } else if (target.matches('.add-site-btn')) {
                openModal({ mode: 'add', categoryElement: categorySection });
            } else if (target.matches('.edit-site-btn')) {
                openModal({ mode: 'edit', siteElement: siteItem });
            } else if (target.matches('.delete-site-btn')) {
                if (confirm(`确定要删除站点 "${siteItem.dataset.name}" 吗？`)) {
                    siteItem.remove();
                }
            }
        });
    }

    function switchTab(categoryName) {
        // 更新导航链接的激活状态
        adminNavList.querySelectorAll('a').forEach(a => {
            a.classList.toggle('active', a.dataset.category === categoryName);
        });
        // 更新分类内容的显示状态
        categoriesList.querySelectorAll('.category-section').forEach(section => {
            section.classList.toggle('active', section.dataset.categoryName === categoryName);
        });
    }

    // --- 将DOM结构序列化回JSON ---
    function buildDataFromDOM() {
        const finalData = [];
        document.querySelectorAll('.category-section').forEach(categoryEl => {
            const categoryData = {
                category: categoryEl.dataset.categoryName,
                sites: []
            };
            categoryEl.querySelectorAll('.site-item').forEach(siteEl => {
                categoryData.sites.push({
                    name: siteEl.dataset.name,
                    url: siteEl.dataset.url,
                    desc: siteEl.dataset.desc,
                    logo: siteEl.dataset.logo,
                    private: siteEl.dataset.private === 'true'
                });
            });
            finalData.push(categoryData);
        });
        return finalData;
    }

    // --- 保存数据到后端 ---
    async function handleSave() {
        const dataToSave = buildDataFromDOM();
        saveStatus.textContent = '正在保存...';
        saveStatus.style.color = '#333';

        try {
            const response = await fetch('/admin/sites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave),
                credentials: 'include'
            });
            const result = await response.json();

            if (response.ok && result.success) {
                saveStatus.textContent = `保存成功！ (${new Date().toLocaleTimeString()})`;
                saveStatus.style.color = 'green';
            } else {
                throw new Error(result.error || '保存请求失败');
            }
        } catch (error) {
            saveStatus.textContent = `错误: ${error.message}`;
            saveStatus.style.color = 'red';
            if (error.message.includes('Unauthorized')) {
                showLogin('会话已过期，请重新登录后保存。');
            }
        }
    }

    // =======================================================================
    // [核心修改] 模态框驱动的站点操作
    // =======================================================================

    // --- 模态框控制：打开 ---
    function openModal(options = {}) {
        // 解构参数，默认为添加模式
        const { mode = 'add', siteElement = null, categoryElement = null } = options;

        // 全局变量，用于在提交时判断是添加还是编辑
        currentlyEditingSiteElement = siteElement;

        // 根据模式设置标题和表单内容
        if (mode === 'edit' && siteElement) {
            // --- 编辑模式 ---
            modalTitle.textContent = '编辑站点';

            // 从被点击元素的 dataset 中获取数据并填充表单
            document.getElementById('site-name').value = siteElement.dataset.name;
            document.getElementById('site-url').value = siteElement.dataset.url;
            document.getElementById('site-desc').value = siteElement.dataset.desc;
            document.getElementById('site-private').checked = siteElement.dataset.private === 'true';

            // 特别处理Logo数据：
            const logoData = siteElement.dataset.logo;
            const logoInput = document.getElementById('site-logo-input');

            if (logoData.startsWith('data:image/svg+xml;base64,')) {
                // 如果是Data URI, 我们需要解码回原始SVG代码给用户看
                try {
                    const base64 = logoData.replace('data:image/svg+xml;base64,', '');
                    // atob() 是浏览器提供的Base64解码函数
                    const svgCode = atob(base64);
                    logoInput.value = svgCode;
                } catch (e) {
                    console.error("解析SVG Data URI失败:", e);
                    logoInput.value = '无法解析SVG';
                }
            } else {
                // 如果是普通的URL或路径，直接显示
                logoInput.value = logoData;
            }

        } else {
            // --- 添加模式 ---
            modalTitle.textContent = '添加新站点';
            siteForm.reset(); // 清空表单所有内容
            // 将当前激活的分类信息存起来，以便添加时知道加到哪里
            const activeCategory = document.querySelector('.category-section.active');
            siteForm.dataset.targetCategory = activeCategory.dataset.categoryName;
        }

        // 手动触发一次input事件，以根据表单内容更新logo预览
        document.getElementById('site-logo-input').dispatchEvent(new Event('input'));

        // 显示模态框
        modalOverlay.classList.remove('hidden');

        // 自动聚焦到第一个输入框，提升用户体验
        document.getElementById('site-name').focus();
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
        currentlyEditingSiteElement = null;
    }

    // --- 事件绑定 ---
    modalCancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    siteForm.addEventListener('submit', handleFormSubmit);

    // --- 表单提交处理 ---
    async function handleFormSubmit(e) {
        e.preventDefault(); // 阻止表单默认的提交刷新行为

        // --- 1. 从表单获取所有数据 ---
        const name = document.getElementById('site-name').value;
        const url = document.getElementById('site-url').value;
        const desc = document.getElementById('site-desc').value;
        const logoInputValue = document.getElementById('site-logo-input').value.trim();
        const isPrivate = document.getElementById('site-private').checked;

        // --- 2. 处理Logo数据 ---
        let logoData = '';
        // 判断输入的是否是原始SVG代码
        if (logoInputValue.startsWith('<svg')) {
            // 如果是，将其转换为Base64 Data URI
            // btoa() 是浏览器提供的Base64编码函数
            logoData = 'data:image/svg+xml;base64,' + btoa(logoInputValue);
        } else {
            // 如果不是，我们就认为它是一个URL或文件路径，直接使用
            logoData = logoInputValue;
        }

        // --- 3. 组装成一个站点对象 ---
        const siteData = { name, url, desc, logo: logoData, private: isPrivate };

        // --- 4. 判断是更新还是创建 ---
        if (currentlyEditingSiteElement) {
            // 编辑模式：更新现有的DOM元素
            updateSiteElement(currentlyEditingSiteElement, siteData);
        } else {
            // 添加模式：创建新的DOM元素并添加到当前分类中
            const targetCategoryName = siteForm.dataset.targetCategory;
            const categorySection = document.querySelector(`.category-section[data-category-name="${targetCategoryName}"]`);
            if (categorySection) {
                const sitesList = categorySection.querySelector('.sites-list');
                const newSiteEl = createSiteElement(siteData);
                sitesList.appendChild(newSiteEl);
            }
        }

        // --- 5. 关闭模态框 ---
        closeModal();
    }

    // --- 更新或创建DOM元素的辅助函数 ---
    function updateSiteElement(element, data) {
        element.dataset.name = data.name;
        element.dataset.url = data.url;
        element.dataset.desc = data.desc;
        element.dataset.logo = data.logo;
        element.dataset.private = data.private;

        element.querySelector('.site-name').innerHTML = `${data.name} ${data.private ? '<span class="private-tag">私有</span>' : ''}`;
        element.querySelector('.site-url').textContent = data.url;
    }

    logoInput.addEventListener('input', () => {
        const input = logoInput.value.trim();
        if (input.startsWith('<svg')) {
            // 如果是SVG代码, 转换为Data URI
            try {
                const dataUri = 'data:image/svg+xml;base64,' + btoa(input);
                logoPreview.src = dataUri;
            } catch (e) {
                logoPreview.src = ''; // 解析失败则清空
            }
        } else {
            // 否则直接作为 URL 或路径处理
            logoPreview.src = input;
        }
    });


    // --- [启动] ---
    initializeApp();
});