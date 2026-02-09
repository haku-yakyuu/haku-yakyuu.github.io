---
description: 說明如何讓 Antigravity (AI 助手) 獲得完全代理權限
---

為了讓 Antigravity 能夠順利地為您管理專案、修復 Bug 並執行部署，請確保以下設置已完成：

### 1. GitHub 令牌 (Token) 權限
請檢查您的 GitHub Token 是否包含以下權限：
- `repo` (完全控制私有及公開倉庫)
- `workflow` (允許 AI 編輯或手動觸發 GitHub Actions 工作流)
- `write:packages` (如果有使用 GitHub Packages)
- `admin:repo_hook` (如果需要 AI 管理 Webhooks)

### 2. 倉庫設置 (Repository Settings)
請前往您的 GitHub 倉庫設置檢查：
- **Actions > General**:
  - `Workflow permissions` 設置為 **"Read and write permissions"**。
  - 勾選 **"Allow GitHub Actions to create and approve pull requests"**。
- **Pages**:
  - `Build and deployment > Source` 設置為 **"GitHub Actions"**。

### 3. 定義代理工作流 (.agent/workflows)
在專案根目錄建立 `.agent/workflows/` 資料夾，並撰寫 `.md` 檔案來定義 AI 的任務處理流程。
例如：
- `fix-issue.md`: 定義 AI 如何從 Issue 到 PR 的修復流程。
- `sync-data.md`: 定義如何手動觸發 Google Sheet 數據同步。

### 4. 定義行為準則 (.agent/rules)
在 `.agent/rules/` 中定義專案的編碼風格、提交規範 (Commit message style) 等，讓 AI 的改動符合您的習慣。

### 5. 環境變數 (Secrets)
如果專案需要額外的 API Key (例如 Cloudinary, GAS 等)，請確保：
- 這些 Key 已加入 GitHub Secrets (用於 Actions)。
- 或者告知我如何在本地環境調用它們。

---
**我現在已經可以：**
- [x] 讀取代碼與目錄結構
- [x] 讀取您的 GitHub 使用者資料 (`haku-yakyuu`)
- [ ] 提交代碼 (待測試)
- [ ] 觸發部署 (待測試，受限於 `gh` 指令是否安裝，或透過 Push 觸發)

**建議下一步：**
我可以先嘗試在本地建立 `.agent/workflows` 並提交到倉庫，這可以同時測試我的提交權限。請告訴我是否可以進行？
