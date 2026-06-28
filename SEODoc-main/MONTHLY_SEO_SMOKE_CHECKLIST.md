# 每月 SEO Smoke Checklist

建議頻率：每月一次，並在正式部署後重新執行 live verification。

## 1. 本機驗證

依序執行：

```bash
npm run seo:check
npm run test:seo-content
npm run test:seo-routes
npm run test:seo-docs
npm run lint
npm run build
```

通過標準：

- source HTML、robots.txt、sitemap.xml、llms.txt 基準檔檢查通過。
- build 後內容頁包含 canonical、BreadcrumbList、Article / ItemList schema。
- 六都行政區索引頁保留在地判讀文字。
- SEO 文件索引標記 `SEO3.md` / `SEO4.md` 完全重複與 SHA256 狀態。
- TypeScript typecheck 與 production build 成功。

## 2. 部署後驗證

部署完成後執行：

```bash
npm run seo:verify-live
```

人工檢查：

- 開啟首頁、`/prices/`、`/guides/`、`/methodology/`、一個六都行政區索引頁。
- 檢查瀏覽器顯示的 canonical URL 是否為正式網域且沒有 query string 舊路由。
- 檢查 `https://tw-real-estate-price-explorer-googl.vercel.app/sitemap.xml` 可讀，且包含內容頁與查詢頁。
- 檢查 `https://tw-real-estate-price-explorer-googl.vercel.app/llms.txt` 可讀，並連到 sitemap。

## 3. Search Console 月檢

每月在 Google Search Console 檢查：

- Sitemap 是否成功讀取，最後讀取時間是否合理。
- 索引涵蓋範圍是否突然大量下降。
- Page indexing 中是否出現 canonical、redirect 或 blocked by robots.txt 異常。
- Enhancements / structured data 是否有新增錯誤。
- 查詢成效是否有非品牌長尾詞進入前 20 名，尤其是實價登錄、預售屋、租賃、行政區相關查詢。

## 4. 內容品質月檢

- 檢查金融、補貼、租屋權益頁的查核日期是否超過 12 個月。
- 檢查官方來源連結是否仍可開啟。
- 新增頁面時同步更新 `SEO_CONTENT_PAGES`、`NAV_GROUPS`、sitemap build 測試與本 checklist。
- 若新增 AI 輔助內容，確認有人工審核、官方來源、限制說明與非個別建議聲明。

