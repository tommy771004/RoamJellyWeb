# Dialog 與 Sheet 規格

Dialog／Sheet 用於會暫時中斷背景任務、需要專注完成的流程：選擇地點或日期、建立／邀請旅程、快速分帳、圖片預覽、帳號設定。

## 選擇模式

- 行動裝置優先使用 bottom Sheet；桌面可使用置中 Dialog。
- 輕量補充資訊可使用 Popover，但不承擔多步驟輸入或長清單選擇。
- 不用純視覺 overlay 取代 Dialog 語意；背景點擊關閉只能是補充，不是唯一離開方式。

## 必要行為

- 容器使用 `role="dialog"`、`aria-modal="true"` 與可見標題的 `aria-labelledby`。
- 開啟後將焦點移至標題或第一個可操作元素；Tab 焦點維持在浮層內。
- Escape 與清楚命名的關閉按鈕皆可關閉；關閉後焦點回到原 trigger。
- 有未提交變更時，需保存 draft、詢問確認或明確告知離開後果。
- 背景不可被鍵盤或指標操作；內容高度可滾動，主要提交按鈕要避開 safe-area。

## 視覺與動效

- 保留 RoamJelly 的柔和表面，但表單與關閉控制要與背景清楚區隔。
- Dialog 不使用過度縮放、彈跳或長 spring；reduced motion 下只保留必要淡入或直接呈現。
- 320px、虛擬鍵盤與 200% zoom 下，標題、錯誤、關閉與提交都不能被裁切。

## 驗收

以 LocationPicker、DatePicker、QuickExpense、ManualAddNode、圖片預覽與登入／帳號流程實測語意、焦點、Escape、返回焦點、表單錯誤與 loading。
