import { test, expect, Locator, Page } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    englishDomainId,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateTopicName,
    generateUserEmail,
    password
} from './constants';
import {
    acceptFeatureTooltipPrompt,
    adminOrTeacherSignOut,
    createSchoolAndDummyWondeData,
    formatDate,
    login,
    waitForLoading
} from './utils';
import { UserStatus } from 'lwp-shared';

/**
 * The two digital-checklist step types are rendered by one component with two branches, and each branch
 * persists a pupil's ticks into `lwp_pupil_activity.context` in a DIFFERENT shape:
 *
 *   DIGITAL_CHECKLIST           -> [false, true, false]        bare booleans, matched back by POSITION
 *   TEXT_ONLY_DIGITAL_CHECKLIST -> [{ key, checked }, ...]     matched back by the item's own KEY
 *
 * Both shapes are already stored against real pupils, so neither can be changed or unified without
 * silently discarding every tick those pupils have made. That is what this spec exists to pin down: it
 * ticks a box of each kind, asserts the exact shape that reached the database, then reloads to prove the
 * restore path reads that shape back.
 */

/** Captions for the image checklist, in the order they are seeded (position IS the identity here). */
const IMAGE_CAPTIONS = ['Birds chirping', 'Leaves rustling', 'Cars zooming'];

/** Text checklist items. The keys are opaque ids the admin editor generates; position must not matter. */
const TEXT_ITEMS = [
    { key: 'q7nZN2UFpd9RzcMmPXCUC', listItem: 'Has a Latin root' },
    { key: 'bszbKS2mm4UidWMVKQJi_', listItem: 'Is a noun and a verb' },
    { key: '98N_M5XmPRAyigRY26mhO', listItem: 'Starts with a double letter' }
];

const TEXT_HEADING = 'Word checklist';
const TEXT_DESCRIPTION = 'In your dictionary, find a word that:';

const IMAGE_STEP = '[data-test="activity-step-DIGITAL_CHECKLIST"]';
const TEXT_STEP = '[data-test="activity-step-TEXT_ONLY_DIGITAL_CHECKLIST"]';

