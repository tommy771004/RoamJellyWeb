RoamJelly - 智能表單與動態介面生成提示詞庫

這份文件包含了一系列指令，請逐步發送給您的 AI 助手 (如 Cursor, Claude)，以建立從「選擇題表單」到「AI 生成過渡動畫」的完整流程。

階段一：建立漸進式選擇題表單 UI (Progressive Form)

💡 提示詞 1：實作 Step 1 (核心必填區)

「請在目前的專案中新增一個名為 <AiForm> 的 React 組件，負責處理 AI 智能表單的邏輯。
我們要實作兩步驟的漸進式表單。請先實作 Step 1 (核心必填)：

狀態管理：使用 useState 建立一個 formData 物件，包含 destination (字串)、days (數字，預設 5)、companions (字串，單選)。

目的地輸入：一個文字輸入框，加上地圖圖示。

天數選擇：使用 - 和 + 按鈕來增減天數的控制器，預設為 5 天。

旅伴單選卡片：定義一個常數陣列 COMPANION_OPTIONS（包含獨行俠、浪漫雙人、親子育兒、帶長輩、三五好友，並附帶對應 Emoji）。將這些選項渲染成網格排列的玻璃卡片。當被選中時，卡片要有明顯的邊框發光 (shadow-[0_0_15px_rgba(...)]) 與稍微放大的效果 (scale-[1.02])。

下一步按鈕：在底部放置一個『下一步，微調細節』按鈕。如果 destination 或 companions 是空的，這個按鈕必須處於 disabled 狀態（透明度降低，不可點擊）。

設計規範：嚴格遵守 RoamJelly 的液態玻璃 (Liquid Glass) 風格，大量使用 bg-white/40 backdrop-blur-xl border border-white/60。」

💡 提示詞 2：實作 Step 2 (多選細節與跳過機制)

「現在，請繼續實作 <AiForm> 的 Step 2 (靈魂細節選填)。這部分全為多選，且允許使用者跳過。

狀態擴充：在 formData 中新增三個陣列：vibes (旅遊節奏)、interests (興趣標籤)、dietary (飲食禁忌)。

多選藥丸 UI (Multi-Select Pills)：建立一個共用的 <MultiSelectPill> 子組件。這些選項要以藥丸 (Pill) 形狀並排顯示。未選中時為白色半透明背景；選中時背景變為粉紅色 (bg-pink-400 text-white) 並帶有發光陰影。

選項資料：請自行定義 VIBE_OPTIONS (如：特種兵、睡到自然醒...)、INTEREST_OPTIONS (如：大自然、歷史、網美打卡...)、DIETARY_OPTIONS (如：純素、無麩質、無限制...)。

導覽與提交：

頂部需有一個『返回 Step 1』的箭頭按鈕。

底部提供兩個並排按鈕：『太麻煩了，直接生成』(次要按鈕樣式) 與 『魔法生成』(主按鈕，帶有漸層與圖示)。點擊這兩個按鈕都會觸發同一個 handleSubmit 函式。

在 handleSubmit 中，先使用 console.log 印出完整的 formData JSON 物件，以確認資料結構正確。」

階段二：過渡動畫與 API 模擬 (Loading & Simulation)

💡 提示詞 3：實作 AI 生成時的過渡動畫 (Loading State)

「使用者填寫完表單點擊生成後，需要一個極具沉浸感的等待畫面。請擴充 <AiForm>：

新增一個狀態 isGenerating (布林值，預設 false)。

修改 handleSubmit：點擊後先將 isGenerating 設為 true，並使用 setTimeout 模擬 3 秒的 API 請求延遲，之後再把 isGenerating 設回 false。

Loading 畫面設計：當 isGenerating 為 true 時，隱藏表單內容，顯示以下畫面：

正中央有一個會旋轉 (animate-spin) 的 Loader 圖示 (可用 lucide-react)。

Loader 外圍包裹著一個圓形的玻璃卡片 (GlassCard !rounded-full)。

背景加上一個會呼吸閃爍 (animate-pulse) 的粉紅色/紫色光暈 (blur-xl)。

下方顯示漸層文字：『AI 正在為您客製專屬行程...』，以及動態文字『正在為您篩選 {formData.destination} 的完美景點』。

切換畫面時（Step 1 -> Step 2 -> Loading），請加上滑入或淡入淡出 (fade-in / slide-in) 的過渡動畫。」

階段三：串接動態渲染組件 (Connecting Data to UI)

(此提示詞假設您已經讓 AI 寫好了 DynamicItineraryView，現在要把表單和結果串起來)

💡 提示詞 4：將表單結果傳遞並動態切換介面

「我們現在有了 <AiForm> 和 <DynamicItineraryView>。請在最外層的 <App> 中實作這兩者的切換邏輯：

在 <App> 中新增狀態 appState (預設為 'form') 和 aiResult (儲存 AI 生成的 JSON 資料)。

在 <AiForm> 的 handleSubmit 模擬結束後（3秒後），不要只是 console.log，而是將我們之前預先準備好的 Mock JSON 資料寫入 aiResult，並將 appState 切換為 'result'。

根據 appState 的值，條件渲染 <AiForm> 或是 <DynamicItineraryView> (並把 aiResult 當作 Props 傳給它)。

關鍵 UI 聯動：在 <DynamicItineraryView> 中，請確保它會讀取 aiResult.ui_state.theme_gradient，並動態改變這整個畫面的背景漸層顏色（例如：如果 AI 判斷是長輩行程回傳了綠色漸層，畫面背景就要跟著變綠色）。」