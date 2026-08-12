import { expect, test } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

// ---------------------------------------------------------------------------
// Screenshot directory (relative to this spec file → docs/ai-map/TASK_LOGS)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.resolve(__dirname, "../docs/ai-map/TASK_LOGS");

// ---------------------------------------------------------------------------
// Existing Slice A smoke tests
// ---------------------------------------------------------------------------

test("root renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1, main").first()).toBeVisible();
});

test("E-1 isolated E2E auth bootstrap", async ({ page }) => {
  await page.goto("/");
  // The fixture adapter bootstraps a fake staff member named "Fixture Manager"
  // that does not exist in production demo-seed; its presence proves the
  // E2E-only adapter was substituted at build time.
  //
  // NOTE: `<option>` elements are always reported as hidden by browsers and
  // Playwright's visibility model — toBeVisible() on 'select option' always
  // fails regardless of whether the element exists. The correct assertion is
  // toBeAttached(), which checks the element is present in the DOM without
  // requiring it to be visible.
  await expect(
    page.locator("select option", { hasText: "Fixture Manager" }),
  ).toBeAttached({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// Slice B: pre-auth acceptance — one test per exact viewport
//
// Each describe block sets its own viewport with test.use() and skips every
// global project except the one whose viewport matches, so the two named tests
// run exactly once each and no global project (mobile/tablet/desktop) adds a
// spurious duplicate.
// ---------------------------------------------------------------------------

/**
 * Runs all Slice B pre-auth assertions for the current page at the given
 * viewport dimensions. The caller must set viewport via test.use() before
 * calling this helper.
 */
async function runPreAuthAcceptance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  viewport: { width: number; height: number },
) {
  const tag = `${viewport.width}x${viewport.height}`;

  // ── Collect console messages and request URLs for PIN leak check ──────────
  const consoleMessages: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (msg: { text(): string }) =>
    consoleMessages.push(msg.text()),
  );
  page.on("request", (req: { url(): string }) =>
    requestUrls.push(req.url()),
  );

  // ── Navigate ──────────────────────────────────────────────────────────────
  await page.goto("/");
  // Give the page browser focus so element.focus() calls take effect.
  await page.bringToFront();

  // ── 1. Login heading visible ("Đăng nhập") ───────────────────────────────
  const loginHeading = page.getByRole("heading", { name: "Đăng nhập" });
  await expect(loginHeading).toBeVisible({ timeout: 10_000 });

  // ── 2. CafePOS heading absent (shell not rendered) ────────────────────────
  const cafeHeading = page.getByRole("heading", {
    name: "CafePOS",
    exact: true,
  });
  await expect(cafeHeading).not.toBeAttached();

  // ── 3. Header count is 0 (shell <header> not rendered) ────────────────────
  await expect(page.locator("header")).toHaveCount(0);

  // ── Screenshot: login state ───────────────────────────────────────────────
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `task-2-5-e2e-login-${tag}.png`),
    fullPage: false,
  });

  // ── 4. No horizontal overflow on documentElement and body ─────────────────
  const overflowResult = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlScrollWidth: html.scrollWidth,
      htmlClientWidth: html.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
    };
  });
  expect(overflowResult.htmlScrollWidth).toBeLessThanOrEqual(
    overflowResult.htmlClientWidth,
  );
  expect(overflowResult.bodyScrollWidth).toBeLessThanOrEqual(
    overflowResult.bodyClientWidth,
  );

  // ── 5. Select, PIN input, submit bounding boxes fit viewport ─────────────
  const staffSelect = page.locator('select[aria-label="Chọn nhân viên"]');
  const pinInput = page.locator('input[type="password"]');
  const submitBtn = page.getByRole("button", { name: "Đăng nhập" });

  for (const locator of [staffSelect, pinInput, submitBtn]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    // Allow 1 px rounding tolerance on height
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  }

  // ── 6. PIN input attributes ───────────────────────────────────────────────
  await expect(pinInput).toHaveAttribute("type", "password");
  await expect(pinInput).toHaveAttribute("inputmode", "numeric");
  await expect(pinInput).toHaveAttribute("autocomplete", "off");

  // ── Screenshot: masked (PIN attributes confirmed, showing digit masking) ──
  // Select a staff member and type dummy digits to demonstrate masking.
  await staffSelect.selectOption({ label: "Fixture Manager" });
  await pinInput.fill("9999");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `task-2-5-e2e-masked-${tag}.png`),
    fullPage: false,
  });
  // Clear for the real invalid-PIN flow below.
  await pinInput.fill("");

  // ── 7. Invalid PIN busy-state and error flow ──────────────────────────────
  // Staff is already selected above; enter the invalid fixture PIN "1357".
  await staffSelect.selectOption({ label: "Fixture Manager" });
  await pinInput.fill("1357");

  // Click the PIN input first to establish OS-level page focus in the headless
  // browser. Without this, the component's setTimeout(() => el.focus(), 0) is
  // silently ignored because document.hasFocus() is false. This is a real
  // headless browser constraint — clicking the field is what a real user does
  // before submitting, so this is not an artificial workaround.
  await pinInput.click();

  // Submit the form.
  await submitBtn.click();

  // Assert busy state immediately — fixture delay is 250 ms; Playwright polls
  // continuously and will catch this state well within the 2 s timeout.
  const form = page.locator("form");

  // form[aria-busy="true"]
  await expect(form).toHaveAttribute("aria-busy", "true", { timeout: 2_000 });

  // submit button: aria-busy=true AND disabled
  await expect(submitBtn).toHaveAttribute("aria-busy", "true", {
    timeout: 2_000,
  });
  await expect(submitBtn).toBeDisabled({ timeout: 2_000 });

  // select disabled during busy
  await expect(staffSelect).toBeDisabled({ timeout: 2_000 });

  // PIN input disabled during busy
  await expect(pinInput).toBeDisabled({ timeout: 2_000 });

  // ── Screenshot: busy state ────────────────────────────────────────────────
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `task-2-5-e2e-busy-${tag}.png`),
    fullPage: false,
  });

  // ── 8. Wait for busy to resolve, then assert error state ─────────────────
  // aria-busy turning falsy signals the verifier completed.
  await expect(form).not.toHaveAttribute("aria-busy", "true", {
    timeout: 5_000,
  });

  // Generic error alert is visible.
  const errorAlert = page.getByRole("alert");
  await expect(errorAlert).toBeVisible({ timeout: 3_000 });
  // Error text must NOT contain the rejected PIN.
  const alertText = await errorAlert.textContent();
  expect(alertText).not.toContain("1357");

  // PIN input value is cleared.
  await expect(pinInput).toHaveValue("");

  // PIN input aria-invalid=true.
  await expect(pinInput).toHaveAttribute("aria-invalid", "true");

  // Shell still absent after failed login.
  await expect(cafeHeading).not.toBeAttached();
  await expect(page.locator("header")).toHaveCount(0);

  // ── Screenshot: invalid state (after alert/cleared/aria-invalid; before focus) ─
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `task-2-5-e2e-invalid-${tag}.png`),
    fullPage: false,
  });

  // TDD RED — focus-after-error: component calls setTimeout(() => el.focus(), 0)
  // which fires while the input is still disabled={busy} (React 18 batches the
  // setBusy(false) re-render as a microtask that commits AFTER the setTimeout
  // macro-task runs in some Chromium headless scheduling orders). The browser
  // silently ignores focus() on a disabled element. Confirmed by focus() spy:
  // the call reaches the INPUT with disabled=true; activeElement remains BODY.
  // Fix requires moving setBusy(false) before the setTimeout or using a useEffect
  // to focus after busy transitions to false. Cannot fix without production source
  // change. This assertion is intentionally RED to document real missing behavior.
  await expect(pinInput).toBeFocused({ timeout: 2_000 });

  // ── 9. PIN leak checks ────────────────────────────────────────────────────
  // Both "1357" (invalid) and "2468" (valid fixture PIN) must not appear in:
  //   • current URL
  //   • serialized DOM (outerHTML)
  //   • visible text (innerText)
  //   • all element attribute values
  //   • console messages (captured from page.on("console"))
  //   • request URLs (captured from page.on("request"))

  const currentUrl = page.url();
  expect(currentUrl).not.toContain("1357");
  expect(currentUrl).not.toContain("2468");

  const domHtml: string = await page.evaluate(
    () => document.documentElement.outerHTML,
  );
  expect(domHtml).not.toContain("1357");
  expect(domHtml).not.toContain("2468");

  const visibleText: string = await page.evaluate(
    () => document.body.innerText,
  );
  expect(visibleText).not.toContain("1357");
  expect(visibleText).not.toContain("2468");

  const allAttributeValues: string[] = await page.evaluate(() => {
    const vals: string[] = [];
    document.querySelectorAll("*").forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        vals.push(attr.value);
      }
    });
    return vals;
  });
  const attrLeaks1357 = allAttributeValues.filter((v) => v.includes("1357"));
  const attrLeaks2468 = allAttributeValues.filter((v) => v.includes("2468"));
  // Report counts only — do not print raw arrays.
  expect(attrLeaks1357).toHaveLength(0);
  expect(attrLeaks2468).toHaveLength(0);

  // Console — report counts only, not raw content.
  const consoleLeaks1357 = consoleMessages.filter((m) => m.includes("1357"));
  const consoleLeaks2468 = consoleMessages.filter((m) => m.includes("2468"));
  expect(consoleLeaks1357).toHaveLength(0);
  expect(consoleLeaks2468).toHaveLength(0);

  // Request URLs — report counts only.
  const requestLeaks1357 = requestUrls.filter((u) => u.includes("1357"));
  const requestLeaks2468 = requestUrls.filter((u) => u.includes("2468"));
  expect(requestLeaks1357).toHaveLength(0);
  expect(requestLeaks2468).toHaveLength(0);
}

