import test from "node:test";
import assert from "node:assert/strict";

import {
  getHorizontalRailStep,
  hasHorizontalOverflow,
} from "./horizontalRail";

test("getHorizontalRailStep keeps a comfortable minimum scroll distance", () => {
  assert.equal(getHorizontalRailStep(180), 220);
});

test("getHorizontalRailStep uses viewport width for larger rails", () => {
  assert.equal(getHorizontalRailStep(400), 328);
  assert.equal(getHorizontalRailStep(600), 492);
});

test("hasHorizontalOverflow detects when content extends past the viewport", () => {
  assert.equal(hasHorizontalOverflow(640, 640), false);
  assert.equal(hasHorizontalOverflow(641, 640), false);
  assert.equal(hasHorizontalOverflow(700, 640), true);
});