test.describe('Digital checklist activity steps', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Both checklist kinds render read-only for staff, then tick and persist for a parent', async ({ page }) => {
        const seed = await seedChecklistActivity(db, utils);

        // Scenario 1: the preview page renders both step types through CommonActivityPreview with readOnly
        // set and no pupil context at all, so the boxes show but refuse to tick.
        await login(page, seed.leaderEmail, password);
        await waitForLoading(page);
        await page.goto(`/previewactivity/${seed.activityId}`);
        await waitForLoading(page);

        await expect(page.locator(IMAGE_STEP).getByRole('checkbox', { name: IMAGE_CAPTIONS[0] })).toBeVisible();
        await expect(page.locator(TEXT_STEP).getByRole('checkbox', { name: TEXT_ITEMS[0].listItem })).toBeVisible();

        // The two variants refuse the tick by different means, and both are worth pinning down. The image
        // card stays clickable and its handler declines; the text row is switched off in CSS, so the click
        // never lands at all (bound the timeout - an inert target would otherwise stall for the full
        // 10-minute test budget).
        await page.locator(IMAGE_STEP).getByRole('checkbox', { name: IMAGE_CAPTIONS[0] }).click({ timeout: 10_000 });
        await expect(page.locator(TEXT_STEP).locator('.dictionaryCheckbox').first()).toHaveCSS('pointer-events', 'none');
        await expect(page.locator(TEXT_STEP).getByRole('checkbox', { name: TEXT_ITEMS[0].listItem })).not.toBeChecked();

        // Nothing was saved, which is the actual contract here - had the handler run it would have fired
        // the updateActivityContext mutation and left a row behind.
        //
        // Deliberately NOT asserted: that the image box stays visually unticked. It does not. Image
        // checklist items carry no `checked` key until a context exists, so the box renders with
        // checked={undefined}, which React treats as uncontrolled - the DOM toggles on click and nothing
        // ever resets it. A pre-existing bug (a preview shows ticks that were never stored), untouched by
        // this merge and left for its own ticket.
        expect(await readActivityContext(db, seed.pupilActivityId)).toEqual({});

        await adminOrTeacherSignOut(page);

        // The pupil topic is seeded with watchedVideo=true, so the activities are already unlocked and the
        // page opens directly - the lock/unlock gate is covered by pupil-activity-feedbacks-and-rationale.
        await login(page, seed.parentEmail, password);
        await waitForLoading(page);
        await acceptFeatureTooltipPrompt(page);
        await page.goto(`/activity/${seed.pupilActivityId}`);
        await waitForLoading(page);

        const imageStep = page.locator(IMAGE_STEP);
        const textStep = page.locator(TEXT_STEP);

        // Scenario 2: each variant renders its own content. Image cards carry a picture and a caption; the
        // text variant leads with a heading and description that the image variant does not have at all.
        await expect(imageStep).toBeVisible();
        await expect(textStep).toBeVisible();
        for (const caption of IMAGE_CAPTIONS) {
            await expect(imageStep.getByRole('checkbox', { name: caption })).toBeVisible();
        }
        await expect(imageStep.locator('img.digital-checklist-image')).toHaveCount(IMAGE_CAPTIONS.length);
        await expect(textStep.getByText(TEXT_HEADING)).toBeVisible();
        await expect(textStep.getByText(TEXT_DESCRIPTION)).toBeVisible();
        for (const { listItem } of TEXT_ITEMS) {
            await expect(textStep.getByRole('checkbox', { name: listItem })).toBeVisible();
        }

        // Scenario 3: tick the SECOND item of the image list. Second, not first, so a shape that collapses
        // to "something was ticked" or loses the position still fails.
        //
        // The untouched entries come out as null, not false: neither the admin editor nor the backend puts
        // a `checked` key on image items, so on the FIRST save the untouched ones are still undefined and
        // JSON.stringify writes undefined array entries as null. The restore path treats any falsy value as
        // unticked, so this round-trips - but it is the real stored shape, and a rewrite that "tidied" it to
        // false would be changing production data.
        await tickAndWaitForSave(page, imageStep.getByRole('checkbox', { name: IMAGE_CAPTIONS[1] }));
        expect(await readActivityContext(db, seed.pupilActivityId)).toEqual({ [seed.imageStepId]: [null, true, null] });

        // Reload between the two steps' ticks. Not politeness: each step rewrites the WHOLE shared context
        // blob from the `pupilActivityContext` prop it last rendered with, and that prop only refreshes once
        // the refetched query has re-rendered the page. Ticking the second step before then builds its
        // write from stale context and drops the first step's ticks - see the note on tickAndWaitForSave.
        await page.reload();
        await waitForLoading(page);
        await expect(imageStep.getByRole('checkbox', { name: IMAGE_CAPTIONS[1] })).toBeChecked();
        await expect(imageStep.getByRole('checkbox', { name: IMAGE_CAPTIONS[0] })).not.toBeChecked();

        // Scenario 4: the text list keeps its own shape, and saving it must carry the image step's entry
        // through untouched rather than replacing the blob.
        await tickAndWaitForSave(page, textStep.getByRole('checkbox', { name: TEXT_ITEMS[1].listItem }));
        const bothSaved = await readActivityContext(db, seed.pupilActivityId);
        expect(bothSaved[seed.imageStepId]).toEqual([null, true, null]);
        expect(bothSaved[seed.textStepId]).toEqual([
            { key: TEXT_ITEMS[0].key, checked: false },
            { key: TEXT_ITEMS[1].key, checked: true },
            { key: TEXT_ITEMS[2].key, checked: false }
        ]);

        // Scenario 5: reloading proves the restore path reads both shapes back - positional for the image
        // list, key-matched for the text list.
        await page.reload();
        await waitForLoading(page);
        await expect(imageStep.getByRole('checkbox', { name: IMAGE_CAPTIONS[1] })).toBeChecked();
        await expect(imageStep.getByRole('checkbox', { name: IMAGE_CAPTIONS[0] })).not.toBeChecked();
        await expect(textStep.getByRole('checkbox', { name: TEXT_ITEMS[1].listItem })).toBeChecked();
        await expect(textStep.getByRole('checkbox', { name: TEXT_ITEMS[0].listItem })).not.toBeChecked();

        // Scenario 6: a further tick goes down the "context already exists" branch - the one every returning
        // pupil hits. The restore has now given every image item a real boolean, so the nulls are gone.
        await tickAndWaitForSave(page, imageStep.getByRole('checkbox', { name: IMAGE_CAPTIONS[2] }));
        const thirdSave = await readActivityContext(db, seed.pupilActivityId);
        expect(thirdSave[seed.imageStepId]).toEqual([false, true, true]);
        expect(thirdSave[seed.textStepId]).toEqual([
            { key: TEXT_ITEMS[0].key, checked: false },
            { key: TEXT_ITEMS[1].key, checked: true },
            { key: TEXT_ITEMS[2].key, checked: false }
        ]);
    });
});

