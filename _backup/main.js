// 你的 GAS 部署網址 (請替換成新的)
const API_URL = 'https://script.google.com/macros/s/AKfycbw7jGvpY2DU5dPdSdkXMcL4Mnf0jZIcKfMYEJOkIiDIm7qoMkGid-upq1AJ3mVRP9Il/exec'; 

async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        const products = await response.json();
        
        // 呼叫渲染函式
        renderPage(products);
    } catch (error) {
        console.error('資料載入失敗:', error);
    }
}

function renderPage(products) {
    // 1. 篩選資料
    // 精選商品：檢查 isFeatured 是否為 true
    const featuredItems = products.filter(p => p.isFeatured === true);
    
    // 職人配件：檢查 category
    const craftItems = products.filter(p => p.category === '職人配件');
    
    // 服務項目：檢查 category
    const serviceItems = products.filter(p => p.category === '服務項目');

    // 2. 渲染到對應容器
    renderGrid(featuredItems, 'featured-list');
    renderGrid(craftItems, 'crafts-list');
    renderGrid(serviceItems, 'services-list');
}

// 通用的渲染卡片函式
function renderGrid(items, containerId) {
    const container = document.getElementById(containerId);
    
    // 如果該分類沒有商品，或是容器找不到，直接返回
    if (!container || items.length === 0) {
        if(container) container.innerHTML = '<p>目前無相關項目</p>';
        return;
    }

    container.innerHTML = items.map(product => {
        // 處理圖片：如果有多張圖，取第一張；如果沒圖，用預設圖
        // 假設 GAS 傳回來的 images 是逗號分隔字串，或者已經是陣列
        let imageUrl = 'https://via.placeholder.com/300'; // 預設圖
        if (product.images) {
            // 判斷是否為字串並切割，或是直接使用
            const imgArray = typeof product.images === 'string' ? product.images.split(',') : product.images;
            if (imgArray.length > 0) imageUrl = imgArray[0].trim();
        }

        // 根據 layout_type 決定按鈕文字 (選用)
        const btnText = product.layout_type === 'service' ? '預約諮詢' : '加入購物車';

        // 生成卡片 HTML
        return `
            <div class="product-card ${product.layout_type || ''}">
                <div class="image-container">
                    <img src="${imageUrl}" alt="${product.name}">
                    ${product.isFeatured ? '<span class="badge">精選</span>' : ''}
                </div>
                <h3>${product.name}</h3>
                <p class="price">NT$ ${product.price}</p>
                <p class="desc">${product.description || ''}</p>
                <button>${btnText}</button>
            </div>
        `;
    }).join('');
}

// 啟動
fetchProducts();
