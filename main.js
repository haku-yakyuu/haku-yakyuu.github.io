// 測試資料：模擬後台回傳的 JSON
// 未來這部分會替換成 fetch(GAS_API_URL)
const products = [
    // 1. 直式 - 正常有圖
    { id: 'p1', name: '1984 復古紀念球', price: 2480, tags: '新品,限量', image: 'https://images.unsplash.com/photo-1510731039227-5d8c911cde28?auto=format&fit=crop&q=80&w=400', stock: 1, layout: 'vertical' },
    
    // 2. 直式 - 無圖 (應顯示佔位色塊，不收縮)
    { id: 'p2', name: '神秘福袋 (圖片準備中)', price: 1500, tags: '熱門', image: '', stock: 10, layout: 'vertical' },
    
    // 3. 直式 - 已售完
    { id: 'p3', name: 'WBC 決賽用球', price: 5200, tags: '絕版', image: 'https://images.unsplash.com/photo-1593766788306-28561086694e?auto=format&fit=crop&q=80&w=400', stock: 0, layout: 'vertical' },
    
    // 4. 橫式 - 有圖
    { id: 'p4', name: '胡桃木展示架', price: 850, tags: '配件', image: 'https://images.unsplash.com/photo-1529768167801-9173d94c2a42?auto=format&fit=crop&q=80&w=400', stock: 5, layout: 'horizontal' },
    
    // 5. 橫式 - 無圖 (應顯示佔位色塊，不收縮)
    { id: 'p5', name: '特製清潔油 (圖片補拍中)', price: 450, tags: '保養', image: '', stock: 20, layout: 'horizontal' },
    
    // 6. 純文字/服務模式 (Layout = no_image) -> 只有這個會收縮
    { id: 'p6', name: '日本代購服務 (預付訂金)', price: 500, tags: '服務', image: '', stock: 99, layout: 'no_image' },
    { id: 'p7', name: '收藏品鑑定諮詢', price: 0, tags: '諮詢', image: '', stock: 99, layout: 'no_image' }
];

document.addEventListener('DOMContentLoaded', () => {
    // 根據 layout 屬性，將商品分派到不同的容器中
    renderGrid(products.filter(p => p.layout === 'vertical'), 'grid-vertical-container');
    renderGrid(products.filter(p => p.layout === 'horizontal'), 'grid-horizontal-container');
    renderGrid(products.filter(p => p.layout === 'no_image'), 'grid-service-container');
});

function renderGrid(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = ''; // 清空

    data.forEach(item => {
        // 1. 決定卡片類別
        const isHorizontal = item.layout === 'horizontal';
        const isCompact = item.layout === 'no_image'; // 收縮模式
        
        let cardClass = 'haku-card';
        if (isHorizontal) cardClass += ' horizontal';
        if (isCompact) cardClass += ' no-image';
        if (item.stock <= 0) cardClass += ' sold-out';

        // 2. 處理圖片邏輯 (您的關鍵要求)
        let imgHtml = '';
        
        if (!isCompact) { // 只要不是收縮模式，都要有圖片區塊
            const imgContainerClass = isHorizontal ? 'img-h' : 'img-v';
            
            if (item.image && item.image.trim() !== '') {
                // 有圖片網址 -> 顯示圖片
                imgHtml = `<div class="${imgContainerClass}"><img src="${item.image}" alt="${item.name}"></div>`;
            } else {
                // 無圖片網址 -> 顯示預設色塊 + Icon (不刪除區塊)
                imgHtml = `<div class="${imgContainerClass}"><span class="material-symbols-outlined">image</span></div>`;
            }
        }

        // 3. 處理 Tags (實心/空心)
        // 假設從後台 Config 抓到的實心關鍵字
        const solidKeywords = ['新品', '熱門', '限量', '服務', 'HOT'];
        const tagHtml = item.tags ? item.tags.split(',').map(tag => {
            const isSolid = solidKeywords.includes(tag.trim());
            return `<span class="tag ${isSolid ? 'tag-solid' : 'tag-hollow'}">${tag}</span>`;
        }).join('') : '';

        // 4. 處理價格顯示 (0元顯示 FREE)
        const priceDisplay = item.price === 0 ? 'FREE' : `$ ${item.price}`;
        
        // 5. 處理按鈕 (服務類顯示箭頭，商品顯示購物車)
        const actionIcon = isCompact ? 'arrow_forward' : 'add_shopping_cart';

        // 6. 組合 HTML
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
        container.innerHTML += html;
    });
}

// 簡單的購物車開關與提示
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

function addToCart(name) {
    const container = document.getElementById('cart-items-container');
    // 簡單加入 UI 示範
    const itemHtml = `<div style="padding:10px; border-bottom:1px solid #ddd; font-size:0.9rem;">${name}</div>`;
    
    // 如果是第一次加，清空"購物車是空的"文字
    if(container.innerText.includes('空的')) container.innerHTML = '';
    
    container.innerHTML += itemHtml;
    toggleCart(); // 打開購物車讓使用者看到
}