// ── Test: 390×844 ───────────────────────────────────────────────────────────
// Skips every project except "mobile" (390×844) so the test runs exactly once.
test.describe("E-2 layout + E-3 masked PIN + E-4 busy + E-5 invalid focus @ 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("E-2/E-3/E-4/E-5 pre-auth acceptance", async ({ page }, testInfo) => {
    // Skip in projects that are not the intended viewport to avoid duplicates.
    // "mobile" is the only global project configured with 390×844.
    test.skip(
      testInfo.project.name !== "mobile",
      `Skipped in project "${testInfo.project.name}" — this test targets 390×844 (mobile only)`,
    );
    await runPreAuthAcceptance(page, { width: 390, height: 844 });
  });
});

// ── Test: 1440×900 ──────────────────────────────────────────────────────────
// Skips every project except "desktop" (1440×900) so the test runs exactly once.
test.describe("E-2 layout + E-3 masked PIN + E-4 busy + E-5 invalid focus @ 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("E-2/E-3/E-4/E-5 pre-auth acceptance", async ({ page }, testInfo) => {
    // Skip in projects that are not the intended viewport to avoid duplicates.
    // "desktop" is the only global project configured with 1440×900.
    test.skip(
      testInfo.project.name !== "desktop",
      `Skipped in project "${testInfo.project.name}" — this test targets 1440×900 (desktop only)`,
    );
    await runPreAuthAcceptance(page, { width: 1440, height: 900 });
  });
});

