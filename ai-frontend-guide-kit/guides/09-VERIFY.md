# 09 — Verify

Purpose: prove the flows work and the craft holds. Two layers: business flow (E2E) and visual regression.

## Setup (once per project)

```bash
npm init playwright@latest
```

## 1. Business flow test (`tests/e2e/conversion.spec.ts`)

```ts
import { test, expect } from '@playwright/test';

test('the user completes the main funnel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/signup/);
  await page.getByLabel(/work email/i).fill('partner@business.com');
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.getByRole('heading', { name: /welcome to your dashboard/i })).toBeVisible();
});
```

Rules: drive tests from `PRODUCT.md` flows; assert user-visible outcomes, not implementation details; one spec per critical flow.

## 2. Visual regression for interactive states (`tests/visual/craft.spec.ts`)

```ts
import { test, expect } from '@playwright/test';

test('primary button holds its craft in hover state', async ({ page }) => {
  await page.goto('/components/buttons');
  const button = page.getByRole('button', { name: /save changes/i });
  await expect(button).toHaveScreenshot('button-base.png');
  await button.hover();
  await page.waitForTimeout(200); // let the spring settle
  await expect(button).toHaveScreenshot('button-hover.png', { maxDiffPixelRatio: 0.01 });
});
```

Capture the states that carry the design intent: hover, focus, loading, empty and error states.

## 3. Audit loop

```bash
npx playwright test
```

- If the `impeccable` skill is installed: `/impeccable audit <screen>` and `/impeccable polish <screen>` before closing each screen.
- Failures: fix the exact reported issue, then re-run the full suite. No screen is done with a red test.

## Done checklist

- [ ] All critical flows pass E2E.
- [ ] Visual snapshots exist for key interactive states.
- [ ] Reduced motion and keyboard focus verified manually once per screen.
- [ ] Console free of hydration/React errors.
- [ ] License notices kept for every reused component.
- [ ] Decision log (`06-REUSE`) attached.

When all boxes are checked, the screen is ready for review/commit.
