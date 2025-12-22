// ⚠️ 請填入你的 GAS 發布網址
const API_URL = 'https://script.google.com/macros/s/AKfycbw7jGvpY2DU5dPdSdkXMcL4Mnf0jZIcKfMYEJOkIiDIm7qoMkGid-upq1AJ3mVRP9Il/exec';

export async function getProducts() {
  try {
    const response = await fetch(API_URL);
    const rawData = await response.json();

    return rawData.map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      stock: Number(item.stock),
      category: item.category,
      // 確保將 TRUE/FALSE 字串或是 checkbox 轉換為布林值
      isFeatured: item.isFeatured === true || item.isFeatured === "TRUE",
      tags: item.tags ? item.tags.split(',').map(t => t.trim()) : [],
      images: item.images ? item.images.split(',').map(url => url.trim()) : [],
      description: item.description,
      layout_type: item.layout_type
    }));
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}