// ---------------------------------------------------------------------------
// Slice C: authenticated browser proof — one test per exact viewport
//
// Fresh browser session per describe block. No direct store mutation, no
// page.evaluate() auth injection, no seed import. Uses fixture staff
// "fixture-manager" and E2E-only fake bootstrap PIN only.
//
// TDD RED (recorded before GREEN implementation):
//   The test was first run with ONLY the invalid-PIN sub-flow (PIN "1357")
//   completing, then immediately asserting the CafePOS heading visible —
//   which fails because invalid PIN does not authenticate. That RED run
//   confirmed the assertion is meaningful. See task log for exact output.
//
// GREEN: The valid fixture staff + fixture PIN path completes, the bootstrap
//   gate transitions to PosShell, and all post-auth assertions pass.
// ---------------------------------------------------------------------------

/**
 * Runs all Slice C authenticated-acceptance assertions for the current page at
 * the given viewport dimensions. The caller must set viewport via test.use().
 *
 * Flow (no direct store mutation, no page.evaluate auth injection):
 *   1. Navigate.
 *   2. Select fixture staff via the staff <select>.
 *   3. Fill fixture PIN into the password input.
 *   4. Click the submit button.
 *   5. Assert PIN input is cleared (value "").
 *   6. Assert login heading ("Đăng nhập") is absent.
 *   7. Assert exact CafePOS heading (h1 "CafePOS") is visible.
 *   8. Assert <header> is present and visible.
 *   9. Run PIN leak checks for both the invalid fixture PIN and the valid
 *      fixture PIN against: URL, serialized DOM, visible text, element
 *      attributes, console messages, and request URLs.
 *  10. Capture viewport screenshot.
 */
