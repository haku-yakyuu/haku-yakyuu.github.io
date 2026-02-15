import { db } from './firebase.js';
import { collection, getDocs } from 'firebase/firestore';

// 預設備用資料 (當 API 連不上時顯示)
const defaultData = {
  config: {
    site_name: "HAKU",
    announcement: "網站資料連線中...",
    hero_title: "HAKU",
    hero_subtitle: "職人眼光的棒球選品",
    hero_image: "https://images.unsplash.com/photo-1587280501635-68a6e82cd7fd?q=80&w=2070&auto=format&fit=crop"
  },
  products: [],
  pages: []
};

export default {
  async fetchData() {
    try {
      // Fetch Config
      const configCol = collection(db, 'settings');
      const configSnapshot = await getDocs(configCol);
      const configData = {};
      configSnapshot.forEach(doc => {
        configData[doc.id] = doc.data().Value || doc.data().value;
      });

      // Fetch Products
      const productsCol = collection(db, 'products');
      const productsSnapshot = await getDocs(productsCol);
      const products = productsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Fetch Pages
      const pagesCol = collection(db, 'pages');
      const pagesSnapshot = await getDocs(pagesCol);
      const pages = pagesSnapshot.docs.map(doc => ({
        ...doc.data(),
        slug: doc.id
      }));

      return {
        products: products.length > 0 ? products : defaultData.products,
        config: Object.keys(configData).length > 0 ? configData : defaultData.config,
        pages: pages.length > 0 ? pages : defaultData.pages
      };
    } catch (error) {
      console.warn("Firebase Fetch Failed, using default data:", error);
      return defaultData;
    }
  }
};
