import { getCompaniesAndContactsFromHubSpot, updateCompanyInHubSpot } from './hubspotService';
import { buildMondayItemUrl } from './helpers';
import { createMondayItemWithContacts, updateHubspotFieldsInMonday, fetchBoardWithItems } from './mondayService';
import type { AppConfig } from './config';
import { hubspotToSchoolData, mondayItemToSchoolData } from './types';
import type { SchoolData, SyncSummary, MondayItem } from './types';

/**
 * Result of HubSpot → Monday sync operation
 */
export interface HubSpotToMondaySyncResult {
    summary: SyncSummary;
    updatedCount: number;
}

/**
 * Syncs HubSpot companies to Monday.com
 * - Creates new items in Monday for companies without Monday URLs
 * - Updates existing Monday items with HubSpot IDs/URLs (backfill)
 *
 * @param schoolsToBackfill - Optional array of schools that were just synced to HubSpot
 *                            and need their HubSpot IDs written back to Monday
 */
export async function syncHubSpotToMonday(appConfig: AppConfig, schoolsToBackfill?: SchoolData[]): Promise<HubSpotToMondaySyncResult> {
    try {
        console.log('='.repeat(60));
        console.log('Starting HubSpot → Monday.com Sync');
        console.log('='.repeat(60));

        // Fetch HubSpot companies
        console.log('\n📋 Fetching HubSpot companies...');
        const hubspotCompanies = await getCompaniesAndContactsFromHubSpot(appConfig);
        console.log(`✓ Found ${hubspotCompanies.length} companies in HubSpot`);

        // Filter out companies that already have Monday URLs
        const hubspotCompaniesWithoutMondayUrls = hubspotCompanies
            .filter((company) => !company.mondayUrl || company.mondayUrl.trim() === '')
            .map((company) => hubspotToSchoolData(appConfig, company))
            .filter((item): item is SchoolData => item !== null);

        console.log(`✓ Found ${hubspotCompaniesWithoutMondayUrls.length} companies without Monday URLs`);

        // Fetch all existing Monday items
        console.log('\n📋 Fetching existing Monday items...');
        const schoolsBoardId = appConfig.monday.schoolsBoardId;
        const schoolsBoard = await fetchBoardWithItems(appConfig, schoolsBoardId);
        const mondaySchoolsBoardItems = schoolsBoard.items_page.items;
        console.log(`✓ Found ${mondaySchoolsBoardItems.length} existing items in Monday`);

        console.log('\n' + '='.repeat(60));
        console.log('Processing Companies');
        console.log('='.repeat(60));

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // Process HubSpot companies without Monday URLs
        for (const company of hubspotCompaniesWithoutMondayUrls) {
            console.log(`\n 📝 Processing: "${company.schoolName}"`);
            try {
                // Check if item exists in Monday by name
                const schoolItemInMonday = mondaySchoolsBoardItems.find(
                    (item) => item.name.toLowerCase().trim() === company.schoolName.toLowerCase().trim()
                );

                if (schoolItemInMonday) {
                    console.log(`Found existing item in Monday (ID: ${schoolItemInMonday.id})`);
                    // Merge HubSpot data with existing Monday item
                    const schoolData = mondayItemToSchoolData(appConfig, schoolItemInMonday, schoolsBoardId);
                    schoolData.hubspotCompanyId = company.hubspotCompanyId;
                    schoolData.hubspotCompanyUrl = company.hubspotCompanyUrl;

                    await updateHubspotFieldsInMonday(appConfig, schoolsBoardId, schoolData);
                    console.log(`  ✓ Updated Monday item with HubSpot fields`);

                    // Add monday Url if doesn't exist
                    if (company.hubspotCompanyId && schoolData.mondayUrl) {
                        console.log(`  ↩ Backfilling Monday URL to HubSpot...`);
                        await updateCompanyInHubSpot(appConfig, company.hubspotCompanyId, {
                            ...company,
                            mondayUrl: schoolData.mondayUrl
                        });
                        console.log(`  ✓ HubSpot updated with Monday URL`);
                    }
                    updatedCount++;
                } else {
                    console.log(`  ➕ Creating new item in Monday...`);
                    const { schoolItemId } = await createMondayItemWithContacts(appConfig, schoolsBoardId, company);
                    if (schoolItemId && company.hubspotCompanyId) {
                        const mondayItemUrl = buildMondayItemUrl(appConfig, schoolsBoardId, schoolItemId);
                        console.log('  ↩ Backfilling Monday URL to Hubspot');
                        await updateCompanyInHubSpot(appConfig, company.hubspotCompanyId, {
                            ...company,
                            mondayUrl: mondayItemUrl
                        });
                        console.log(`  ✓ Created successfully`);
                        createdCount++;
                    }
                }
            } catch (error) {
                console.error(`  ✗ Error processing "${company.schoolName}":`, error instanceof Error ? error.message : 'Unknown error');
                errorCount++;
            }
        }

        // Backfill HubSpot IDs to Monday items that were just synced
        if (schoolsToBackfill && schoolsToBackfill.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('Backfilling HubSpot IDs to Monday');
            console.log('='.repeat(60));

            for (const school of schoolsToBackfill) {
                if (!school.mondayItemId || !school.hubspotCompanyId) {
                    console.log(`  ⏭ Skipping "${school.schoolName}" - missing Monday ID or HubSpot ID`);
                    skippedCount++;
                    continue;
                }

                console.log(`\n 👈 Backfilling: "${school.schoolName}"`);
                try {
                    await updateHubspotFieldsInMonday(appConfig, schoolsBoardId, school);
                    console.log(`  ✓ Updated Monday item with HubSpot fields`);
                    updatedCount++;
                } catch (error) {
                    console.error(`  ✗ Error backfilling "${school.schoolName}":`, error instanceof Error ? error.message : 'Unknown error');
                    errorCount++;
                }
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('Sync Summary');
        console.log('='.repeat(60));
        console.log(`✓ Created:  ${createdCount} new item(s) in Monday`);
        console.log(`✓ Updated:  ${updatedCount} item(s) with HubSpot fields`);
        console.log(`⏭ Skipped:  ${skippedCount} item(s)`);
        if (errorCount > 0) {
            console.log(`✗ Errors:   ${errorCount} item(s)`);
        }
        console.log('='.repeat(60));

        return {
            summary: {
                total: hubspotCompaniesWithoutMondayUrls.length + (schoolsToBackfill?.length || 0),
                created: createdCount,
                failed: errorCount,
                skipped: skippedCount
            },
            updatedCount
        };
    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('✗ Fatal Error During Sync Process');
        console.error('='.repeat(60));
        console.error(error instanceof Error ? error.message : 'Unknown error occurred');
        throw error;
    }
}

export default syncHubSpotToMonday;
