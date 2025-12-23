// ⚠️ 請填入你的 GAS 發布網址
const API_URL = 'https://script.google.com/macros/s/AKfycbw7jGvpY2DU5dPdSdkXMcL4Mnf0jZIcKfMYEJOkIiDIm7qoMkGid-upq1AJ3mVRP9Il/exec';

export async function getHakuData() {
  try {
    const response = await fetch(API_URL);
    const rawData = await response.json();

    // 解析 Config
    const config = rawData.config || {};
    // 將 "新品,限量,HOT" 轉為陣列 ["新品", "限量", "HOT"] 方便比對
    const solidTagsList = config.solid_tags ? config.solid_tags.split(',').map(t => t.trim()) : [];

    // 解析 Products
    const products = (rawData.products || [])
      .filter(item => item.status === 'active') // 只顯示上架商品
      .map(item => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        stock: Number(item.stock),
        category: item.category,
        isFeatured: item.isFeatured === true || item.isFeatured === "TRUE",
        tags: item.tags ? item.tags.split(',').map(t => t.trim()) : [],
        layout: item.layout || 'vertical', // 預設直式
        images: item.images ? item.images.split(',').map(url => url.trim()) : [],
        desc: item.desc
      }));

    return { products, config, solidTagsList };
  } catch (error) {
    console.error("Fetch error:", error);
    return { products: [], config: {}, solidTagsList: [] };
  }
}
