// src/store.js
import { atom, map } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

// UI 狀態：控制側邊欄開關
export const isCartOpen = atom(false);
export const isMenuOpen = atom(false);

// 購物車資料：儲存在 localStorage 中 (key: 'haku-cart')
export const cartItems = persistentAtom('haku-cart', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// --- 購物車操作邏輯 ---

// 加入購物車
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
    // 確保這裡處理了無圖片的邏輯
    let displayImage = 'no_image';
    if (product.layout && product.layout !== 'no_image') {
       const imgs = product.layout.split(',');
       if(imgs.length > 0 && imgs[0].trim() !== '') displayImage = imgs[0].trim();
    }

    cartItems.set([...currentItems, { 
        id: product.id, 
        name: product.name, 
        price: product.price, 
        image: displayImage, 
        quantity: 1 
    }]);
  }
  // 自動打開購物車
  isCartOpen.set(true);
}

// 移除商品
export function removeFromCart(id) {
  cartItems.set(cartItems.get().filter((item) => item.id !== id));
}

// 更新數量 (type: 'inc' | 'dec')
export function updateQuantity(id, type) {
  const currentItems = cartItems.get();
  cartItems.set(
    currentItems.map((item) => {
      if (item.id === id) {
        const newQty = type === 'inc' ? item.quantity + 1 : item.quantity - 1;
        return { ...item, quantity: Math.max(1, newQty) }; // 最小數量維持 1
      }
      return item;
    })
  );
}