async function runAuthenticatedAcceptance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  viewport: { width: number; height: number },
) {
  const tag = `${viewport.width}x${viewport.height}`;

  // ── Collect console messages and request URLs for PIN leak check ──────────
  const consoleMessages: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (msg: { text(): string }) =>
    consoleMessages.push(msg.text()),
  );
  page.on("request", (req: { url(): string }) =>
    requestUrls.push(req.url()),
  );

  // ── Navigate ──────────────────────────────────────────────────────────────
  await page.goto("/");
  await page.bringToFront();

  // ── Wait for login form to be ready ───────────────────────────────────────
  const loginHeading = page.getByRole("heading", { name: "Đăng nhập" });
  await expect(loginHeading).toBeVisible({ timeout: 10_000 });

  const staffSelect = page.locator('select[aria-label="Chọn nhân viên"]');
  const pinInput = page.locator('input[type="password"]');
  const submitBtn = page.getByRole("button", { name: "Đăng nhập" });

  // ── Select fixture staff ──────────────────────────────────────────────────
  // "fixture-manager" is the id; select by label text to mirror real user action.
  await staffSelect.selectOption({ label: "Fixture Manager" });

  // ── Fill fixture PIN ──────────────────────────────────────────────────────
  // E2E-only fake bootstrap PIN — not a demo-seed or production PIN.
  await pinInput.fill("2468");

  // ── Click submit ──────────────────────────────────────────────────────────
  await submitBtn.click();

  // ── Assert PIN is cleared after submit ────────────────────────────────────
  // PinLogin clears PIN immediately on capture; value must be "" post-submit.
  await expect(pinInput).toHaveValue("", { timeout: 5_000 });

  // ── Wait for bootstrap gate to transition to PosShell ─────────────────────
  // Login heading must disappear once authenticated.
  await expect(loginHeading).not.toBeAttached({ timeout: 10_000 });

  // ── Assert exact CafePOS heading visible ─────────────────────────────────
  const cafeHeading = page.getByRole("heading", {
    name: "CafePOS",
    exact: true,
  });
  await expect(cafeHeading).toBeVisible({ timeout: 10_000 });

  // ── Assert <header> is visible ────────────────────────────────────────────
  const shellHeader = page.locator("header").first();
  await expect(shellHeader).toBeVisible({ timeout: 5_000 });

  // ── Screenshot: authenticated shell ──────────────────────────────────────
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `task-2-5-e2e-shell-${tag}.png`),
    fullPage: false,
  });

  // ── PIN leak checks ───────────────────────────────────────────────────────
  // Both the invalid fixture PIN "1357" and the valid fixture PIN "2468" must
  // not appear in: URL, serialized DOM, visible text, element attributes,
  // console messages, or request URLs.
  //
  // "2468" is the E2E-only fake bootstrap PIN. Its absence from the DOM after
  // submit confirms the component does not retain the raw PIN value in any
  // accessible surface. The input value is cleared on capture (before await),
  // which is normal browser/React behavior — not a special guard.

  const currentUrl = page.url();
  expect(currentUrl).not.toContain("1357");
  expect(currentUrl).not.toContain("2468");

  const domHtml: string = await page.evaluate(
    () => document.documentElement.outerHTML,
  );
  expect(domHtml).not.toContain("1357");
  expect(domHtml).not.toContain("2468");

  const visibleText: string = await page.evaluate(
    () => document.body.innerText,
  );
  expect(visibleText).not.toContain("1357");
  expect(visibleText).not.toContain("2468");

  const allAttributeValues: string[] = await page.evaluate(() => {
    const vals: string[] = [];
    document.querySelectorAll("*").forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        vals.push(attr.value);
      }
    });
    return vals;
  });
  const attrLeaks1357 = allAttributeValues.filter((v) => v.includes("1357"));
  const attrLeaks2468 = allAttributeValues.filter((v) => v.includes("2468"));
  // Report counts only — do not print raw arrays.
  expect(attrLeaks1357).toHaveLength(0);
  expect(attrLeaks2468).toHaveLength(0);

  // Console — report counts only, not raw content.
  const consoleLeaks1357 = consoleMessages.filter((m) => m.includes("1357"));
  const consoleLeaks2468 = consoleMessages.filter((m) => m.includes("2468"));
  expect(consoleLeaks1357).toHaveLength(0);
  expect(consoleLeaks2468).toHaveLength(0);

  // Request URLs — report counts only.
  const requestLeaks1357 = requestUrls.filter((u) => u.includes("1357"));
  const requestLeaks2468 = requestUrls.filter((u) => u.includes("2468"));
  expect(requestLeaks1357).toHaveLength(0);
  expect(requestLeaks2468).toHaveLength(0);
}

