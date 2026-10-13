# Scanner 本地交接與雲端評估（2026-10-13，尚未發布）

## 核實與授權

透過既有 GitHub connector 成功讀取 cynthia8527-dot/red-slip-scanner，回傳其自身 pull/push 權限。獨立 clone 的 main/HEAD 是 54ee18da89454bd72a9f5e7a6f2f6c0ef09be926。沒有引用 viewer PR #3、修改 viewer、沿用舊候選、推送、發布或修改憑證／權限。

repo 原本只有 README.md 與 index.html；沒有 AGENTS.md、.agents/skills、GLOSSARY.md 或 ADR；環境 /workspace/.agents 為空。已讀工作手冊總索引及紅單辨識與登帳主題。未讀取或上傳真實帳務影像，未改寫原帳／原檔。

scanner 原碼沒有登入、OAuth client、上傳、雲端儲存或雲端下載授權。viewer 的登入不能作為 scanner 安全證據。公開入口 https://cynthia8527-dot.github.io/red-slip-scanner/ 在本環境 curl 回傳 HTTP 403，沒有繞過；無法核實實際部署是否與 main 相同。

## 修改與驗證

原 PDF handler 將全部頁面一次合併，沒有大小限制。原碼上的合成重現（兩張各 2.6 MB）失敗：沒有分檔。修正以實際 PDF bytes 作 5,000,000 上限、連續頁序分檔、有界單頁壓縮、匯出鎖及取消／失敗保留資料。多份 PDF 提供逐一下載按鈕（檔名、頁碼範圍、實際 bytes），不必解壓縮；ZIP 為可選下載且可超過 5 MB。

2026-10-13：SCANNER_ARTIFACT_DIR=/workspace node --test tests/pdf-export.cjs，15/15 passed；git diff --check 通過。Chromium 執行實際下載 handler；檢查邊界、頁序、各 JPEG bytes、取消／失敗／重複點擊／既有 JPG 下載，Poppler pdfinfo 解析與 pdftoppm 解碼通過。使用既有工具，沒有安裝依賴。

這不是手機／CI／線上測試。已補 390×844 手機尺寸下 Chromium 真實下載與存檔，以及相簿加入到 PDF 下載的完整流程；未測 Safari／Android 實機儲存或聊天附件介面。超大影像使用 JPEG 尾端填充，不能代表真實高熵影像的壓縮品質；手寫可讀性需在使用者装置確認。照片只在記憶體，關閉／重新整理仍會失去當批資料。原始輸入 Blob 留在頁面記憶體，壓縮不改原檔。

## 建議雲端方案（尚未實作）

scanner 專用登入 + 小型後端 + 私有 Google Drive，寫入前先核實目標資料夾的擁有者與繼承分享權限。

1. scanner 自己的 OAuth client、callback 與後端帳號／角色允許名單；驗證身分、state/CSRF、過期與撤銷。使用官方 GIS code model／authorization code + PKCE；client secret 和 refresh token 留在後端。
2. 優先評估最小 drive.file 範圍，限經選取或 app 建立的檔案；不能假設能存取整個公司 Drive。若不符合工作流程，再審必要權限。
3. 私有目標資料夾與檔案只限授權人員，核查 anyone/domain 及繼承權限。原件、處理後 JPEG、PDF 分開記錄，不覆寫。公開 Pages/repo 不存帳務檔案。
4. 上傳、列出與每次下載都由後端驗證該使用者對批次／檔案的權限；走授權 proxy 或 Drive 授權下載，不使用公開原始檔 URL。Pages 的兩個專案可能同 origin，OAuth origin 不會隔離路徑，不能共用 viewer 的 token 或只靠登入按鈕限制。
5. manifest 記錄批次 ID、原件 hash、PDF hash／bytes／頁碼範圍與總頁數；伺服器再驗證上限，冪等鍵與重試狀態避免重複。完整確認成功前保留本地檔與下載，不當作登帳完成。
6. 用合成資料測匿名、錯誤帳號、他人檔案 ID、過期／撤銷登入均不可上傳或下載，授權帳號可重試且不重複。未登入拿到直接 URL 也必須讀不到。

官方參考：
- https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/api/guides/manage-sharing

## 下一步與阻礙

先審查本地 patch；推送／發布需另行指示，本次不執行。再用手機合成樣本驗證逐份 PDF 存入檔案、回聊天選附件、各頁序及放大後小字／筆畫可讀；可選 ZIP 的儲存解壓亦待實機驗收；大型批次的記憶體成本未量測。

scanner OAuth client、登入允許名單、後端部署、Drive 目標 ACL、下載授權均尚未存在或未提供，需確認具體資源和授權後才能實作與安全驗證。ChatGPT 的 Drive 連線不等於 scanner 網站有 Drive 授權；本次未新建憑證或變更分享。

接續任務先重查 scanner main 是否仍是上述 SHA，確認 patch 可套用，再重跑測試。建議技能 diagnosing-bugs、tdd、handoff-cloud。此環境檔案存在不保證跨任務永久可讀，交接以本次對話及可下載 patch 為準。


## 補充驗收證據

合成 3 頁從個別下載按鈕實際存出的兩份 PDF：2,600,695 bytes（第 1 頁），2,701,154 bytes（第 2–3 頁）。各檔 <=5,000,000 bytes，Poppler 解析／解碼通過，逐頁 JPEG 與合成輸入 byte-for-byte 相同。ZIP 解出的各 PDF 與逐份下載檔相同。

新增驗證：每份入口實際大小及命名，ZIP 非自動且可選，上次完成批次在取消／失敗後仍可下載；原始 Blob 與處理後 Blob 在取消／失敗／重複製作後逐 byte 保留；過大頁嘗試品質順序精確為 .92/.88/.84、尺寸保持 600×400，三次仍超標時不建立新成功入口或部分下載。

本地證據（不保證跨環境保留）：/workspace/scanner-mobile-preview.png；/workspace/scanner-synthetic-results/manifest.json；synthetic-part-1.pdf 與 synthetic-part-2.pdf。沒有真實帳务影像。公開站 403 未再次繞過；雲端方案仍限評估，没有部署或新憑證。
