import { syncMondayToHubSpot, getCompaniesAndContactsFromHubSpot } from './hubspotService';
import { syncHubSpotToMonday } from './syncHubspotToMonday';
import { fetchBoardWithItems } from './mondayService';
import { type AppConfig, createAppConfig, isCloudflareWorkersEnvironment } from './config';
import {
    OrchestratorOptions,
    OrchestrationResult,
    OrphanedLink,
    PotentialDuplicate,
    MondayItem,
    HubspotCompanyResultWithContacts,
    mondayItemToSchoolData,
} from './types';


/**
 * Detects orphaned links in both systems
 * An orphan is a record that references another system but the target doesn't exist
 */
export function detectOrphanedLinks(
    appConfig: AppConfig,
    mondayItems: MondayItem[],
    hubspotCompanies: HubspotCompanyResultWithContacts[]
): OrphanedLink[] {
    const orphans: OrphanedLink[] = [];

    // Create lookup sets for faster checking
    const hubspotIds = new Set(hubspotCompanies.map((c) => c.companyId));
    const mondayIds = new Set(mondayItems.map((i) => i.id));

    // Check Monday items that reference HubSpot companies that don't exist
    const boardId = appConfig.monday.schoolsBoardId;
    for (const item of mondayItems) {
        const schoolData = mondayItemToSchoolData(appConfig, item, boardId);
        if (schoolData.hubspotCompanyId && !hubspotIds.has(schoolData.hubspotCompanyId)) {
            orphans.push({
                source: 'monday',
                sourceId: item.id,
                sourceName: item.name,
                targetId: schoolData.hubspotCompanyId,
                targetSystem: 'hubspot',
                reason: `Monday item references HubSpot company ID ${schoolData.hubspotCompanyId} which does not exist`
            });
        }
    }

    // Check HubSpot companies that reference Monday items that don't exist
    for (const company of hubspotCompanies) {
        if (company.mondayUrl) {
            // Extract Monday item ID from URL (format: .../pulses/ITEM_ID)
            const match = company.mondayUrl.match(/pulses\/(\d+)/);
            if (match) {
                const mondayItemId = match[1];
                if (!mondayIds.has(mondayItemId)) {
                    orphans.push({
                        source: 'hubspot',
                        sourceId: company.companyId,
                        sourceName: company.companyName,
                        targetId: mondayItemId,
                        targetSystem: 'monday',
                        reason: `HubSpot company references Monday item ID ${mondayItemId} which does not exist`
                    });
                }
            }
        }
    }

    return orphans;
}

/**
 * Detects potential duplicates - records with same name but not linked
 * There might be multiple schools with the same name in Monday and HubSpot but not linked to each other
 * There could also be typos in the name or other variations that are not linked to each other
 */
export function detectPotentialDuplicates(
    appConfig: AppConfig,
    mondayItems: MondayItem[],
    hubspotCompanies: HubspotCompanyResultWithContacts[]
): PotentialDuplicate[] {
    const duplicates: PotentialDuplicate[] = [];

    // Get unlinked Monday items (no HubSpot ID)
    const boardId = appConfig.monday.schoolsBoardId;
    const unlinkedMondayItems = mondayItems.filter((item) => {
        const schoolData = mondayItemToSchoolData(appConfig, item, boardId);
        return !schoolData.hubspotCompanyId?.trim();
    });

    // Get unlinked HubSpot companies (no Monday URL)
    const unlinkedHubspotCompanies = hubspotCompanies.filter(
        (company) => !company.mondayUrl || company.mondayUrl.trim() === ''
    );

    // Check for name matches and email matches
    for (const mondayItem of unlinkedMondayItems) {
        const mondayName = mondayItem.name.toLowerCase().trim();
        const schoolData = mondayItemToSchoolData(appConfig, mondayItem, boardId);
        const mondayEmail = schoolData.mainContact?.email?.toLowerCase().trim() ?? '';

        for (const hubspotCompany of unlinkedHubspotCompanies) {
            const hubspotName = hubspotCompany.companyName.toLowerCase().trim();
            const hubspotEmail = hubspotCompany.contacts[0]?.email?.toLowerCase().trim();
            if (
                ((mondayName && hubspotName) && mondayName === hubspotName) ||
                ((mondayEmail && hubspotEmail) && mondayEmail === hubspotEmail)
            ) {
                duplicates.push({
                    mondayItemId: mondayItem.id,
                    mondayItemName: mondayItem.name,
                    hubspotCompanyId: hubspotCompany.companyId,
                    hubspotCompanyName: hubspotCompany.companyName,
                    confidence: 'exact'
                });
            }
        }
    }

    return duplicates;
}