// ── Slice C test: 390×844 ────────────────────────────────────────────────────
test.describe("E-6 authenticated shell + PIN leak boundary @ 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("E-6 authenticated shell acceptance", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile",
      `Skipped in project "${testInfo.project.name}" — this test targets 390×844 (mobile only)`,
    );
    await runAuthenticatedAcceptance(page, { width: 390, height: 844 });
  });
});

// ── Slice C test: 1440×900 ───────────────────────────────────────────────────
test.describe("E-6 authenticated shell + PIN leak boundary @ 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("E-6 authenticated shell acceptance", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      `Skipped in project "${testInfo.project.name}" — this test targets 1440×900 (desktop only)`,
    );
    await runAuthenticatedAcceptance(page, { width: 1440, height: 900 });
  });
});

// ---------------------------------------------------------------------------
// Task 2.6 Slice 3: authenticated table-map intentional empty state
//
// The fixture auth adapter sets tableCount:2 on the tenant but never calls
// replaceTenantData(), so catalog-table-store.tables stays [] after sign-in.
// TableMap renders the empty state "Chưa có bàn để hiển thị" whenever its
// `tables` prop is empty — implemented in Slice 2.
//
// TDD note: Slice 2 already delivers the empty-state render; these browser
// assertions are expected to be GREEN on first run (inherited GREEN). No code,
// fixture, or production source is modified to produce a RED run.
//
// Auth flow: fixture UI only — select "Fixture Manager", fill PIN "2468",
// click submit. No page.evaluate store injection. No catalog/table fixture.
//
// Assertions per viewport:
//   1. CafePOS heading visible (confirms PosShell rendered)
//   2. Exact text "Chưa có bàn để hiển thị" visible
//   3. No button matching "Bàn 1" (confirms table grid is absent)
//   4. No horizontal overflow on documentElement / body
//   5. Screenshot saved as task-2-6-table-map-empty-{tag}.png
//
// Projects: mobile (390×844), tablet (768×1024), desktop (1440×900).
// Each describe block skips all other projects so the test runs exactly once.
// ---------------------------------------------------------------------------

/**
 * Authenticates via fixture UI flow and asserts the table-map empty state.
 * Shared helper called by all three Task 2.6 Slice 3 describe blocks.
 */
