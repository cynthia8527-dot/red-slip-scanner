# 上線前複查（2026-10-13，本地限定）

## 候選版本完整性

沿用既有候選，沒有修改產品 index.html、README.md、原 15 項測試或 SECURITY-REVIEW.md。

- scanner main 本地與 GitHub 既有連線重新讀取皆為 54ee18da89454bd72a9f5e7a6f2f6c0ef09be926。
- 原 scanner-review.patch SHA-256：01ae8cf855aceeec14b9c02e0a593ac605d05759f7fae5a2d641caf345a3303d。
- 候選 index.html SHA-256：d4ff036142c81cb180f393c63aa7a634ec6173a0d4eda297074e1ebd752bc046。
- repo 無 .agents/skills 或 AGENTS.md；環境 /workspace/.agents 為空。沒有其他 repo 指引需讀。
- SCANNER_ARTIFACT_DIR=/workspace node --test tests/pdf-export.cjs：重新 15/15 passed。git diff --check 通過。

## 新增大批次驗證

命令：SCANNER_ARTIFACT_DIR=/workspace/scanner-preflight-results node tests/preflight.cjs。

測試使用既有 Chromium、Playwright、Poppler，透過僅綁定 127.0.0.1 的臨時本地 HTTP 伺服器，結束後關閉；沒有對外預覽、上傳、安裝或外部資料。100 張 1500×968 合成 JPEG 含確定種子的噪聲、文字與頁碼，沒有 JPEG 尾端填充；走相簿 onchange → processImage → 實際 PDF handler → 個別下載按鈕。

最終一次結果：原件 69,882,479 bytes；處理後影像 72,540,385 bytes；17 份 PDF，16 份各 6 頁，最後 4 頁；最大 4,355,733 bytes，全部 <=5,000,000。每頁嵌入 JPEG 的 SHA-256 與對應掃描結果一致；100 頁順序與檔名範圍完整，原始和處理後 Blob 雜湊均未改變。所有產物以 Poppler 獨立核實頁數。最終本桌面環境相簿準備與匯入合計約 8.9 秒，PDF 製作約 0.56 秒；不含真正手機檔案儲存時間。

結果：/workspace/scanner-preflight-results/preflight-results.json、batch-001.pdf 至 batch-017.pdf。未量測瀏覽器完整尖峰記憶體；影像資料總量並不等於 RAM。未補大批次 ZIP 壓力測試，逐份 PDF 是主要流程。

## 細字、細線、小數點驗證

合成頁包含 12／16／24 px 字體、0.5／1／2 px 曲線、半徑 0.8／1.2／1.6／2 px 點，文字包括 1.7、3.8、5.6、123.45、0.01、8.03。測原色與掃描增強，1500×968 像素未改變；PDF 嵌入的 JPEG bytes 與掃描結果精確相同，PDF 封裝未再降低畫質。獨立 pdftoppm 已解碼品質 PDF。

另用 Chrome JPEG .84 編碼產生壓縮下限對照，保持相同尺寸；這是編碼器下限品質對照，不是自然超大頁被生產 fitPdfPage 選到 .84 的重現。原 15 項測試已验证實際 handler 的 .92/.88/.84 嘗試順序及三次都超標時安全失敗。

SCANNER_ARTIFACT_DIR=/workspace/scanner-preflight-results python tests/quality-check.py：以 PNG 原圖對照指定 ROI。原色 JPEG 的 12px 字暗像素保留率 99.33%，0.5px 線 98.72%；.84 對照分別為 97.84% 與 95.99%。四個獨立點在原色、掃描與 .84 對照中均保留暗像素。已目視檢查 quality-comparison.png，這組樣本的文字、細線與點可辨認。

這些是合成像素差異指標，不是 OCR 正確率或所有手寫字的可讀性保證。淡筆、失焦、透視裁切、反光、低光、真實中文手寫及不同 PDF 閱讀器仍需實機測試。Pillow／NumPy 使用環境既有版本，沒有安裝。

## 正式部署與回復

