# Accordion 摺疊面板規格

Accordion 管理兩個以上平行、可比較的補充內容區。RoamJelly 不以 Accordion 壓縮主要行程；日期、時間、景點、協作衝突、未儲存變更與費用不可預設藏起來。

## 適用與不適用

適用：旅前準備的分類清單、目的地指南的平行主題、同層級費用說明、各日的補充統計。

不適用：單一景點備註（Disclosure）、地點／日期選擇（Dialog／Sheet）、清單／日曆／地圖（Tabs）、選擇旅伴（Toggle button）、重要同步錯誤（常駐 Notice）。

## 行為

- 預設 `multiple`，方便比較；只有內容互斥或畫面極有限時用 `single`。
- Header 是原生 button，使用具體標題與可理解摘要；panel ID 來自穩定資料 key。
- `aria-expanded` 與 `aria-controls` 必須跟真實可見狀態同步；收合 panel 使用 `hidden` 或條件渲染。
- 開啟／收合後焦點留在 header；收合包含焦點的 panel 前先回到 header。
- 不把每個項目做成高對比玻璃卡；可以沿用產品圓角與色彩，但避免讓裝飾掩蓋分組關係。

## 實作契約

```ts
type AccordionMode = "multiple" | "single";
interface AccordionItem { id: string; title: React.ReactNode; summary?: React.ReactNode; content: React.ReactNode; disabled?: boolean; }
```

共用元件只管理語意與展開狀態；不耦合 API、行程資料或特定視覺套件。

## 驗收

檢查 collapsed／expanded／loading／error、鍵盤、螢幕閱讀器、320px、200% zoom、reduced motion 與長翻譯。若目前沒有兩個以上平行 panel 的需求，不建立通用元件。
