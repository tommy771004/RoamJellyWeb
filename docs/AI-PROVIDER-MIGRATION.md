# AI 行程產生器遷移與上線手冊

更新日期: 2026-08-13

## 目標架構

新的 AI 行程產生流程改為非同步工作，不再讓瀏覽器持有 Provider 金鑰。

1. 前端呼叫 `POST /api/ai/jobs/itinerary` 建立工作。
2. Express 驗證 JWT、旅程權限與輸入，將工作寫入 `ai_generation_jobs`。
3. 後端用 GitHub `repository_dispatch` 啟動 `.github/workflows/ai-itinerary-worker.yml`。
4. Worker 先嘗試 ChatGPT Web session，失敗時依設定改用 OpenRouter。
5. Worker 在同一個資料庫 transaction 內更新行程及工作狀態。
6. 前端輪詢 `GET /api/ai/jobs/:jobId`，完成後重新讀取行程。

既有同步 AI 流程仍保留作為功能旗標關閉時的回滾路徑，也可由使用者在非同步工作失敗後明確選用。

## 必要設定

### Vercel 或 Express 執行環境

- `DATABASE_URL`: PostgreSQL 連線字串。
- `JWT_SECRET`: 正式環境 JWT secret。
- `AUTH_REQUIRED=true`: 正式環境必須驗證使用者。
- `GITHUB_DISPATCH_TOKEN`: 限定到目標 repository，並授予 Contents repository permission: write 的 fine-grained token。這是 GitHub 建立 repository dispatch event 所需權限，不要再增加其他 repository 權限。
- `GITHUB_AI_WORKER_REPO`: `owner/repository` 格式，例如 `tommy771004/RoamJellyWeb`。
- `GITHUB_AI_WORKER_EVENT=ai-itinerary`。
- `VITE_AI_ASYNC_JOB_ENABLED=false`: 初次部署保持關閉，完成 smoke test 後才設為 `true` 並重新建置前端。

所有 GitHub 與 AI Provider secret 都是後端值，不可加上 `VITE_` 前綴。

### GitHub Actions secrets

- `DATABASE_URL`: 與正式應用共用的 PostgreSQL。
- `CHATGPT_STORAGE_STATE_B64`: Playwright storage state JSON 的 base64。可以暫時不設，此時 primary provider 會明確失敗並進入允許的 fallback。
- `OPENROUTER_API_KEY`: OpenRouter fallback 使用。
- `ALLOW_PAID_FALLBACK=true`: 僅在成本與額度監控已就緒後開啟。
- `AI_CHATGPT_RESPONSE_TIMEOUT_MS`: 可選，預設由 worker 使用安全上限。

建立 ChatGPT storage state:

```bash
npx tsx scripts/create-chatgpt-storage-state.ts
base64 < .worker-secrets/chatgpt-storage-state.json | tr -d '\n'
```

storage state 內含登入憑證。不得提交 Git、寫入應用 log，或放進前端環境變數。

## 發布順序

1. 備份正式資料庫並確認可回復時間點。
2. 在正式資料庫執行 `npm run db:migrate`。
3. 部署後端與 GitHub Actions workflow，但保持 `VITE_AI_ASYNC_JOB_ENABLED=false`。
4. 驗證未登入請求得到 401，無旅程權限得到 403，錯誤 UUID 得到 400。
5. 以測試旅程建立工作，確認同一旅程只會存在一個 queued 或 running 的 itinerary 工作。
6. 在 GitHub Actions 確認 worker 完成，且 job 狀態、provider、fallback reason 與行程資料正確。
7. 驗證 worker 重送相同 job id 不會重複覆寫已完成工作。
8. 將 `VITE_AI_ASYNC_JOB_ENABLED=true` 後重新部署前端。
9. 以桌機與手機實際操作建立、輪詢、完成、失敗後 fallback，以及重整頁面。

新的建立請求會把超過 30 分鐘仍為 queued 或 running 的同旅程工作標記為 failed，避免 runner 被終止後永久阻擋後續規劃。正式監控仍應在 20 分鐘的 workflow timeout 前先告警。

## 發布前指令

```bash
npm run lint
npm test
npm run build
npm audit --omit=dev
git diff --check
```

## 回滾

最快的應用層回滾是將 `VITE_AI_ASYNC_JOB_ENABLED=false` 並重新部署前端。既有同步流程會恢復，新的 job routes 與資料表可以先保留，避免破壞仍在執行或待查詢的工作。

若 worker 需要緊急停止，可停用 `AI Itinerary Worker` workflow 或移除 dispatch token。不要直接刪除 queued/running 工作。先將受影響工作標記為 failed，保留 `error_message` 供客服與排查使用。

資料庫 migration 不應在事件期間立即向下回滾。先關閉功能旗標並停止 dispatch，確認沒有 active job 後，再依備份與變更管理程序處理資料表。

## 監控與告警

至少追蹤以下指標:

- queued 到 running 的等待時間。
- running 到 completed 或 failed 的耗時。
- ChatGPT primary 成功率。
- OpenRouter fallback 比率、原因與成本。
- dispatch 失敗率與 GitHub Actions timeout。
- 每個旅程的 active job 數量，正常上限為一。

log 可以包含 job id、trip id、狀態、provider、耗時與錯誤分類。不得包含 JWT、GitHub token、OpenRouter key、ChatGPT storage state 或完整 Provider 回應。
