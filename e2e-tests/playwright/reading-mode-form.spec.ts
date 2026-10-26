import type { Schema } from '@lwp/postgres-client';
import { expect, test, type Page } from '@playwright/test';
import { type Kysely } from 'kysely';
import { ReadingBookOptions, ReadingMode } from 'lwp-shared';

import { password } from './constants';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { type ReadingLogFixture, seedReadingLogParent } from './readingLogFixtures';
import { login, waitForLoading } from './utils';

const MODE_CARDS = ['read-independently-card', 'listened-together-card', 'read-aloud-card', 'read-in-the-real-world-card'];

test.describe('Asking parents how they read (LEA-6488)', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let fixture: ReadingLogFixture;

    test.beforeAll(() => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test.beforeEach(async () => {
        test.setTimeout(150000);
        fixture = await seedReadingLogParent(db, utils);
    });

    const openReadingLog = async (page: Page): Promise<void> => {
        await login(page, fixture.parentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible({ timeout: 45000 });
    };

    const chooseToday = async (page: Page): Promise<void> => {
        await page.getByTestId('reading-log-slider-day').filter({ hasText: 'Today' }).first().click();
    };

    const savedEntry = async (bookName: string) =>
        await db
            .selectFrom('lwp_pupil_feedback as lpf')
            .innerJoin('lwp_pupil_feedback_history as lpfh', 'lpfh.lwpPupilFeedbackId', 'lpf.id')
            .where('lpfh.lwpPupilId', '=', fixture.pupilId)
            .where('lpf.bookName', '=', bookName)
            .select(['lpf.readingMode', 'lpf.readingType', 'lpf.pageNumber', 'lpf.isBookFinished'])
            .executeTakeFirstOrThrow();

    const expectAllFourDefinitions = async (page: Page): Promise<void> => {
        await expect(page.getByText('Reading independently').first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Listening together').first()).toBeVisible();
        await expect(page.getByText('Reading aloud').first()).toBeVisible();
        await expect(page.getByText('Reading in the real world').first()).toBeVisible();
        await expect(page.getByText('phonics practice sheets', { exact: false }).first()).toBeVisible();
    };

    test('the info icon shows all four definitions (LEA-6491)', { tag: '@sanity' }, async ({ page }) => {
        await openReadingLog(page);

        // The tooltip spreads data-test onto the trigger it wraps, so this is one element rather
        // than a parent and a child.
        await page.getByTestId('reading-mode-info').first().hover();

        await expectAllFourDefinitions(page);
    });

    test('the definitions are reachable without a mouse', { tag: '@sanity' }, async ({ page }) => {
        await openReadingLog(page);

        await page.getByTestId('reading-mode-info').first().focus();

        await expectAllFourDefinitions(page);
    });

    test('the cards are one tab stop, and arrow keys move and choose', { tag: '@sanity' }, async ({ page }) => {
        await openReadingLog(page);
        await chooseToday(page);

        const card = (dataTest: string) => page.getByTestId(dataTest).first();

        await expect(card(MODE_CARDS[0])).toHaveAttribute('tabindex', '0');
        for (const dataTest of MODE_CARDS.slice(1)) {
            await expect(card(dataTest)).toHaveAttribute('tabindex', '-1');
        }

        await card(MODE_CARDS[0]).focus();
        await page.keyboard.press('ArrowRight');

        await expect(card('listened-together-card')).toHaveAttribute('aria-checked', 'true');
        await expect(card('read-independently-card')).toHaveAttribute('aria-checked', 'false');

        await expect(card('listened-together-card')).toHaveAttribute('tabindex', '0');
        await expect(card('read-independently-card')).toHaveAttribute('tabindex', '-1');

        await page.keyboard.press('ArrowRight');
        await expect(card('read-aloud-card')).toHaveAttribute('aria-checked', 'true');

        await page.keyboard.press('ArrowLeft');
        await expect(card('listened-together-card')).toHaveAttribute('aria-checked', 'true');

        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await expect(card('read-in-the-real-world-card')).toHaveAttribute('aria-checked', 'true');

        await card('read-aloud-card').focus();
        await page.keyboard.press(' ');
        await expect(card('read-aloud-card')).toHaveAttribute('aria-checked', 'true');

        // Tab must leave the group entirely. The tabindex attributes above are not enough on their
        // own: the selected card holds a radio whose own input would otherwise be a second stop.
        await page.keyboard.press('Tab');
        await expect(page.locator('.reading-mode-card-container :focus')).toHaveCount(0);

        await expect(page.getByTestId('book-name-input').first()).toBeVisible();
        await page.getByTestId('school-book-card').first().click();
        await page.getByTestId('book-name-input').first().fill('Keyboard Chosen Book');
        await page.locator('input[name="finishedBook"][value="true"]').first().check();
        await page.getByTestId('comment-card').first().click();
        await page.getByTestId('comment-input').first().fill('Chosen with the keyboard.');
        await page.locator('input[name="shareWithTeacher"]').first().check();
        await page.getByTestId('submit-reading-log-button').first().click();
        await expect(page.getByText('Reading entry has been added').first()).toBeVisible({ timeout: 30000 });

        expect((await savedEntry('Keyboard Chosen Book')).readingMode).toBe(ReadingMode.READ_ALOUD);
    });

    test('an entry needs a book source, and only same-mode books are suggested', { tag: '@sanity' }, async ({ page }) => {
        await fixture.seedEntry({ bookName: 'Legacy Owl Book', readingType: ReadingBookOptions.OWN_BOOK, bookReadAt: null });
        await fixture.seedEntry({
            bookName: 'Aloud Fox Book',
            readingMode: ReadingMode.READ_ALOUD,
            readingType: ReadingBookOptions.SCHOOL_BOOK,
            bookReadAt: null
        });
        // Logged a different way, which is the case the feature is named for. Without this the test
        // would only prove that books carrying no way of reading are left out.
        await fixture.seedEntry({
            bookName: 'Together Badger Book',
            readingMode: ReadingMode.LISTENED_TOGETHER,
            readingType: ReadingBookOptions.SCHOOL_BOOK,
            bookReadAt: null
        });

        await openReadingLog(page);
        await chooseToday(page);

        await page.getByTestId('read-aloud-card').first().click();
        await expect(page.getByTestId('school-book-card').first()).toBeVisible();
        await expect(page.getByTestId('own-book-card').first()).toBeVisible();
        await expect(page.getByTestId('something-else-card').first()).toBeVisible();
        await expect(page.getByTestId('book-name-input').first()).toBeVisible();

        await page.getByTestId('submit-reading-log-button').first().click();
        await expect(page.getByText('Please choose what you are reading.').first()).toBeVisible();

        await page.getByTestId('something-else-card').first().click();
        await expect(page.getByText('Did you finish this book?')).toHaveCount(0);

        await page.getByTestId('school-book-card').first().click();
        await expect(page.getByText('Did you finish this book?').first()).toBeVisible();
        await expect(
            page.locator('.reading-optional-heading', { hasText: 'Did you finish this book?' }).getByText('(optional)')
        ).toBeVisible();
        await expect(page.locator('.suggested-books-card', { hasText: 'Aloud Fox Book' }).first()).toBeVisible();
        await expect(page.locator('.suggested-books-card', { hasText: 'Together Badger Book' })).toHaveCount(0);
        await expect(page.locator('.suggested-books-card', { hasText: 'Legacy Owl Book' })).toHaveCount(0);

        await page.getByTestId('book-name-input').first().fill('Fox');
        await expect(page.locator('.suggested-books-card', { hasText: 'Aloud Fox Book' }).first()).toBeVisible();

        await page.getByTestId('book-name-input').first().fill('Required Chips Book');
        await page.locator('input[name="finishedBook"][value="true"]').first().check();
        await page.getByTestId('comment-card').first().click();
        await page.getByTestId('comment-input').first().fill('We read before bed.');
        await page.locator('input[name="shareWithTeacher"]').first().check();
        await page.getByTestId('submit-reading-log-button').first().click();
        await expect(page.getByText('Reading entry has been added').first()).toBeVisible({ timeout: 30000 });

        expect(await savedEntry('Required Chips Book')).toMatchObject({
            readingType: ReadingBookOptions.SCHOOL_BOOK,
            readingMode: ReadingMode.READ_ALOUD,
            isBookFinished: true
        });
    });

    test('real-world reading hides the book questions and saves no page number (LEA-6489)', { tag: '@sanity' }, async ({ page }) => {
        await openReadingLog(page);
        await chooseToday(page);

        await page.getByTestId('read-aloud-card').first().click();
        await page.getByTestId('school-book-card').first().click();
        await expect(page.getByText('Did you finish this book?').first()).toBeVisible();

        await page.getByTestId('read-in-the-real-world-card').first().click();
        await expect(page.getByText('Did you finish this book?')).toHaveCount(0);
        await expect(page.getByText('What are you reading?')).toHaveCount(0);
        await expect(page.getByTestId('school-book-card')).toHaveCount(0);
        await expect(page.getByTestId('book-name-input').first()).toBeVisible();

        await page.getByTestId('read-aloud-card').first().click();
        await expect(page.getByText('Did you finish this book?').first()).toBeVisible();
        await expect(page.getByTestId('school-book-card').first()).toHaveClass(/active/);
        await page.locator('input[name="finishedBook"][value="false"]').first().check();
        await expect(page.locator('input[name="pageNumber"]').first()).toBeVisible();
        await page.locator('input[name="pageNumber"]').first().fill('12');

        await page.getByTestId('book-name-input').first().fill('Road Signs Of Britain');
        await page.getByTestId('comment-card').first().click();
        await page.getByTestId('comment-input').first().fill('We read the signs on the walk to school.');

        await page.getByTestId('read-in-the-real-world-card').first().click();
        await expect(page.locator('input[name="pageNumber"]')).toHaveCount(0);
        await expect(page.getByTestId('school-book-card')).toHaveCount(0);

        await page.locator('input[name="shareWithTeacher"]').first().check();
        await page.getByTestId('submit-reading-log-button').first().click();
        await expect(page.getByText('Reading entry has been added').first()).toBeVisible({ timeout: 30000 });

        expect(await savedEntry('Road Signs Of Britain')).toMatchObject({
            readingMode: ReadingMode.READ_IN_REAL_WORLD,
            readingType: ReadingBookOptions.SOMETHING_ELSE,
            pageNumber: null,
            isBookFinished: null
        });
    });

    test('says which day is missing rather than failing with a generic error', { tag: '@sanity' }, async ({ page }) => {
        await openReadingLog(page);

        await page.getByTestId('read-independently-card').first().focus();
        await page.keyboard.press(' ');

        await expect(page.getByTestId('book-name-input').first()).toBeVisible();
        await page.getByTestId('school-book-card').first().click();
        await page.getByTestId('book-name-input').first().fill('No Day Chosen Book');
        await page.getByTestId('comment-card').first().click();
        await page.getByTestId('comment-input').first().fill('Submitted without picking a day.');

        await page.getByTestId('submit-reading-log-button').first().click();

        await expect(page.getByTestId('reading-day-error')).toContainText('Please choose which day this reading was on.');
        await expect(page.getByText('Unexpected error', { exact: false })).toHaveCount(0);

        const saved = await db.selectFrom('lwp_pupil_feedback').where('bookName', '=', 'No Day Chosen Book').select(['id']).execute();

        expect(saved).toHaveLength(0);
    });
});
