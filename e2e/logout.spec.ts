import { test, expect, Page } from '@playwright/test';

const OVERLAY_SELECTOR = 'div[class*="z-[2147483647"]';
const LOGOUT_BUTTON_SELECTOR = '[data-testid="logout-button"]';
const HEADER_MENU_SELECTOR = 'header button[aria-haspopup="true"]';
const LOGIN_PAGE_SELECTOR = 'div[class*="ImageCarouselColumn"]';
const TOAST_SELECTOR = 'div[role="status"]';

// Helper to perform login before tests
async function login(page: Page) {
    await page.goto('/');
    // Use dummy credentials that are expected to work in the test environment
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    // Wait for the main app header to be visible, indicating successful login
    await expect(page.locator(HEADER_MENU_SELECTOR)).toBeVisible({ timeout: 10000 });
}

test.describe('Logout Flow', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('A: Normal logout shows overlay and lands on login page without flicker', async ({ page }) => {
        const startTime = performance.now();
        
        // Open menu and click logout
        await page.locator(HEADER_MENU_SELECTOR).click();
        await page.locator(LOGOUT_BUTTON_SELECTOR).click();

        // 1. The overlay should appear very quickly
        const overlay = page.locator(OVERLAY_SELECTOR);
        await expect(overlay).toBeVisible();
        const overlayTime = performance.now() - startTime;
        expect(overlayTime).toBeLessThan(100); // Overlay should be near-instant

        // 2. The overlay should contain "Logging out..." text (no flicker of old content)
        await expect(overlay).toContainText('Logging out...');

        // 3. Eventually, the login page should be visible
        await expect(page.locator(LOGIN_PAGE_SELECTOR)).toBeVisible({ timeout: 5000 });
        
        // 4. The overlay should be gone
        await expect(overlay).not.toBeVisible();

        // 5. Ensure no hard navigation occurred (URL remains the same root)
        expect(page.url()).not.toContain('?'); // A simple check
    });

    test('B: Rapid-clicking logout does not cause errors', async ({ page }) => {
        await page.locator(HEADER_MENU_SELECTOR).click();

        // Click the logout button multiple times in quick succession
        for (let i = 0; i < 5; i++) {
            await page.locator(LOGOUT_BUTTON_SELECTOR).click({ noWaitAfter: true, force: true });
        }
        
        // The outcome should be the same as a single click
        await expect(page.locator(OVERLAY_SELECTOR)).toBeVisible();
        await expect(page.locator(LOGIN_PAGE_SELECTOR)).toBeVisible({ timeout: 5000 });
        await expect(page.locator(OVERLAY_SELECTOR)).not.toBeVisible();
    });

    test('C: Overlay appears visually above any active toasts', async ({ page }) => {
        // 1. Trigger an error to show a toast
        await page.evaluate(() => {
            setTimeout(() => {
                // This will be caught by the global error handler and show a toast
                (window as any).triggerTestError(); 
            }, 10);
        });

        // Add a helper on the page to trigger errors
        await page.addInitScript(() => {
            window['triggerTestError'] = () => { throw new Error('E2E Test Error'); };
        });

        const toast = page.locator(TOAST_SELECTOR);
        await expect(toast).toBeVisible();
        await expect(toast).toContainText('E2E Test Error');

        // 2. Initiate logout
        await page.locator(HEADER_MENU_SELECTOR).click();
        await page.locator(LOGOUT_BUTTON_SELECTOR).click();

        // 3. Assert stacking order
        const overlayZIndex = await page.locator(OVERLAY_SELECTOR).evaluate(el => {
            return parseInt(window.getComputedStyle(el).zIndex, 10);
        });
        
        const toastZIndex = await toast.evaluate(el => {
            return parseInt(window.getComputedStyle(el).zIndex, 10);
        });

        expect(overlayZIndex).toBeGreaterThan(toastZIndex);

        // 4. Ensure the flow completes successfully
        await expect(page.locator(LOGIN_PAGE_SELECTOR)).toBeVisible({ timeout: 5000 });
    });
});
