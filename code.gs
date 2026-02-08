function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 抓取 Products 分頁
  var productSheet = ss.getSheetByName("Products");
  var productData = productSheet.getDataRange().getValues();
  productData.shift(); // 移除標題列
  
  var products = productData.map(function(row) {
    return {
      id: row[0],
      name: row[1],
      price: row[2],
      stock: row[3],
      category: row[4],
      isFeatured: row[5],
      tags: row[6],
      status: row[7],
      
      // --- 修改重點開始 ---
      // 根據你的 JSON 狀況，原本 row[8] 是網址，row[9] 是樣式
      // 所以我們交換變數名稱，讓資料對應正確
      layout: row[9],       // 改這裡：讓 layout 讀取 row[9] (vertical/horizontal/no_image)
      images: row[8],       // 改這裡：讓 images 讀取 row[8] (圖片網址)
      // --- 修改重點結束 ---
      
      desc: row[10]
    };
  });

  // 2. 抓取 Config 分頁
  var configSheet = ss.getSheetByName("Config");
  var configData = configSheet.getDataRange().getValues();
  configData.shift(); // 移除標題列
  
  var config = {};
  configData.forEach(function(row) {
    var key = row[0];
    var value = row[1];
    if (key) {
      config[key] = value;
    }
  });


  // 2.5 抓取 Pages 分頁 (新增部分)
  var pagesSheet = ss.getSheetByName("pages");
  var pages = [];
  if (pagesSheet) {
    var pagesData = pagesSheet.getDataRange().getValues();
    pagesData.shift(); // 移除標題列
    pages = pagesData.map(function(row) {
      return {
        slug: row[0],
        title: row[1],
        content: row[2]
      };
    });
  }

  // 3. 打包回傳 (修改部分)
  var result = {
    products: products,
    config: config,
    pages: pages // 新增這行
  };


  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // 1. Lock to prevent concurrent editing issues
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    // 2. Parse JSON data from the request body
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Products");
    if (!sheet) {
      // Fallback: 如果找不到 "商品資料"，抓第一個分頁
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    }
    
    var rows = sheet.getDataRange().getValues();
    
    // Headers (assumed order): ID, Name, Price, Category, Tags, Status, Desc
    // Adjust column indices based on your actual sheet structure if needed.
    // Here we assume:
    // Col 0: ID
    // Col 1: Name
    // Col 2: Price
    // Col 3: Category
    // Col 4: Tags (comma separated or JSON string)
    // Col 5: Status
    // Col 6: Desc
    // Col 7: UpdatedAt (auto-added)

    var id = data.id;
    var rowIndex = -1;

    // 3. Search for existing ID
    // Start from 1 to skip header row
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == id) {
        rowIndex = i + 1; // 1-based index for getRange
        break;
      }
    }

    var timestamp = new Date();

    // 4. Update or Append
    // New Schema:
    // 0: ID
    // 1: Name
    // 2: Price
    // 3: Stock (New)
    // 4: Category
    // 5: isFeatured (New)
    // 6: Tags
    // 7: Status
    // 8: Images (New: comma separated)
    // 9: Layout (New)
    // 10: Desc
    // 11: UpdatedAt (Auto)

    var rowData = [
      id,
      data.name,
      data.price,
      data.stock || 0,
      data.category,
      data.isFeatured || false,
      data.tags,
      data.status,
      data.images, // Expecting comma-separated string
      data.layout || 'vertical',
      data.desc,
      timestamp
    ];

    if (rowIndex > 0) {
      // Update existing row (Cols 1 to 12)
      // Note: getRange(row, column, numRows, numColumns)
      // We overwrite the whole row for simplicity and consistency
      sheet.getRange(rowIndex, 1, 1, 12).setValues([rowData]);
      
      return ContentService.createTextOutput(JSON.stringify({
        "status": "success", 
        "message": "Product updated", 
        "id": id
      })).setMimeType(ContentService.MimeType.JSON);

    } else {
      // Append new row
      sheet.appendRow(rowData);
      
      return ContentService.createTextOutput(JSON.stringify({
        "status": "success", 
        "message": "Product created", 
        "id": id
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error", 
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    lock.releaseLock();
  }
}

function setup() {
  // Optional: run this once to create headers if sheet is empty
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID", "Name", "Price", "Category", "Tags", "Status", "Desc", "UpdatedAt"]);
  }
}