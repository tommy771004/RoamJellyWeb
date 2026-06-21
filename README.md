# RoamJelly 果凍漫遊

AI 旅遊行程規劃、多人即時共編、機票搜尋比價導流，以及旅途工具包（行李清單／分帳／天氣提醒）的全端 Web App（PWA）。

- 前端: React 19 + Vite 6 + Zustand + Tailwind v4
- 後端: Express 4 + Socket.io 4（單一 `server.ts`）
- 資料: PostgreSQL + Drizzle ORM；Redis 可選快取（無則記憶體 fallback）

## 快速開始

```bash
npm install
cp .env.example .env        # 至少填 DATABASE_URL、JWT_SECRET
npm run db:migrate
npm run dev
```

## 常用指令

| 指令 | 說明 |
|---|---|
| `npm run dev` | 啟動 API + Socket.io + Vite（單一進程） |
| `npm run build` | 建置前端 + 打包 server → `dist/server.cjs` |
| `npm run lint` | TypeScript 型別檢查（`tsc --noEmit`） |
| `npm test` | 跑全部單元測試（node test runner via tsx） |
| `npm run db:migrate` / `db:generate` | Drizzle migration |

## 文件

- 架構與工作流（zh-TW，權威來源）: [docs/CLAUDE.md](docs/CLAUDE.md)
- 部署、環境變數、整合說明: [docs/README.md](docs/README.md)
- 給 AI agent 的精簡指引: [CLAUDE.md](CLAUDE.md)
