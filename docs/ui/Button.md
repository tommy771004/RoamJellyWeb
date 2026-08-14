# Button 按鈕規格

Button 執行動作；RoamJelly 的按鈕必須讓人立即知道會建立、儲存、分享、刪除還是切換什麼。視覺語言可保留圓潤與柔和色彩，但操作優先序不能靠光暈、跳動或陰影猜測。

## 使用邊界

| 使用者意圖 | 正確控制 | RoamJelly 範例 |
| --- | --- | --- |
| 執行一次性動作 | Button | 生成行程、儲存變更、確認記帳 |
| 前往另一頁或外部網站 | Link | 前往訂房／機票供應商、開啟分享頁 |
| 改變持續狀態 | Toggle button／Switch | 選擇旅伴、啟用提醒、收藏景點 |
| 切換同一內容的視圖 | Tabs／Segmented control | 清單、日曆、地圖 |
| 開啟工作流程 | Dialog／Sheet button | 新增景點、選擇地點、選擇日期 |

## 操作層級

| 層級 | 使用時機 | 視覺要求 |
| --- | --- | --- |
| `strong` | 當前任務唯一主要動作 | 高對比實色；不使用外擴 glow |
| `neutral` | 表單、卡片上的一般動作 | 清楚表面差，安靜的 hover |
| `quiet` | 關閉、編輯、分享、列內工具 | 透明或低強調表面；focus 時可辨識 |
| `danger` | 不可逆或高風險動作 | 精確說明對象與後果，必要時確認或復原 |

同一操作區只有一個 `strong`。例如 AI 表單是「生成行程」、當日清單是「新增景點」、分帳表單是「確認記帳」。

## 狀態與行為

- 使用原生 `<button>`，非表單提交一律預設 `type="button"`。
- `loading` 維持按鈕寬度、保留動作名稱、阻止重複送出，並以 `aria-busy` 或鄰近 live region 告知狀態。
- `disabled` 不只降低 opacity；原因無法從上下文得知時，要在附近可見說明。
- 只有持續狀態使用 `aria-pressed`，例如旅伴分攤與偏好選項；分享、儲存、重試不可誤用。
- icon-only button 必須有目前語系的 accessible name，觸控範圍至少 44px。
- focus-visible 完整包住目標；hover 不位移、不縮放，reduced motion 下停用非必要動效。
- **例外：pressed 允許縮放至 0.97。** 這一條與 [design-guidelines-apple-hig.md](../design-guidelines-apple-hig.md) §3.1「Interactive Press States: Scale shrinks to 0.97 dynamically on active press」直接衝突，決議以 HIG 為準——按壓縮放是原生觸感的一部分。實作統一走 `index.css` 的 `.ios-press`，不要在各元件的 `className` 內重寫按壓狀態。

## 共用契約

```ts
type ButtonEmphasis = "strong" | "neutral" | "quiet";
type ButtonIntent = "default" | "danger";
type ButtonSize = "compact" | "default" | "prominent";
```

- 將既有 `variant` 漸進映射到此契約；不要新增互相重疊的 `pill`、`glow`、`elevated` 布林值。
- `className` 僅用於排版與 composition，不重建狀態和變體。

## 驗收

驗證 AI loading／error、建立行程、景點刪除、分帳送出、離線重試、鍵盤操作與 BottomNav safe-area；同時檢查長翻譯與 320px。
