import { atom, map } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

// UI 狀態：控制側邊欄開關 (false 代表預設關閉)
export const isCartOpen = atom(false);
export const isMenuOpen = atom(false);

// 購物車資料：儲存在 localStorage 中 (key: 'haku-cart')
// 這樣就算重新整理網頁，購物車的東西也不會不見
export const cartItems = persistentAtom('haku-cart', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// --- 購物車操作邏輯 ---

// 1. 加入購物車
export function addToCart(product) {
  const currentItems = cartItems.get();
  const existingItem = currentItems.find((item) => item.id === product.id);

  if (existingItem) {
    // 如果已存在，數量 +1
    cartItems.set(
      currentItems.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  } else {
    // 如果是新商品，推入陣列
    // 處理圖片邏輯：若沒圖片或圖片格式不對，給定 'no_image' 標記
    let displayImage = 'no_image';
    if (product.layout && product.layout !== 'no_image' && product.layout !== 'vertical' && product.layout !== 'horizontal') {
       // 假設 layout 欄位是網址 (如果你的資料結構 images 才是網址，請依實際情況調整)
       // 根據我們之前的對話，你的 layout 欄位存的是圖片 URL
       const imgs = product.layout.split(',');
       if(imgs.length > 0 && imgs[0].trim() !== '') displayImage = imgs[0].trim();
    } else if (product.layout && (product.layout.startsWith('http') || product.layout.startsWith('/'))) {
       // 雙重確認 layout 是連結
        const imgs = product.layout.split(',');
        if(imgs.length > 0) displayImage = imgs[0].trim();
    }

    cartItems.set([...currentItems, { 
        id: product.id, 
        name: product.name, 
        price: product.price, 
        image: displayImage, 
        quantity: 1 
    }]);
  }
  // 加入後自動打開購物車側邊欄
  isCartOpen.set(true);
}

// 2. 移除商品
export function removeFromCart(id) {
  cartItems.set(cartItems.get().filter((item) => item.id !== id));
}

// 3. 更新數量 (增加 inc / 減少 dec)
export function updateQuantity(id, type) {
  const currentItems = cartItems.get();
  cartItems.set(
    currentItems.map((item) => {
      if (item.id === id) {
        const newQty = type === 'inc' ? item.quantity + 1 : item.quantity - 1;
        // 數量最少為 1，如果要刪除請按移除按鈕
        return { ...item, quantity: Math.max(1, newQty) }; 
      }
      return item;
    })
  );
}
