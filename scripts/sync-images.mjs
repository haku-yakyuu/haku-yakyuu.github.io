import fs from 'fs';
import path from 'path';
import { fetchProducts } from '../src/utils/api.js';

const IMAGE_DIR = path.join(process.cwd(), 'public/products');

async function downloadImage(url, filename, force = false) {
  const filePath = path.join(IMAGE_DIR, filename);

  if (force && fs.existsSync(filePath)) {
    console.log(`! 偵測到更新訊號，正在移除舊圖: ${filename}`);
    fs.unlinkSync(filePath);
  }

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size > 0) {
      console.log(`- 跳過: ${filename} (已存在)`);
      return;
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    console.log(`+ 下載成功: ${filename}`);
  } catch (error) {
    console.error(`! 下載失敗 ${url}:`, error.message);
  }
}

async function sync() {
  console.log('開始檢查商品圖片更新狀態...');
  const { products } = await fetchProducts();

  for (const product of products) {
    const rawImages = product.layout_images || product.images || "";
    if (!rawImages) continue;

    const isRefreshSignaled = product.tags && (typeof product.tags === 'string' ? product.tags : product.tags.join(',')).includes('更新');
    const urls = (typeof rawImages === 'string' ? rawImages.split(",") : rawImages).map(u => u.trim()).filter(Boolean);

    console.log(`處理商品 ${product.id} (${urls.length} 張圖片)`);

    for (let i = 0; i < urls.length; i++) {
      const imgUrl = urls[i];
      // 如果不是以 http 開頭，代表已經是 repo 內的檔名，無需下載
      if (!imgUrl.startsWith('http')) {
        console.log(`- 跳過非 URL 資源: ${imgUrl}`);
        continue;
      }

      const filename = imgUrl.split('/').pop().split('?')[0] || `${product.id}-${i}.jpg`;
      const finalFilename = filename.toLowerCase().endsWith('.webp') ? filename : `${product.id}-${i}.jpg`;

      await downloadImage(imgUrl, finalFilename, isRefreshSignaled);
    }
  }
  console.log('圖片同步完成！');
}

sync();
