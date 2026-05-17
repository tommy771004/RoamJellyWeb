import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import EditorialSectionIntro from "./EditorialSectionIntro";

test("EditorialSectionIntro renders title, description, and highlight pills", () => {
  const html = renderToStaticMarkup(
    <EditorialSectionIntro
      eyebrow="Trip Utility Layer"
      title="把天氣、清單與分帳綁回這趟旅程"
      description="讓手機上的閱讀先聚焦在重點，再視需要展開更多內容。"
      highlights={[
        { label: "閱讀節奏", value: "先看重點" },
        { label: "資訊層次", value: "卡片分主次" },
      ]}
    />,
  );

  assert.match(html, /Trip Utility Layer/);
  assert.match(html, /把天氣、清單與分帳綁回這趟旅程/);
  assert.match(html, /先看重點/);
  assert.match(html, /卡片分主次/);
});
