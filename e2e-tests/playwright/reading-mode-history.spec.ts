import type { Schema } from '@lwp/postgres-client';
import { expect, test } from '@playwright/test';
import { type Kysely } from 'kysely';
import { ReadingBookOptions, ReadingMode } from 'lwp-shared';

import { password } from './constants';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { seedReadingLogParent } from './readingLogFixtures';
import { login, waitForLoading } from './utils';

test.describe('Reading history says how the child read (LEA-6495)', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(() => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('names the way of reading, and leaves older entries as they were', { tag: '@sanity' }, async ({ page }) => {
        test.setTimeout(150000);
        const fixture = await seedReadingLogParent(db, utils);

        await fixture.seedEntry({
            bookName: 'Aloud Book',
            readingMode: ReadingMode.READ_ALOUD,
            readingType: ReadingBookOptions.SCHOOL_BOOK,
            isBookFinished: true,
            loggedByParent: true
        });
        await fixture.seedEntry({ bookName: 'Together Book', readingMode: ReadingMode.LISTENED_TOGETHER });
        await fixture.seedEntry({ bookName: 'Independent Book', readingMode: ReadingMode.READ_INDEPENDENTLY, loggedByParent: true });
        await fixture.seedEntry({ bookName: 'Bus Timetable', readingMode: ReadingMode.READ_IN_REAL_WORLD });
        await fixture.seedEntry({ bookName: 'Legacy Plain Book', readingType: ReadingBookOptions.OWN_BOOK, isBookFinished: true });

        await login(page, fixture.parentEmail, password);
        await waitForLoading(page);
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible({ timeout: 45000 });

        const history = page.getByTestId('reading-history-card');

        await expect(history.filter({ hasText: 'Aloud Book' }).first()).toContainText('read aloud and finished');
        await expect(history.filter({ hasText: 'Independent Book' }).first()).toContainText('read independently');
        await expect(history.filter({ hasText: 'Bus Timetable' }).first()).toContainText('read in the real world');

        await expect(history.filter({ hasText: 'Together Book' }).first()).toContainText('listened together to');

        await expect(history.filter({ hasText: 'Aloud Book' }).first()).toContainText('with you');
        await expect(history.filter({ hasText: 'Independent Book' }).first()).not.toContainText('with you');

        const legacy = history.filter({ hasText: 'Legacy Plain Book' }).first();

        await expect(legacy).toContainText('read and finished');
        await expect(legacy).toContainText('own book');
    });
});
