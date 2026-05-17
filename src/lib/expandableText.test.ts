import test from "node:test";
import assert from "node:assert/strict";

import { shouldShowExpandableText } from "./expandableText";

test("shouldShowExpandableText returns false for short single-line copy", () => {
  assert.equal(
    shouldShowExpandableText("先看重點，再決定要不要深入閱讀。"),
    false,
  );
});

test("shouldShowExpandableText returns true for long copy", () => {
  assert.equal(
    shouldShowExpandableText(
      "RoamJelly 會先幫你整理這趟旅程的節奏、提醒與待辦，再把細節留在同一張卡片裡，讓你在手機上先讀到最重要的內容，想繼續往下看時再展開完整說明。",
    ),
    true,
  );
});

test("shouldShowExpandableText returns true for multi-line notes even when character count is modest", () => {
  assert.equal(
    shouldShowExpandableText(
      "先到飯店寄放行李\n下午去咖啡店休息\n晚上再去夜景點散步",
      { minCharacters: 120, minLineBreaks: 2 },
    ),
    true,
  );
});
