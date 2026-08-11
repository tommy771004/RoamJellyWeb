# Input Field 輸入欄位規格

RoamJelly 的輸入控制協助使用者描述旅程、編排行程與記錄支出。自由文字只用於確實需要輸入的資料；已知目的地、日期、旅伴與選項應提供可理解的選擇流程。

## 控制選擇

| 資料或任務 | 正確控制 | 產品情境 |
| --- | --- | --- |
| 出發地／目的地／機場 | Button 開啟 Dialog／Sheet | 機票搜尋、建立行程 |
| 旅遊偏好與同行者 | 選取控制 | AI 行程表單 |
| 日期與時間 | 原生控制或可存取 picker | 行程節點、出發與回程 |
| 景點、備註、聊天 | Input／Textarea | 手動新增、AI 追問、備註 |
| 金額 | decimal input + 明確幣別 | 快速分帳 |
| 代墊人 | Select | 分帳表單 |

## 必要規則

- Form input 要有可見 label；元件負責建立 `label`、input、description 與 error 的 ID 關聯。
- Placeholder 只作短提示，不能取代 label、格式與錯誤說明。
- 錯誤要保留使用者的值，說明問題與修正方式，並設定 `aria-invalid`、`aria-describedby`。
- 金額編輯時允許空字串；使用 `inputMode="decimal"`，提交才驗證為正數。
- 文字搜尋與真正 Combobox 要分開：只篩選清單時維持 input + button list；輸入欄負責選取時才使用 combobox ARIA 模式。
- 提交前檢查 `event.nativeEvent.isComposing`，避免 CJK 組字時過早送出；非同步結果不得覆蓋較新的 query。

## 外觀與尺寸

- `form`、`inline`、`search` 三種 appearance 不共用同一個厚重玻璃框。
- 表單控制視覺高度 36–40px、觸控目標至少 44px；行動版文字至少 16px。
- 使用清楚的 focus ring，不使用 glow 或 hover 位移作為唯一回饋；長內容可換行，不能被固定高度裁切。
- Read-only 可讀、可選取、可複製；Disabled 則不可操作，兩者不可混淆。

## 共用契約

```ts
type InputAppearance = "form" | "inline" | "search";
type InputSize = "compact" | "default";

interface InputFieldProps extends Omit<React.ComponentPropsWithoutRef<"input">, "size"> {
  label: string;
  appearance?: InputAppearance;
  size?: InputSize;
  description?: string;
  error?: string;
}
```

地點 picker、日期 picker、金額欄位與行程內編輯在上層封裝資料與鍵盤邏輯；共用 Input 不承擔它們的流程。

## 驗收

覆蓋 AI 表單、機票搜尋、手動新增景點、快速分帳與旅程設定的 empty／filled／invalid／readonly／loading 狀態；驗證 IME、320px、200% zoom、Autofill 與錯誤復原。
