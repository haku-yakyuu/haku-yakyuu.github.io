// 這是連接 Google 試算表的橋樑
// 請將下方的 URL 換成你自己的 Google Apps Script 部署網址
const API_URL = "https://script.google.com/macros/s/AKfycby_sC_.../exec"; 

// 預設備用資料 (當 API 連不上時顯示，避免網站掛掉)
const defaultData = {
  config: {
    site_name: "HAKU 1984",
    announcement: "網站資料連線中...",
    hero_title: "HAKU 1984",
    hero_subtitle: "職人眼光的棒球選品",
    hero_image: "https://images.unsplash.com/photo-1587280501635-68a6e82cd7fd?q=80&w=2070&auto=format&fit=crop"
  },
  products: []
};

export default {
  async fetchData() {
    try {
      // 嘗試連線到 Google 試算表
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      
      // 確保回傳的資料格式正確
      return {
        products: data.products || defaultData.products,
        config: data.config || defaultData.config
      };
    } catch (error) {
      console.warn("API Fetch Failed, using default data:", error);
      // 連線失敗時，回傳備用資料，讓網站至少能顯示外殼
      return defaultData;
    }
  }
};
