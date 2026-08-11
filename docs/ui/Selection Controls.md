# Selection Controls 選取控制規格

RoamJelly 有大量偏好、旅伴、篩選與檢視選擇。它們必須清楚區分「切換狀態」、「多選條件」與「在同一內容區切換檢視」，不能全部做成視覺相似的圓角膠囊。

## 控制選擇

| 任務 | 控制 | 範例 |
| --- | --- | --- |
| 多個可獨立選項 | Toggle button 或 Checkbox | AI 偏好、參與分攤的旅伴 |
| 只有一個選項可成立 | Radio group 或 Select | 代墊人、旅遊節奏 |
| 切換同一資料的呈現 | Tabs／Segmented control | 清單、日曆、地圖 |
| 啟用／停用持續設定 | Switch | 通知、偏好設定 |

## 行為與語意

- Toggle button 使用 `aria-pressed`，視覺、鍵盤與讀屏狀態必須同步。
- Checkbox／Radio 有可見群組 label；不要只依賴圖示、色彩或 Checkmark 表示選取。
- Tabs 以 `tablist`、`tab`、`tabpanel` 管理，Arrow key 行為需全組一致；不要以一般 button + `aria-current` 取代內容視圖切換。
- 每個觸控目標至少 44px；長旅伴名稱與多語文案能換行而不覆蓋相鄰項目。
- 選取回饋不位移、不跳動；reduced motion 下取消非必要動畫。

## 實作方向

既有 `MultiSelectPill` 與分帳旅伴按鈕先補上 `type="button"`、`aria-pressed`、群組 label 與安靜的 selected state。外觀可維持圓潤，但不能用厚陰影、上下位移或色彩當作唯一狀態訊號。

## 驗收

檢查 AI 偏好、分帳旅伴、代墊人、工具篩選與清單／日曆／地圖切換的 mouse、touch、keyboard、讀屏、長翻譯與強制色彩模式。
