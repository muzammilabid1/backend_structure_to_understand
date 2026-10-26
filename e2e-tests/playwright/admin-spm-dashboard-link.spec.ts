import { expect, test, type Page } from '@playwright/test';
import { admin, password } from './constants';
import { login, openSideDrawer, waitForLoading } from './utils';

/**
 * the admin sidebar links out to the SPM dashboard, which is a separate app on another host.
 *
 * The url is derived from NEXT_PUBLIC_COOKIE_DOMAIN (frontend/shared/externalAppLinks.ts). The e2e stack
 * leaves that unset, which reads as localhost, so the link points at the dashboard's local port.
 *
 * The dashboard does not run in the e2e stack, so its origin is stubbed: the spec checks where the
 * link sends the admin, not what the dashboard renders there. That app has its own specs.
 */
const SPM_DASHBOARD_URL = 'http://localhost:3002/dashboard';

const openAdminSidebar = async (page: Page) => {
    await login(page, admin, password);
    await page.waitForURL(/\/admin\/all-feeds/);
    await waitForLoading(page);
    await expect(page.getByTestId('common-drawer-list')).toBeVisible();
    await openSideDrawer(page);
};

test.describe('Admin sidebar SPM Dashboard link', () => {
    test.beforeEach(async ({ context }) => {
        await context.route(`${SPM_DASHBOARD_URL}**`, (route) =>
            route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>SPM dashboard stub</h1>' })
        );
    });

    test('renders as an anchor that opens the dashboard in a new tab', async ({ page }) => {
        await openAdminSidebar(page);

        const item = page.getByTestId('spm-dashboard-common-drawer-list');
        await expect(item).toBeVisible();
        await expect(item).toContainText('SPM Dashboard');

        const anchor = page.locator('a', { has: item });
        await expect(anchor).toHaveAttribute('href', SPM_DASHBOARD_URL);
        await expect(anchor).toHaveAttribute('target', '_blank');
        await expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('a click opens the dashboard in a new tab and leaves the platform where it was', async ({ page, context }) => {
        await openAdminSidebar(page);
        const platformUrl = page.url();

        const [dashboard] = await Promise.all([context.waitForEvent('page'), page.getByTestId('spm-dashboard-common-drawer-list').click()]);
        await dashboard.waitForLoadState();

        expect(dashboard.url()).toBe(SPM_DASHBOARD_URL);
        await expect(dashboard.getByRole('heading', { name: 'SPM dashboard stub' })).toBeVisible();
        expect(page.url()).toBe(platformUrl);
        expect(await dashboard.evaluate(() => window.opener === null)).toBe(true);
    });

    // The in-app rows handle a modified click themselves: they cancel the anchor and call window.open. An
    // external row must leave it to the anchor, because window.open(url, '_blank') drops rel="noopener" and
    // hands the other app a window.opener reference back into the platform tab.
    test('a modified click opens the dashboard without a reference back to the platform', async ({ page, context }) => {
        await openAdminSidebar(page);

        const [dashboard] = await Promise.all([
            context.waitForEvent('page'),
            page.getByTestId('spm-dashboard-common-drawer-list').click({ modifiers: ['ControlOrMeta'] })
        ]);
        await dashboard.waitForLoadState();

        expect(dashboard.url()).toBe(SPM_DASHBOARD_URL);
        expect(await dashboard.evaluate(() => window.opener === null)).toBe(true);
    });
});
