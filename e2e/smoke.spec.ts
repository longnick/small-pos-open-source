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
