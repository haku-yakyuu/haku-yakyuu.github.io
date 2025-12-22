// 設定您的 Google Apps Script 部署網址
const API_URL = "https://script.google.com/macros/s/AKfycbw7jGvpY2DU5dPdSdkXMcL4Mnf0jZIcKfMYEJOkIiDIm7qoMkGid-upq1AJ3mVRP9Il/exec"; 

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
});

// 從後台抓取資料
function fetchProducts() {
    const containerVertical = document.getElementById('grid-vertical-container');
    // 先顯示 Loading 文字
    if(containerVertical) containerVertical.innerHTML = '<div style="grid-column:1/-1; text-align:center;">載入 HAKU 選品中...</div>';

    fetch(API_URL)
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // 成功抓取！開始渲染
            renderGrid(data.products, data.config);
        } else {
            console.error('資料讀取錯誤');
        }
    })
    .catch(error => {
        console.error('API 連線失敗:', error);
        if(containerVertical) containerVertical.innerHTML = '<div style="grid-column:1/-1; text-align:center;">連線失敗，請稍後再試。</div>';
    });
}

function renderGrid(products, config) {
    // 取得 Config 中的實心標籤設定 (轉為陣列)
    // 若 config.solid_tags 為空，給一個空陣列避免報錯
    const solidKeywords = config.solid_tags ? config.solid_tags.split(',') : [];

    // 定義容器
    const containerV = document.getElementById('grid-vertical-container');
    const containerH = document.getElementById('grid-horizontal-container');
    const containerS = document.getElementById('grid-service-container');

    // 清空容器
    if(containerV) containerV.innerHTML = '';
    if(containerH) containerH.innerHTML = '';
    if(containerS) containerS.innerHTML = '';

    products.forEach(item => {
        // [修正] 注意：您的 JSON 欄位是 layout_type，所以這裡要用 item.layout_type
        const layout = item.layout_type; 
        
        // 分配到對應容器
        let targetContainer = null;
        if (layout === 'vertical') targetContainer = containerV;
        else if (layout === 'horizontal') targetContainer = containerH;
        else if (layout === 'no_image') targetContainer = containerS;

        if (!targetContainer) return; // 如果找不到容器就不渲染

        // --- 以下邏輯與之前相同 ---
        
        const isHorizontal = layout === 'horizontal';
        const isCompact = layout === 'no_image';
        
        let cardClass = 'haku-card';
        if (isHorizontal) cardClass += ' horizontal';
        if (isCompact) cardClass += ' no-image';
        if (item.stock <= 0) cardClass += ' sold-out';

        // 圖片邏輯
        let imgHtml = '';
        if (!isCompact) {
            const imgContainerClass = isHorizontal ? 'img-h' : 'img-v';
            if (item.images && item.images.trim() !== '') {
                // 支援多圖，這裡先只取第一張圖顯示在卡片上
                const firstImage = item.images.split(',')[0].trim();
                imgHtml = `<div class="${imgContainerClass}"><img src="${firstImage}" alt="${item.name}"></div>`;
            } else {
                imgHtml = `<div class="${imgContainerClass}"><span class="material-symbols-outlined">image</span></div>`;
            }
        }

        // Tags 邏輯 (使用後台 Config)
        const tagHtml = item.tags ? item.tags.split(',').map(tag => {
            const t = tag.trim();
            const isSolid = solidKeywords.includes(t);
            return `<span class="tag ${isSolid ? 'tag-solid' : 'tag-hollow'}">${t}</span>`;
        }).join('') : '';

        // 價格邏輯
        const priceDisplay = item.price === 0 ? 'FREE' : `$ ${item.price}`;
        const actionIcon = isCompact ? 'arrow_forward' : 'add_shopping_cart';

        // 組合 HTML
        const html = `
            <div class="${cardClass}">
                ${imgHtml}
                <div class="card-body">
                    <div class="tag-group">${tagHtml}</div>
                    <h3 class="p-name">${item.name}</h3>
                    <div class="p-price">${priceDisplay}</div>
                    <span class="material-symbols-outlined cart-icon" onclick="addToCart('${item.name}')">${actionIcon}</span>
                </div>
            </div>
        `;
        targetContainer.innerHTML += html;
    });
}

// 購物車功能維持不變
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('overlay');
    if(sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    }
}

function addToCart(name) {
    const container = document.getElementById('cart-items-container');
    if(container) {
        const itemHtml = `<div style="padding:10px; border-bottom:1px solid #ddd; font-size:0.9rem;">${name}</div>`;
        if(container.innerText.includes('空的')) container.innerHTML = '';
        container.innerHTML += itemHtml;
        toggleCart();
    }
}