/**
 * Main orchestration function for bidirectional sync
 */
export async function orchestrateSync(appConfig: AppConfig, options: OrchestratorOptions = {}): Promise<OrchestrationResult> {
    const {
        dryRun = false,
        direction = 'both',
    } = options;

    // READ_ONLY_MODE environment variable forces dry-run mode
    // used for staging env. We don't want to write data in staging mode
    const effectiveDryRun = dryRun || appConfig.readOnlyMode;

    console.log('='.repeat(60));
    console.log('Sync Orchestrator');
    console.log('='.repeat(60));
    if (appConfig.readOnlyMode) {
        console.log('Mode: READ-ONLY (environment enforced - no changes will be made)');
    } else {
        console.log(`Mode: ${effectiveDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
    }
    console.log(`Direction: ${direction}`);
    console.log('='.repeat(60));

    const result: OrchestrationResult = {
        orphanedLinks: [],
        potentialDuplicates: []
    };

    try {
        // Fetch data from both systems upfront for detection
        console.log('\n📋 Fetching data from both systems...');
        const boardId = appConfig.monday.schoolsBoardId;
        const [board, hubspotCompanies] = await Promise.all([
            fetchBoardWithItems(appConfig, boardId),
            getCompaniesAndContactsFromHubSpot(appConfig)
        ]);
        const mondayItems = board.items_page.items;
        console.log(`✓ Monday: ${mondayItems.length} items`);
        console.log(`✓ HubSpot: ${hubspotCompanies.length} companies`);

        // Detect orphaned links

        console.log('\n🔍 Checking for orphaned links...');
        result.orphanedLinks = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);
        if (result.orphanedLinks.length > 0) {
            console.log(`⚠ Found ${result.orphanedLinks.length} orphaned link(s):`);
            for (const orphan of result.orphanedLinks) {
                console.log(`  - ${orphan.source}: "${orphan.sourceName}" → ${orphan.targetSystem} ID ${orphan.targetId}`);
            }
        } else {
            console.log('✓ No orphaned links found');
        }


        // Detect potential duplicates
        console.log('\n🔍 Checking for potential duplicates...');
        result.potentialDuplicates = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);
        if (result.potentialDuplicates.length > 0) {
            console.log(`⚠ Found ${result.potentialDuplicates.length} potential duplicate(s):`);
            for (const dup of result.potentialDuplicates) {
                console.log(`  - "${dup.mondayItemName}" (Monday ID: ${dup.mondayItemId}) ↔ "${dup.hubspotCompanyName}" (HubSpot ID: ${dup.hubspotCompanyId})`);
            }
        } else {
            console.log('✓ No potential duplicates found');
        }

        // Run Monday → HubSpot sync
        if (direction === 'both' || direction === 'monday-to-hubspot') {
            console.log('\n');
            if (effectiveDryRun) {
                console.log('🔍 [DRY RUN] Would run Monday → HubSpot sync');
                // In dry run, we still report what would be synced
                const schoolsWithoutHubSpot = mondayItems.filter((item) => {
                    const schoolData = mondayItemToSchoolData(appConfig, item, boardId);
                    return !schoolData.hubspotCompanyId || schoolData.hubspotCompanyId.trim() === '';
                });
                console.log(`  Would sync ${schoolsWithoutHubSpot.length} school(s) to HubSpot`);
                result.mondayToHubspot = {
                    summary: {
                        total: schoolsWithoutHubSpot.length,
                        created: 0,
                        failed: 0,
                        skipped: schoolsWithoutHubSpot.length
                    },
                    syncedSchools: []
                };
            } else {
                result.mondayToHubspot = await syncMondayToHubSpot(appConfig);
            }
        }

        // Run HubSpot → Monday sync
        if (direction === 'both' || direction === 'hubspot-to-monday') {
            console.log('\n');
            if (effectiveDryRun) {
                console.log('🔍 [DRY RUN] Would run HubSpot → Monday sync');
                const companiesWithoutMonday = hubspotCompanies.filter(
                    (c) => !c.mondayUrl || c.mondayUrl.trim() === ''
                );
                console.log(`  Would sync ${companiesWithoutMonday.length} company(ies) to Monday`);

                // Also report backfill from previous step
                if (result.mondayToHubspot?.syncedSchools.length) {
                    console.log(`  Would backfill ${result.mondayToHubspot.syncedSchools.length} HubSpot ID(s) to Monday`);
                }

                result.hubspotToMonday = {
                    summary: {
                        total: companiesWithoutMonday.length,
                        created: 0,
                        failed: 0,
                        skipped: companiesWithoutMonday.length
                    },
                    updatedCount: 0
                };
            } else {
                // Pass synced schools for backfill if we just ran Monday → HubSpot
                const schoolsToBackfill = result.mondayToHubspot?.syncedSchools;
                result.hubspotToMonday = await syncHubSpotToMonday(appConfig, schoolsToBackfill);
            }
        }

        // Final summary
        console.log('\n' + '='.repeat(60));
        console.log('Orchestration Complete');
        console.log('='.repeat(60));

        if (result.mondayToHubspot) {
            console.log(`Monday → HubSpot: ${result.mondayToHubspot.summary.created} created, ${result.mondayToHubspot.summary.failed} failed`);
        }
        if (result.hubspotToMonday) {
            console.log(`HubSpot → Monday: ${result.hubspotToMonday.summary.created} created, ${result.hubspotToMonday.updatedCount} updated, ${result.hubspotToMonday.summary.failed} failed`);
        }
        if (result.orphanedLinks.length > 0) {
            console.log(`⚠ Orphaned links: ${result.orphanedLinks.length}`);
        }
        if (result.potentialDuplicates.length > 0) {
            console.log(`⚠ Potential duplicates: ${result.potentialDuplicates.length}`);
        }

        console.log('='.repeat(60));

        return result;
    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('✗ Fatal Error During Orchestration');
        console.error('='.repeat(60));
        console.error(error instanceof Error ? error.message : 'Unknown error occurred');
        throw error;
    }
}

/**
 * Result of parsing CLI arguments
 */
export interface ParseArgsResult {
    options: OrchestratorOptions;
    error?: string;
    showHelp?: boolean;
}

/**
 * Parse CLI arguments
 * Returns options along with any errors or help request
 */
export function parseArgs(args: string[]): ParseArgsResult {
    const options: OrchestratorOptions = {
        dryRun: false,
        direction: 'both',
        detectOrphans: true,
        detectDuplicates: true
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--dry-run':
            case '-d':
                options.dryRun = true;
                break;
            case '--direction':
                const dir = args[++i];
                if (dir === 'monday-to-hubspot' || dir === 'hubspot-to-monday' || dir === 'both') {
                    options.direction = dir;
                } else {
                    return {
                        options,
                        error: `Invalid direction: ${dir}. Use 'monday-to-hubspot', 'hubspot-to-monday', or 'both'`
                    };
                }
                break;
            case '--help':
            case '-h':
                return { options, showHelp: true };
            default:
                return {
                    options,
                    error: `Unknown argument: ${arg}. Use --help for usage information.`
                };
        }
    }

    return { options };
}

/**
 * Get help text for CLI
 */
export function getHelpText(): string {
    return `
Sync Orchestrator - Bidirectional Monday.com ↔ HubSpot Sync

Usage:
  ts-node syncOrchestrator.ts [options]

Options:
  --dry-run, -d              Preview changes without executing
  --direction <dir>          Sync direction: 'monday-to-hubspot', 'hubspot-to-monday', or 'both' (default: both)
  --help, -h                 Show this help message

Examples:
  ts-node syncOrchestrator.ts                           # Full bidirectional sync
  ts-node syncOrchestrator.ts --dry-run                 # Preview only
  ts-node syncOrchestrator.ts --direction monday-to-hubspot  # Single direction
`;
}

/**
 * CLI entry point
 */
async function main() {
    try {
        const appConfig = createAppConfig(process.env);
        const parseResult = parseArgs(process.argv.slice(2));

        if (parseResult.showHelp) {
            console.log(getHelpText());
            process.exit(0);
        }

        if (parseResult.error) {
            console.error(parseResult.error);
            process.exit(1);
        }

        const result = await orchestrateSync(appConfig, parseResult.options);

        // Determine exit code
        const hasFailures =
            (result.mondayToHubspot?.summary.failed || 0) > 0 ||
            (result.hubspotToMonday?.summary.failed || 0) > 0;

        if (hasFailures) {
            console.log('\n⚠ Orchestration completed with some failures');
            process.exit(1);
        } else {
            console.log('\n✓ Orchestration completed successfully');
            process.exit(0);
        }
    } catch (error) {
        console.error('\n✗ Orchestration failed:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}

// Only auto-execute when run directly (not during tests or in Cloudflare Workers)
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
if (!isCloudflareWorkersEnvironment() && !isTestEnvironment) {
    main().catch((error) => {
        console.error('\n✗ Startup failed:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    });
}

