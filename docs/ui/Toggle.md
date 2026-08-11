# Disclosure（Toggle Block）摺疊區塊規格

本文件的 Toggle 是單一 Disclosure：一個原生 button 控制一個位於文件流中的補充內容區。它不是 on/off Switch，也不是 `aria-pressed` 的選取按鈕。

## 適用情境

- 展開 AI 建議的完整說明、景點長備註或圖片來源資訊。
- 收納已存在於摘要中的次要細節，例如交通備註、行前提醒與歷史紀錄。

不適用於：切換清單／日曆／地圖、選擇旅伴、開啟地點選擇器、提交表單、同步／衝突錯誤或當日必要行程資訊。

## 內容規則

- 收合摘要仍要顯示景點名稱、時間、位置、費用或同步衝突等決策資訊。
- Header 使用具體文案，如「查看 AI 建議」或「展開 3 則備註」；不用「更多」。
- 收合只改變呈現，不重新取得資料、不重排項目、不丟失編輯中的內容。
- Error、Loading、Empty 狀態在 panel 中清楚呈現；必要警示留在 header 外。

## ARIA 與互動

```tsx
<button
  id={`note-${noteId}-trigger`}
  type="button"
  aria-expanded={isOpen}
  aria-controls={`note-${noteId}-panel`}
>
  查看 AI 建議
</button>
<div id={`note-${noteId}-panel`} aria-labelledby={`note-${noteId}-trigger`} hidden={!isOpen}>
  {children}
</div>
```

- 不使用 `div onClick` 或不可聚焦的 `span` 作為 trigger。
- Enter／Space 切換；收合前若焦點在 panel 中，先把焦點移回 trigger。
- Chevron 僅是裝飾，設為 `aria-hidden`；開合動畫最多 160ms，reduced motion 下取消。
- 不用 `opacity: 0` 或不穩定的 height 動畫隱藏可互動內容。

## 驗收

驗證長備註、AI 建議、空內容、錯誤、鍵盤焦點回復、320px、200% zoom 與長翻譯；現有 `CollapsibleNotes` 與 `CollapsibleAiNote` 需優先遷移。