async function runTableMapEmptyAcceptance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  viewport: { width: number; height: number },
) {
  const tag = `${viewport.width}x${viewport.height}`;

  // ── Navigate ──────────────────────────────────────────────────────────────
  await page.goto("/");
  await page.bringToFront();

  // ── Wait for login form ────────────────────────────────────────────────────
  const loginHeading = page.getByRole("heading", { name: "Đăng nhập" });
  await expect(loginHeading).toBeVisible({ timeout: 10_000 });

  const staffSelect = page.locator('select[aria-label="Chọn nhân viên"]');
  const pinInput = page.locator('input[type="password"]');
  const submitBtn = page.getByRole("button", { name: "Đăng nhập" });

  // ── Authenticate via fixture UI flow ──────────────────────────────────────
  await staffSelect.selectOption({ label: "Fixture Manager" });
  await pinInput.fill("2468");
  await submitBtn.click();

  // ── Wait for PosShell ─────────────────────────────────────────────────────
  await expect(loginHeading).not.toBeAttached({ timeout: 10_000 });

  // ── 1. CafePOS heading visible ────────────────────────────────────────────
  const cafeHeading = page.getByRole("heading", {
    name: "CafePOS",
    exact: true,
  });
  await expect(cafeHeading).toBeVisible({ timeout: 10_000 });

  // ── 2. Empty-state text visible ───────────────────────────────────────────
  // Both the mobile/tablet Tabs layout and the desktop grid layout render the
  // same TableMap component; at widths below lg the desktop grid is CSS-hidden
  // (display:none via "hidden ... lg:grid" classes) but still in the DOM,
  // producing two matching <p> elements. The desktop grid appears first in JSX
  // order, so .first() returns the hidden one. We assert at least one match is
  // visible using toBeAttached + a visible-count evaluation instead of strict
  // getByText, to reliably cover all three viewport widths.
  const emptyTextLocator = page.locator("p", {
    hasText: "Chưa có bàn để hiển thị",
  });
  // At least one instance must be present in the DOM.
  await expect(emptyTextLocator.first()).toBeAttached({ timeout: 5_000 });
  // At least one instance must be visible (the one in the active panel).
  const visibleCount: number = await emptyTextLocator.evaluateAll(
    (els: Element[]) =>
      els.filter((el) => {
        // Walk ancestors; if any has display:none or visibility:hidden the
        // element is not visible.
        let node: Element | null = el;
        while (node) {
          const style = window.getComputedStyle(node);
          if (style.display === "none" || style.visibility === "hidden") {
            return false;
          }
          node = node.parentElement;
        }
        return true;
      }).length,
  );
  expect(visibleCount).toBeGreaterThanOrEqual(1);

  // ── 3. No button matching "Bàn 1" ────────────────────────────────────────
  await expect(page.getByRole("button", { name: "Bàn 1" })).toHaveCount(0);

  // ── 4. No horizontal overflow ─────────────────────────────────────────────
  const overflowResult = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlScrollWidth: html.scrollWidth,
      htmlClientWidth: html.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
    };
  });
  expect(overflowResult.htmlScrollWidth).toBeLessThanOrEqual(
    overflowResult.htmlClientWidth,
  );
  expect(overflowResult.bodyScrollWidth).toBeLessThanOrEqual(
    overflowResult.bodyClientWidth,
  );

  // ── 5. Screenshot ─────────────────────────────────────────────────────────
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `task-2-6-table-map-empty-${tag}.png`),
    fullPage: false,
  });
}

// ── Task 2.6 Slice 3 test: 390×844 (mobile) ──────────────────────────────────
test.describe("Task 2.6 table-map empty state @ 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Task 2.6 table-map empty state", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile",
      `Skipped in project "${testInfo.project.name}" — this test targets 390×844 (mobile only)`,
    );
    await runTableMapEmptyAcceptance(page, { width: 390, height: 844 });
  });
});

// ── Task 2.6 Slice 3 test: 768×1024 (tablet) ─────────────────────────────────
test.describe("Task 2.6 table-map empty state @ 768×1024", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("Task 2.6 table-map empty state", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "tablet",
      `Skipped in project "${testInfo.project.name}" — this test targets 768×1024 (tablet only)`,
    );
    await runTableMapEmptyAcceptance(page, { width: 768, height: 1024 });
  });
});

// ── Task 2.6 Slice 3 test: 1440×900 (desktop) ────────────────────────────────
test.describe("Task 2.6 table-map empty state @ 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Task 2.6 table-map empty state", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      `Skipped in project "${testInfo.project.name}" — this test targets 1440×900 (desktop only)`,
    );
    await runTableMapEmptyAcceptance(page, { width: 1440, height: 900 });
  });
});

