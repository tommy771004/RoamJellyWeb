RoamJelly 分潤夥伴申請完整操作流程
申請完成後，將 ID 填入 
src/config/affiliateConfig.ts

🗂️ 快速索引
平台	分類	分潤模式	申請難度	審核時間
Trip.com
機票 + 住宿	CPS 3–5%	⭐ 簡單	1–3 天
Skyscanner
機票比價	CPC 點擊費	⭐⭐ 中等	1–2 週
Travelpayouts
聚合平台	CPS + CPC	⭐ 簡單	即時
Agoda
住宿	CPS 4–7%	⭐ 簡單	1–3 天
Booking.com
住宿	CPS 4–6%	⭐ 簡單	1–3 天
Klook
門票 + 接送	CPS 5–8%	⭐⭐ 中等	3–7 天
KKday
門票 + 接送	CPS 5–10%	⭐ 簡單	即時
GetYourGuide
體驗行程	CPS 8%	⭐⭐ 中等	3–5 天
Viator
體驗行程	CPS 8%	⭐⭐ 中等	3–5 天
1. Trip.com 攜程
涵蓋機票 + 飯店，單一帳號同時產生兩組連結

申請步驟
前往 https://us.trip.com/pages/affiliate-program
點擊右上角「Join Now」或「Sign Up」
填寫：
網站/App 名稱：RoamJelly
網站 URL：你的域名
流量類型：Travel Blog / Travel App
月流量預估：如實填寫（如 1,000–10,000）
等待審核 Email（通常 1–3 個工作天）
審核通過後登入後台 → Affiliate Center
取得 ID
登入後台後，前往「Promotion Tools」→「Link Generator」：

allianceid（Alliance ID）= 你的合作商帳號 ID，固定不變，在後台右上角可看到
sid（Sub ID）= 你自訂的子頻道標識，可任意設定（建議用 roamjelly）
填入 config
typescript

// src/config/affiliateConfig.ts
export const TRIP_COM_ALLIANCE_ID = '你的allianceid';  // e.g. '1234567'
export const TRIP_COM_SID = 'roamjelly';               // 自訂即可
驗證方式
點擊 HomeTab 的「找機票 → Trip.com」，確認跳轉 URL 包含：

?allianceid=你的ID&sid=roamjelly
2. Skyscanner
以 CPC（每次點擊計費） 為主，適合流量型網站

申請步驟
前往 https://www.partners.skyscanner.net/
點擊「Become a Partner」→「Affiliate」
填寫：
Company Name：你的公司或名稱
Website：你的域名
Content Type：Travel Guide / Comparison
Monthly Sessions：如實填寫
需要提交後等待人工審核（1–2 週）
取得 ID
審核通過後：

登入 Partner Portal
進入「Links & Tools」→「Deep Link Builder」
你的 Associate ID 顯示在個人資料頁
填入 config
typescript

export const SKYSCANNER_ASSOCIATE_ID = '你的associate_id';  // e.g. 'aff_tp_xyz123'
⚠️ 注意：Skyscanner 目前對台灣地區的新合作審核較嚴，建議同時申請 Travelpayouts 作為備案（Travelpayouts 內也有 Skyscanner 連結）

3. Travelpayouts
聚合平台，一個帳號包含 60+ 旅遊品牌（含 Skyscanner、Hotels.com 等）

申請步驟
前往 https://www.travelpayouts.com/programs
點擊「Join for Free」
填寫基本資料即可，審核幾乎即時
填寫付款方式（PayPal 或 Wire Transfer）
取得 ID
登入後台 → 右上角「My Account」
你的 Marker 就是你的推廣人 ID，顯示在個人資料頁
填入 config
typescript

export const TRAVELPAYOUTS_MARKER = '你的marker';  // e.g. '176215'
進階：建立 Skyscanner 連結
在 Travelpayouts 後台 → 「Programs」→ 搜尋「Skyscanner」→ 加入計劃 → 產生追蹤連結，格式如：

https://www.skyscanner.net/...?marker=你的marker
4. Agoda
亞洲住宿最強平台，台灣轉換率極高

申請步驟
前往 https://partners.agoda.com/en-us/
點擊「Join Now」→「Affiliate」
填寫：
Website URL：你的域名
Website Type：Travel Blog
Monthly Visitors：如實填寫
等待審核 Email（1–3 工作天）
取得 ID
審核通過後：

登入 Partner Hub
左側選單 → Tools → Link Builder
你的 CID（Channel ID）顯示在頁面右上方
填入 config
typescript

export const AGODA_CID = '你的CID';  // e.g. '1234567'
正確 URL 格式
https://www.agoda.com/zh-tw/?cid=你的CID
❌ 舊版格式（partnersearch.aspx?cid=）已棄用，需用新格式

5. Booking.com
全球住宿最大平台，歐美旅客首選

申請步驟
前往 https://www.booking.com/affiliate-program/
點擊「Join the Program」
填寫：
Website：你的域名
Content Language：繁體中文
Promotion Method：Content/Blog
等待審核（1–3 工作天）
取得 ID
登入 Affiliate Partner Center（**https://join.booking.com/**）
頂部導覽 → Account → My Account
你的 AID（Affiliate ID）顯示在資料欄
填入 config
typescript

