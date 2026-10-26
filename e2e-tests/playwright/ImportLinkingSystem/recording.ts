/* Recording support shared by specs that double as demos.
 *
 * A spec that imports this behaves as an ordinary regression test until RECORD_WALKTHROUGH=1 is
 * set, at which point it also records video at a watchable pace and, unless WALKTHROUGH_CAPTIONS=0,
 * paints a caption bar into the page so the recording explains itself. The bar is real DOM inside
 * the page, so Playwright's video captures it without any re-encoding afterwards, and the text is
 * kept in localStorage so it survives the reloads and client-side navigations a journey makes.
 *
 * Caption wording must avoid any phrase a spec asserts on with getByText - the bar is in the DOM,
 * so a collision would make that locator ambiguous.
 *
 * The mechanism is the one ready-teddy-wonde-review.walkthrough.spec.ts uses; it lives here so
 * other journeys can be recorded without copying it.
 */
import type { Page, test, TestInfo } from '@playwright/test';

export const RECORDING = process.env.RECORD_WALKTHROUGH === '1';
export const CAPTIONS = RECORDING && process.env.WALKTHROUGH_CAPTIONS !== '0';
const CAPTION_HOLD_MS = Number(process.env.CAPTION_HOLD_MS ?? 2600);
const SLOWMO_MS = Number(process.env.PLAYWRIGHT_SLOWMO ?? 700);

/** Pass to test.use(): video and slow motion only while recording, a plain run otherwise. */
export const recordingOptions = (): Parameters<typeof test.use>[0] =>
    RECORDING
        ? {
              video: { mode: 'on', size: { width: 1280, height: 800 } },
              viewport: { width: 1280, height: 800 },
              launchOptions: { slowMo: SLOWMO_MS },
              // A recording that has gone wrong should say so in seconds, not wait out the test timeout.
              actionTimeout: 20_000
          }
        : {};

const CAPTION_ELEMENT_ID = '__lwp_walkthrough_caption__';
const CAPTION_STORAGE_KEY = '__lwp_walkthrough_caption_text__';

/** Install the caption bar on every document the page loads. No-op unless captions are on. */
export const installCaptionLayer = async (page: Page): Promise<void> => {
    if (!CAPTIONS) return;

    await page.addInitScript(
        ({ elementId, storageKey }) => {
            const paint = (): void => {
                if (!document.body) return;

                let bar = document.getElementById(elementId);

                if (!bar) {
                    bar = document.createElement('div');
                    bar.id = elementId;
                    bar.style.cssText = [
                        'position:fixed',
                        'left:0',
                        'right:0',
                        'bottom:0',
                        'z-index:2147483647',
                        'padding:18px 28px',
                        'background:rgba(12,20,31,0.92)',
                        'color:#fff',
                        'font:600 19px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                        'text-align:center',
                        'pointer-events:none',
                        'white-space:pre-wrap'
                    ].join(';');
                    document.body.appendChild(bar);
                }

                let text = '';

                try {
                    text = window.localStorage.getItem(storageKey) ?? '';
                } catch {
                    text = '';
                }

                if (bar.textContent !== text) bar.textContent = text;
                bar.style.display = text ? 'block' : 'none';
            };

            // The app re-renders and navigates client-side, so re-attach rather than assume.
            window.setInterval(paint, 200);
            document.addEventListener('DOMContentLoaded', paint);
        },
        { elementId: CAPTION_ELEMENT_ID, storageKey: CAPTION_STORAGE_KEY }
    );
};

/** Show a caption and hold it long enough to read. No-op unless captions are on. */
export const caption = async (page: Page, text: string): Promise<void> => {
    if (!CAPTIONS) return;

    await page.evaluate(
        ({ text: value, elementId, storageKey }) => {
            try {
                window.localStorage.setItem(storageKey, value);
            } catch {
                /* private mode or storage disabled: the bar just stays empty */
            }

            const bar = document.getElementById(elementId);

            if (bar) {
                bar.textContent = value;
                bar.style.display = value ? 'block' : 'none';
            }
        },
        { text, elementId: CAPTION_ELEMENT_ID, storageKey: CAPTION_STORAGE_KEY }
    );

    await page.waitForTimeout(CAPTION_HOLD_MS);
};

/** Full-page screenshot into the test's output directory, always taken so a demo can be built from any run. */
export const screenshot = async (page: Page, testInfo: TestInfo, name: string): Promise<void> => {
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
};