// ---------------------------------------------------------------------------
// Task 2.7 Slice 3: authenticated menu (catalog) intentional empty state
//
// The fixture auth adapter never calls replaceTenantData(), so
// catalog-table-store.catalogGroups / catalogItems remain [] after sign-in.
// MenuGrid renders the empty-state message "Chưa có món để hiển thị" when
// orderedGroups.length === 0 — implemented in Slice 2.
//
// TDD note: Slice 2 already delivers the empty-state render; these browser
// assertions are expected to be GREEN on first run (inherited GREEN). No code,
// fixture, or production source is modified to produce a RED run.
//
// Auth flow: fixture UI only — select "Fixture Manager", fill PIN "2468",
// click submit. No page.evaluate store injection. No catalog fixture.
//
// Layout notes:
//   - Mobile (390×844) and tablet (768×1024): "pos" view shows a Tabs panel
//     (defaultValue="tables"). The "Thực đơn" tab must be clicked after login
//     to bring MenuGrid into the active (visible) panel.
//   - Desktop (1440×900): the desktop 12-col grid is visible at lg breakpoint;
//     the center column renders menuPanel directly — no tab click required.
//
// Assertions per viewport:
//   1. CafePOS heading visible (confirms PosShell rendered).
//   2. At least one computed-style-visible exact text "Chưa có món để hiển thị".
//   3. Searchbox absent (MenuGrid only renders it when groups exist; empty
//      catalog produces no search input — this is correct empty-state behavior).
//   4. No text "Cà phê đen" anywhere in the DOM (legacy hardcoded menu item
//      must not bleed into the MenuGrid panel).
//   5. No horizontal overflow on documentElement / body.
//   6. Screenshot saved as task-2-7-menu-empty-{tag}.png.
//
// Projects: mobile (390×844), tablet (768×1024), desktop (1440×900).
// Each describe block skips all other projects so the test runs exactly once.
// ---------------------------------------------------------------------------

/**
 * Authenticates via fixture UI flow, navigates to the menu panel, and asserts
 * the MenuGrid empty state. Shared helper for all three Task 2.7 Slice 3 blocks.
 */
