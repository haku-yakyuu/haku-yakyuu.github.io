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

    const isRefreshSignaled = product.tags && product.tags.includes('更新');
    const urls = rawImages.split(',').map(u => u.trim()).filter(Boolean);
    
    if (isRefreshSignaled) {
      console.log(`>>> [更新訊號] 準備重新下載商品 ${product.id} 的所有圖片...`);
    } else {
      console.log(`處理商品 ${product.id} (${urls.length} 張圖片)`);
    }

    for (let i = 0; i < urls.length; i++) {
      const filename = `${product.id}-${i}.jpg`;
      await downloadImage(urls[i], filename, isRefreshSignaled);
    }
  }
  console.log('圖片同步完成！');
}

sync();
