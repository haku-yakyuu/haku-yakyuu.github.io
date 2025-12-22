// src/utils/api.js

// ⚠️ 請在此填入你的 Google Apps Script 發布網址
const API_URL = 'https://script.google.com/macros/s/AKfycbw7jGvpY2DU5dPdSdkXMcL4Mnf0jZIcKfMYEJOkIiDIm7qoMkGid-upq1AJ3mVRP9Il/exec';

export async function getProducts() {
  try {
    const response = await fetch(API_URL);
    const rawData = await response.json();

    return rawData.map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price), // 轉數字
      stock: Number(item.stock),
      category: item.category,   // 分類
      // 確保轉為布林值 (處理 checkbox 或字串)
      isFeatured: item.isFeatured === true || item.isFeatured === "TRUE",
      // 標籤與圖片轉陣列
      tags: item.tags ? item.tags.split(',').map(t => t.trim()) : [],
      images: item.images ? item.images.split(',').map(url => url.trim()) : [],
      description: item.description,
      layout_type: item.layout_type // 用來判斷顯示預約還是購買
    }));
  } catch (error) {
    console.error("資料抓取失敗:", error);
    return [];
  }
}