export const BOOKING_COM_AID = '你的AID';  // e.g. '12345678'
正確 URL 格式
https://www.booking.com/?aid=你的AID
6. Klook 客路
亞洲門票 + 機場接送最強平台，台灣本地轉換率高

申請步驟
前往 https://affiliate.klook.com/
點擊「Apply Now」
填寫：
Website URL：你的域名
Social Media（可選填 Instagram/YouTube 等）
Monthly Unique Visitors：如實填寫
Traffic Source：SEO / Organic
等待審核（3–7 工作天，需有實際流量）
取得 ID
審核通過後：

登入 Klook Affiliate Portal
左側 → Account → Account Settings
你的 AID 顯示在個人資料頁
填入 config
typescript

export const KLOOK_AID = '你的AID';  // e.g. 'youraff123'
URL 格式
機場接送：

https://www.klook.com/zh-TW/activity/987-taoyuan-airport-transfers-taipei/?aid=你的AID
門票（首頁）：

https://www.klook.com/zh-TW/?aid=你的AID
7. KKday
台灣本土平台，在地深度行程最豐富，審核最友善

申請步驟
前往 https://www.kkday.com/zh-tw/page/affiliate
點擊「加入 KKday 夥伴計劃」
填寫：
推廣管道（網站/部落格/社群媒體）
目標受眾：台灣旅客
幾乎即時審核，台灣本土平台申請最輕鬆
取得 ID
登入後台
右上角 → 帳號設定
你的 CID（Content ID / Partner ID）顯示在資料欄
填入 config
typescript

export const KKDAY_CID = '你的CID';  // e.g. '4480'
URL 格式
https://www.kkday.com/zh-tw/?cid=你的CID
8. GetYourGuide
歐美景點體驗最大平台，適合目標歐洲旅客

申請步驟
前往 https://partner.getyourguide.com/
點擊「Apply to Partner Program」
填寫網站資訊與流量來源
等待審核（3–5 工作天）
取得 ID
審核通過後：

登入 Partner Center
左側 → Integration → Affiliate Links
你的 Partner ID 顯示在連結範例中
填入 config
typescript

export const GETYOURGUIDE_PARTNER_ID = '你的PARTNER_ID';  // e.g. 'ABCDE'
URL 格式
https://www.getyourguide.com/?partner_id=你的PARTNER_ID
9. Viator
TripAdvisor 旗下，全球景點最大資料庫

申請步驟
前往 https://www.viator.com/affiliate
點擊「Apply Now」
需要有 TripAdvisor 帳號或另行建立
等待審核（3–5 工作天）
取得 ID
審核通過後：

登入 Viator Partner Center
Account → Account Details
你的 PID（Partner ID）顯示在帳號資訊
填入 config
typescript

export const VIATOR_PID = '你的PID';  // e.g. 'P12345'
URL 格式
https://www.viator.com/?pid=你的PID
✅ 填完後的完整 Config 範例
typescript

// src/config/affiliateConfig.ts
export const TRIP_COM_ALLIANCE_ID = '1234567';
export const TRIP_COM_SID = 'roamjelly';
export const SKYSCANNER_ASSOCIATE_ID = 'aff_tp_abc123';
export const TRAVELPAYOUTS_MARKER = '176215';
export const AGODA_CID = '9876543';
export const BOOKING_COM_AID = '12345678';
export const KLOOK_AID = 'youraff456';
export const KKDAY_CID = '4480';
export const GETYOURGUIDE_PARTNER_ID = 'ABCDE';
export const VIATOR_PID = 'P12345';
🔍 驗證清單
填完所有 ID 後，依序點擊首頁各按鈕，用瀏覽器開發者工具確認跳轉 URL：

按鈕	預期 URL 包含
找機票 → Trip.com	allianceid=你的ID
找機票 → Skyscanner	associateid=你的ID
找機票 → Travelpayouts	marker=你的ID
找住宿 → Agoda	cid=你的ID
找住宿 → Booking.com	aid=你的ID
找住宿 → Trip.com	allianceid=你的ID
門票 → Klook	aid=你的ID
門票 → KKday	cid=你的ID
門票 → GetYourGuide	partner_id=你的ID
門票 → Viator	pid=你的ID
機場接送 → Klook	aid=你的ID
機場接送 → KKday	cid=你的ID
📊 後台數據查看
每次用戶點擊並完成購買後，約 T+7 至 T+30 天資料才會出現在各平台後台（退款期後才確認）。

平台	後台查看網址
Trip.com	https://us.trip.com/affiliate-center
Travelpayouts	https://www.travelpayouts.com/dashboard
Agoda	https://partners.agoda.com
Booking.com	https://join.booking.com
Klook	https://affiliate.klook.com/dashboard
KKday	https://www.kkday.com/zh-tw/affiliate
💡 Tip：優先申請 KKday（台灣本土，最快審）和 Trip.com（單一帳號跑機票+住宿），這兩個是最快能開始產生收益的平台。
