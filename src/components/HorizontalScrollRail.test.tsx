import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import HorizontalScrollRail from "./HorizontalScrollRail";

test("HorizontalScrollRail renders navigation buttons and content", () => {
  const html = renderToStaticMarkup(
    <HorizontalScrollRail label="熱門目的地">
      <div>card-a</div>
      <div>card-b</div>
    </HorizontalScrollRail>,
  );

  assert.match(html, /上一組熱門目的地/);
  assert.match(html, /下一組熱門目的地/);
  assert.match(html, /card-a/);
  assert.match(html, /card-b/);
});