/**
 * Ticks a box and waits for the save to have fully landed - both the mutation AND the getPupilActivity
 * refetch it triggers.
 *
 * Waiting for the refetch is not belt-and-braces, it is required. Every checklist step on the page shares
 * one `context` blob, and each save rewrites the WHOLE blob from the `pupilActivityContext` prop that step
 * last rendered with. Tick a second step before the refetch has delivered the first step's save and the
 * second write is built from stale context, silently dropping the first step's ticks. A human is far slower
 * than the refetch so this does not bite in practice, but a test clicks instantly and would flake.
 */
const tickAndWaitForSave = async (page: Page, box: Locator): Promise<void> => {
    const isOperation = (postData: string | null, name: string) => postData?.includes(`"operationName":"${name}"`) ?? false;
    const graphql = (name: string) =>
        page.waitForResponse(
            (resp) => resp.url().endsWith('/graphql') && resp.status() === 200 && isOperation(resp.request().postData(), name),
            { timeout: 60_000 }
        );

    const saved = graphql('updateActivityContext');
    const refetched = graphql('getPupilActivity');

    await box.click();
    await saved;
    await refetched;
};

/** Reads `lwp_pupil_activity.context` back as a plain object, whichever way the driver hands over jsonb. */
const readActivityContext = async (db: Kysely<Schema.DB>, pupilActivityId: string): Promise<Record<string, unknown>> => {
    const row = await db
        .selectFrom('lwp_pupil_activity')
        .where('id', '=', pupilActivityId)
        .select('context')
        .executeTakeFirstOrThrow();

    if (row.context === null || row.context === undefined) return {};

    return (typeof row.context === 'string' ? JSON.parse(row.context) : row.context) as Record<string, unknown>;
};

/**
 * Seeds an active school + parent/pupil/class with a released topic holding one LEGACY activity that has
 * both checklist step types on it, plus the pupil activity the parent opens.
 *
 * The step payloads are stored the way the admin editor stores them: `checklistImageData` as a JSON string
 * in a varchar column, `checkListTextData` as a real object in a jsonb column.
 *
 * The seeded `imageUrl`s deliberately point at files that are not in MinIO. The backend rewrites them into
 * public URLs that 404, so the cards render a broken-image icon - which is all this spec needs, since it
 * asserts on the captions and the tick state, never on the picture itself.
 */