async function runMenuEmptyAcceptance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  viewport: { width: number; height: number },
) {
  const tag = `${viewport.width}x${viewport.height}`;

  // ── Navigate ──────────────────────────────────────────────────────────────
  await page.goto("/");
  await page.bringToFront();

  // ── Wait for login form ────────────────────────────────────────────────────
  const loginHeading = page.getByRole("heading", { name: "Đăng nhập" });
  await expect(loginHeading).toBeVisible({ timeout: 10_000 });

  const staffSelect = page.locator('select[aria-label="Chọn nhân viên"]');
  const pinInput = page.locator('input[type="password"]');
  const submitBtn = page.getByRole("button", { name: "Đăng nhập" });

  // ── Authenticate via fixture UI flow ──────────────────────────────────────
  await staffSelect.selectOption({ label: "Fixture Manager" });
  await pinInput.fill("2468");
  await submitBtn.click();

  // ── Wait for PosShell ─────────────────────────────────────────────────────
  await expect(loginHeading).not.toBeAttached({ timeout: 10_000 });

  // ── 1. CafePOS heading visible ────────────────────────────────────────────
  const cafeHeading = page.getByRole("heading", {
    name: "CafePOS",
    exact: true,
  });
  await expect(cafeHeading).toBeVisible({ timeout: 10_000 });

  // ── Navigate to menu panel ────────────────────────────────────────────────
  // Mobile/tablet: POS view defaults to "tables" tab; must click "Thực đơn".
  // Desktop (≥ lg): menuPanel is rendered in the 12-col desktop grid directly —
  // no tab click needed. The breakpoint "lg" is 1024 px; 768 is below lg.
  if (viewport.width < 1024) {
    // The mobile/tablet layout uses a Tabs component with a "menu" TabsTrigger.
    // The trigger label is "Thực đơn".
    const menuTab = page.getByRole("tab", { name: "Thực đơn" });
    await expect(menuTab).toBeVisible({ timeout: 5_000 });
    await menuTab.click();
    // Wait for the tab panel to become active (data-[state=active]).
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', {
      timeout: 5_000,
    });
  }

  // ── 2. Empty-state text visible ───────────────────────────────────────────
  // MenuGrid renders <span>Chưa có món để hiển thị</span> inside a div when
  // orderedGroups is empty. Both the mobile/tablet Tabs panel and the desktop
  // grid column contain a MenuGrid; at widths below lg the desktop column is
  // CSS-hidden (display:none via "hidden lg:grid" classes on <main>), so only
  // the active Tabs panel element is visible.
  //
  // We collect all matching elements and assert at least one is
  // computed-style-visible (no ancestor with display:none or visibility:hidden).
  const emptyTextLocator = page.locator("span", {
    hasText: "Chưa có món để hiển thị",
  });
  // At least one instance must be present in the DOM.
  await expect(emptyTextLocator.first()).toBeAttached({ timeout: 5_000 });
  // At least one instance must be computed-style-visible.
  const visibleCount: number = await emptyTextLocator.evaluateAll(
    (els: Element[]) =>
      els.filter((el) => {
        let node: Element | null = el;
        while (node) {
          const style = window.getComputedStyle(node);
          if (style.display === "none" || style.visibility === "hidden") {
            return false;
          }
          node = node.parentElement;
        }
        return true;
      }).length,
  );
  expect(visibleCount).toBeGreaterThanOrEqual(1);

  // ── 3. Searchbox absent ───────────────────────────────────────────────────
  // MenuGrid only renders the search <input role="searchbox"> when
  // orderedGroups.length > 0. With an empty catalog, no searchbox is rendered.
  // Asserting count 0 verifies the empty-state branch is active (not the
  // populated branch with search/pills/grid).
  await expect(page.getByRole("searchbox")).toHaveCount(0);

  // ── 4. No legacy "Cà phê đen" text in the menu panel ────────────────────
  // "Cà phê đen" is a hardcoded item in the order panel (PosShell.currentOrder).
  // It must NOT appear in the MenuGrid panel itself. At mobile/tablet the order
  // tab is display:none (inactive), so innerText omits it naturally. At desktop
  // the order column is always visible alongside the menu column — scoping the
  // check to the menu container (the element containing the empty-state span)
  // ensures "Cà phê đen" from the order column doesn't create a false failure.
  //
  // Strategy: find the closest visible ancestor of the empty-state span and
  // assert its innerText does not contain "Cà phê đen". This scopes the
  // assertion to the menu panel without relying on layout-specific selectors.
  const menuPanelText: string = await emptyTextLocator.first().evaluate(
    (el: Element) => {
      // Walk up to the first ancestor that is a section or has role="tabpanel",
      // or fall back to the direct parent two levels up (the MenuGrid root div).
      let node: Element | null = el;
      for (let i = 0; i < 6; i++) {
        node = node?.parentElement ?? null;
        if (!node) break;
        const tag = node.tagName.toLowerCase();
        const role = node.getAttribute("role");
        if (tag === "section" || tag === "main" || role === "tabpanel") {
          return (node as HTMLElement).innerText ?? "";
        }
      }
      return (node as HTMLElement | null)?.innerText ?? "";
    },
  );
  expect(menuPanelText).not.toContain("Cà phê đen");

  // ── 5. No horizontal overflow ─────────────────────────────────────────────
  const overflowResult = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlScrollWidth: html.scrollWidth,
      htmlClientWidth: html.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
    };
  });
  expect(overflowResult.htmlScrollWidth).toBeLessThanOrEqual(
    overflowResult.htmlClientWidth,
  );
  expect(overflowResult.bodyScrollWidth).toBeLessThanOrEqual(
    overflowResult.bodyClientWidth,
  );

  // ── 6. Screenshot ─────────────────────────────────────────────────────────
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `task-2-7-menu-empty-${tag}.png`),
    fullPage: false,
  });
}

// ── Task 2.7 Slice 3 test: 390×844 (mobile) ──────────────────────────────────
test.describe("Task 2.7 menu empty state @ 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Task 2.7 menu empty state", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile",
      `Skipped in project "${testInfo.project.name}" — this test targets 390×844 (mobile only)`,
    );
    await runMenuEmptyAcceptance(page, { width: 390, height: 844 });
  });
});

// ── Task 2.7 Slice 3 test: 768×1024 (tablet) ─────────────────────────────────
test.describe("Task 2.7 menu empty state @ 768×1024", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("Task 2.7 menu empty state", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "tablet",
      `Skipped in project "${testInfo.project.name}" — this test targets 768×1024 (tablet only)`,
    );
    await runMenuEmptyAcceptance(page, { width: 768, height: 1024 });
  });
});

// ── Task 2.7 Slice 3 test: 1440×900 (desktop) ────────────────────────────────
test.describe("Task 2.7 menu empty state @ 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Task 2.7 menu empty state", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      `Skipped in project "${testInfo.project.name}" — this test targets 1440×900 (desktop only)`,
    );
    await runMenuEmptyAcceptance(page, { width: 1440, height: 900 });
  });
});
