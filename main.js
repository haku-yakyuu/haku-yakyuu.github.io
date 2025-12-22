// 暫時的假資料，等您的 Google Sheet 準備好後，我們會替換這部分
const products = [
    {
        id: 'p01',
        name: '1984 復古紀念球',
        price: 2480,
        tags: '新品,限量',
        image: 'https://images.unsplash.com/photo-1510731039227-5d8c911cde28?auto=format&fit=crop&q=80&w=400',
        stock: 1,
        layout: 'vertical'
    },
    {
        id: 'p02',
        name: '日本職人球場代購服務',
        price: 500,
        tags: '服務,熱門',
        image: '',
        stock: 99,
        layout: 'no_image'
    },
    {
        id: 'p03',
        name: 'WBC 決賽紀念 (已售出範例)',
        price: 5200,
        tags: '絕版',
        image: 'https://images.unsplash.com/photo-1593766788306-28561086694e?auto=format&fit=crop&q=80&w=400',
        stock: 0,
        layout: 'vertical'
    }
];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    renderProducts(products);
});

// 渲染商品卡片
function renderProducts(data) {
    const container = document.getElementById('product-list');
    container.innerHTML = ''; // 清空 Loading

    data.forEach(item => {
        // 判斷 Layout 類別
        const isNoImage = item.layout === 'no_image';
        const cardClass = isNoImage ? 'haku-card no-image' : 'haku-card';
        const soldOutClass = item.stock <= 0 ? ' sold-out' : '';
        
        // 處理 Tags (將字串轉為 HTML)
        const tagHtml = item.tags.split(',').map(tag => {
            // 這裡簡單判定：如果是'新品'或'熱門'就用實心
            const isSolid = ['新品', '熱門', '限量', '服務'].includes(tag);
            return `<span class="tag ${isSolid ? 'tag-solid' : 'tag-hollow'}">${tag}</span>`;
        }).join('');

        // 處理圖片 (如果無圖模式則不顯示 img-v)
        const imgHtml = isNoImage ? '' : `
            <div class="img-v">
                <img src="${item.image}" alt="${item.name}">
            </div>
        `;

        // 處理購物車按鈕 (若是服務/無圖，改顯示箭頭)
        const actionIcon = isNoImage ? 'arrow_forward' : 'add_shopping_cart';

        // 組合 HTML
        const html = `
            <div class="${cardClass}${soldOutClass}">
                ${imgHtml}
                <div class="card-body">
                    <div class="tag-group">${tagHtml}</div>
                    <h3 class="p-name">${item.name}</h3>
                    <div class="p-price">$ ${item.price}</div>
                    <span class="material-symbols-outlined cart-icon" onclick="addToCart('${item.id}')">${actionIcon}</span>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// 購物車側邊欄開關
function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

// 模擬加入購物車
function addToCart(id) {
    alert('已將商品 ' + id + ' 加入購物車 (測試中)');
    // 未來這裡會寫入真正的購物車邏輯
}