const seedChecklistActivity = async (db: Kysely<Schema.DB>, utils: ReturnType<typeof createUtils>) => {
    const releaseDate = formatDate(new Date(), '-');
    const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id']).executeTakeFirstOrThrow();
    const currentPeriod = await db
        .selectFrom('static_lwp_period')
        .where('isCurrentPeriod', '=', true)
        .select('index')
        .executeTakeFirstOrThrow();

    const leaderFirstName = generateFirstName();
    const leaderLastName = generateLastName();
    const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);

    const { parent, pupil, class: schoolClass } = await createSchoolAndDummyWondeData(
        db,
        utils,
        {
            school: {
                name: `${generateSchoolName()} School`,
                numOfFullProgrammeClassesAllowed: 10,
                numOfTotalClassesAllowed: 30,
                enableAddClasses: true,
                isMoneySkillsAvailable: false,
                isReadyTeddyAvailable: false,
                isFutureAcademicYear: false
            },
            leader: {
                firstname: leaderFirstName,
                lastname: leaderLastName,
                email: leaderEmail,
                userStatus: UserStatus.ACTIVE,
                addTooltip: true
            }
        },
        { active: true, classLicences: { IsReadingLogsEnabled: false, isFullProgramme: true, isReadyTeddyEnabled: false } }
    );

    if (!parent?.email || !pupil?.id || !schoolClass?.id) throw new Error('Expected an active parent, pupil and class to be seeded');

    const staticTopic = await utils.createStaticTopic({
        isReading: false,
        teacherTopicName: `${generateTopicName()} Topic`,
        parentTopicName: `${generateTopicName()} Topic`,
        isPublished: true,
        video: '605069004',
        logCreatedById: user.id,
        logUpdatedById: user.id
    });
    await db
        .insertInto('static_lwp_topic_domain_year_group')
        .values({ domainId: englishDomainId, topicId: staticTopic.id, yearGroupId: '0' })
        .executeTakeFirstOrThrow();

    const activity = await utils.createStaticActivity({
        name: `Checklist ${generateLastName()}`,
        welcomeMessage: 'Welcome to this activity',
        activityType: 'LEGACY',
        order: 1,
        topicId: staticTopic.id,
        logCreatedById: user.id,
        logUpdatedById: user.id
    });

    const imageStep = await utils.createActivityStep({
        activityId: activity.id,
        stepType: 'DIGITAL_CHECKLIST',
        order: 1,
        checklistImageData: JSON.stringify(
            IMAGE_CAPTIONS.map((caption, index) => ({
                imageUrl: `checklist-${index}.png`,
                caption,
                fileName: caption,
                fileIdentifier: `checklist-${index}`
            }))
        )
    });
    const textStep = await utils.createActivityStep({
        activityId: activity.id,
        stepType: 'TEXT_ONLY_DIGITAL_CHECKLIST',
        order: 2,
        checkListTextData: {
            heading: TEXT_HEADING,
            description: TEXT_DESCRIPTION,
            checkList: TEXT_ITEMS.map((item) => ({ ...item, checked: false }))
        }
    });

    // Release the topic already unlocked, so the activity page opens directly. The topic page gates on
    // `(!watchedVideo || !silverStars)`, and unlockTopicActivities does nothing but set silverStars to 1,
    // so this is exactly the state a parent reaches after watching the video and pressing Unlock.
    const classTopic = await utils.createClassTopic(schoolClass.id, { topicId: staticTopic.id, releaseDate, released: true });
    const pupilTopic = await utils.createPupilTopic({
        releaseDate,
        pupilId: pupil.id,
        classTopicId: classTopic.id,
        topicId: staticTopic.id,
        watchedVideo: true,
        periodIndex: currentPeriod.index,
        silverStars: 1,
        earnedGoldStar: false
    });
    const pupilActivity = await utils.createPupilActivity({
        pupilId: pupil.id,
        topicId: pupilTopic.id,
        activityId: activity.id,
        earnedStar: false
    });

    return {
        parentEmail: parent.email,
        leaderEmail,
        activityId: activity.id,
        pupilActivityId: pupilActivity.id,
        imageStepId: imageStep.id,
        textStepId: textStep.id
    };
};
