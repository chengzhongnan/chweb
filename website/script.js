document.addEventListener('DOMContentLoaded', () => {
    // 获取页面上的主要元素
    const navList = document.getElementById('nav-list');
    const categoryTitleEl = document.getElementById('card-category-title');
    const gridContainer = document.getElementById('card-grid-container');

    // 用于存储所有分类的数据
    let allData = {};
    let categories = [];

    // --- 1. 获取并处理数据 ---
    fetch('/api/sites')
        .then(response => response.json())
        .then(data => {
            // 将数据存储在更易于访问的结构中
            categories = data.map(cat => cat.category);
            data.forEach(cat => {
                allData[cat.category] = cat.sites;
            });

            // --- 2. 初始化页面 ---

            // 【修改 1/3】：从本地存储读取上次选择的分类
            const lastSelectedCategory = localStorage.getItem('lastSelectedCategory');
            
            // 确定要默认显示的分类：优先使用本地存储的，如果无效或不存在，则使用第一个
            const initialCategory = lastSelectedCategory && categories.includes(lastSelectedCategory) 
                                      ? lastSelectedCategory 
                                      : categories[0];

            setupNavigation(initialCategory); // 将需要激活的分类传给导航设置函数
            renderCategory(initialCategory);  // 渲染这个分类的内容
        })
        .catch(error => {
            console.error('加载导航数据失败:', error);
            categoryTitleEl.textContent = '加载失败';
        });

    // --- 3. 设置导航栏 ---
    // 【修改 2/3】：函数接收一个参数，用于指定哪个链接应该被激活
    function setupNavigation(activeCategory) {
        navList.innerHTML = ''; // 清空导航栏
        categories.forEach(category => {
            const navItem = document.createElement('li');
            const navLink = document.createElement('a');
            navLink.textContent = category;
            navLink.href = '#';
            navLink.dataset.category = category;

            // 根据传入的 activeCategory 来决定哪个链接有 'active-link' 类
            if (category === activeCategory) {
                navLink.classList.add('active-link');
            }

            // [核心] 添加点击事件监听器
            navLink.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 移除所有链接的激活状态
                document.querySelectorAll('#nav-list a').forEach(a => a.classList.remove('active-link'));
                // 为当前点击的链接添加激活状态
                e.target.classList.add('active-link');

                // 渲染被点击的分类
                renderCategory(category);

                // 【修改 3/3】：将当前点击的分类存储到本地存储
                localStorage.setItem('lastSelectedCategory', category);
            });

            navItem.appendChild(navLink);
            navList.appendChild(navItem);
        });
    }

    // --- 4. 渲染指定分类内容的函数 ---
    function renderCategory(categoryName) {
        const sites = allData[categoryName];
        if (!sites) return;

        categoryTitleEl.textContent = categoryName;

        gridContainer.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'card-grid';

        sites.forEach(site => {
            const card = createSiteCard(site);
            grid.appendChild(card);
        });
        
        gridContainer.appendChild(grid);
    }
    
    // --- 5. 创建单个网站卡片的辅助函数 (无需修改) ---
    function createSiteCard(site) {
        const cardLink = document.createElement('a');
        cardLink.href = site.url;
        cardLink.className = 'site-card';
        cardLink.target = '_blank';
        cardLink.rel = 'noopener noreferrer';

        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';

        const logo = document.createElement('img');
        logo.src = site.logo || 'logos/default.svg';
        logo.alt = `${site.name} Logo`;
        logo.className = 'site-logo';
        logo.onerror = () => { logo.src = 'logos/default.svg'; };

        const name = document.createElement('h3');
        name.className = 'site-name';
        name.textContent = site.name;

        cardHeader.appendChild(logo);
        cardHeader.appendChild(name);

        const description = document.createElement('p');
        description.className = 'site-desc';
        description.textContent = site.desc;

        cardLink.appendChild(cardHeader);
        cardLink.appendChild(description);

        return cardLink;
    }
});