GitHub repo metadata 表示 has_pages=true；最近的成功 run 是 https://github.com/cynthia8527-dot/red-slip-scanner/actions/runs/35499910503，name=pages build and deployment、event=dynamic、path=dynamic/pages/pages-build-deployment、head_branch=main、head_sha=上述基準，2026-09-20 成功。repo 沒有自訂 .github/workflows。證據支持目前使用 GitHub 內建 Pages 部署 main 的靜態專案。

Pages source 設定唯讀查詢回傳 Forbidden，沒有繞過；來源資料夾 root 或 docs、目前安全或預覽設定不能直接確認。公开入口之前回傳 403，沒有再次換路徑嘗試。API 上的成功部署紀錄不等於現在用瀏覽器已驗證正式網站。

正式部署前仍需核實 Settings → Pages 的 source/branch/folder，review 專屬 scanner 變更並授權 push/merge 與正式部署。來源分支的 push 可能直接觸發發布，因此不能把 push 當作單純備份。

回復方案：部署前記錄最後成功版本與專屬修正 commit。若發布後不合格，在 scanner 做該修正 commit 的 revert（或只還原對應 scanner 檔案的審查過 diff），保留其他後續工作，再透過相同 Pages 流程發布；核實 workflow 成功、入口載入回復版本並測舊下載。不要 reset/force-push，也不修改 viewer；本次沒有執行回復或正式寫入。

參考：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site。

## Android 候選驗收最小下一步

目前沒有已確認可用的私人 HTTPS 預覽；127.0.0.1 測試伺服器已關閉，不能讓 Android 從外部連入。本地候選資料夾 /workspace/scanner-android-candidate 僅有與已驗證版本相同的 index.html 及合成 synthetic-quality.jpg，沒有正式資料。

可先由主對話交付這兩個本地檔案，使用者在自己的電腦將它們放進獨立資料夾，以既有工具在可信任同一 Wi-Fi 開本地靜態 HTTP 伺服器（例如在該資料夾執行 python -m http.server 8080 --bind 0.0.0.0），Android Chrome 開 http://電腦區網IP:8080，從相簿加入合成樣本，再逐份存到 Downloads 並回聊天選 PDF 附件。只暴露這個合成候選資料夾，驗收完關閉伺服器；本次沒有開區網服務或把檔案傳到使用者裝置。

這個 HTTP 區網方法只驗相簿／匯出；Android 訪問電腦 IP 不是安全來源，不能拿來驗 getUserMedia 相機。也不能把 Android 直接開本機 HTML 是否可行當成已測。若要測真實相機或使用者沒有電腦，需另行授權在確認可用的私人 HTTPS 預覽服務託管候選；現在沒有此 URL，沒有新增憑證、部署或調整權限。

相機安全來源參考：https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia。

真機待驗：1／10／100 張時操作流暢與記憶體；取消／失敗後保留照片；每份 PDF 在 Android 的實際 bytes 與全部頁序；直接下載後可在聊天選為附件；PDF 閱讀器放大查看 3/8、5/6、1/7、細筆畫、小數點；另用合成紙張測相機對焦、裁切與低光。不得以真實帳務上傳聊天作測試。

## 邊界與批准

本次僅新增本地驗證程式、報告與合成產物；沒有 push、上傳、發布、調整权限或憑證、改原帳，未自行聯絡使用者。產品候選 code 和原 patch 保持不變。

待主對話決定：交付候選做 Android 驗收；如需私人 HTTPS 預覽，先確認服務與明確託管授權；正式發布另需 scanner 專屬 push/merge/部署批准。雲端登入及儲存仍只保留 SECURITY-REVIEW.md 的評估，不在這次實作。

## 發布前授權與來源補充

2026-10-13 已獲准將已驗證候選更新 scanner GitHub 與既有掃描網站。這取代前述當時「未批准發布」的任務邊界，但不包含新雲端上傳、設定／權限／憑證調整。

唯讀檢查既有成功 run 35499910503 的 build job 106049712095：checkout ref=main、source=.、destination=./_site、artifact path=./_site，確認既有流程取 main 根目錄。Pages 設定頁仍不可讀，沒有繞過；本次沿用既有來源。產品 index.html hash 不變，部署結果另以對應 commit 的 run 為準，不能把流程成功當成 Android 驗收。
