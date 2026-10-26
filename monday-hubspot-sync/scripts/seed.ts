#!/usr/bin/env tsx
/**
 * Combined Seed Script for Monday.com and HubSpot
 *
 * Creates test data in both platforms for manual and programmatic testing.
 *
 * Usage:
 *   npx tsx scripts/seed.ts --hubspot 10 --monday 10
 *   npx tsx scripts/seed.ts -h 5 -m 5
 *   npx tsx scripts/seed.ts --hubspot 10 --monday 10 --prefix "Demo"
 *   npx tsx scripts/seed.ts --cleanup  # Remove all seeded test data from both platforms
 */

import { faker } from '@faker-js/faker';
import * as hubspot from '@hubspot/api-client';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/companies';
import axios from 'axios';

import { createCompanyInHubSpot, createContactInHubSpot } from '../hubspotService';
import { createMondayItemWithContacts } from '../mondayService';
import type { SchoolData, MainContact, MondayApiResponse, MondayItem } from '../types';
import { type AppConfig, createAppConfig } from '../config';

interface SeedOptions {
    hubspotCount: number;
    mondayCount: number;
    prefix: string;
    cleanup: boolean;
    boardId: string;
}

interface SeedResult {
    hubspot: {
        created: number;
        failed: number;
    };
    monday: {
        created: number;
        failed: number;
    };
}

// TODO: use a small library to parse args
function parseArgs(appConfig: AppConfig): SeedOptions {
    const args = process.argv.slice(2);
    const options: SeedOptions = {
        hubspotCount: 0,
        mondayCount: 0,
        prefix: '[SEED]',
        cleanup: false,
        boardId: appConfig.monday.schoolsBoardId
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        if (arg === '--hubspot' || arg === '-h') {
            const count = parseInt(nextArg, 10);
            if (isNaN(count) || count < 0) {
                console.error('Error: --hubspot must be a non-negative integer');
                process.exit(1);
            }
            options.hubspotCount = count;
            i++;
        } else if (arg === '--monday' || arg === '-m') {
            const count = parseInt(nextArg, 10);
            if (isNaN(count) || count < 0) {
                console.error('Error: --monday must be a non-negative integer');
                process.exit(1);
            }
            options.mondayCount = count;
            i++;
        } else if (arg === '--count' || arg === '-n') {
            // Convenience option to set both counts at once
            const count = parseInt(nextArg, 10);
            if (isNaN(count) || count < 1) {
                console.error('Error: --count must be a positive integer');
                process.exit(1);
            }
            options.hubspotCount = count;
            options.mondayCount = count;
            i++;
        } else if (arg === '--prefix' || arg === '-p') {
            options.prefix = nextArg || '[SEED]';
            i++;
        } else if (arg === '--cleanup' || arg === '-c') {
            options.cleanup = true;
        } else if (arg === '--board-id' || arg === '-b') {
            options.boardId = nextArg || appConfig.monday.schoolsBoardId;
            i++;
        } else if (arg === '--help') {
            printHelp();
            process.exit(0);
        }
    }

    // Default to 5 each if no counts specified and not cleanup
    if (!options.cleanup && options.hubspotCount === 0 && options.mondayCount === 0) {
        options.hubspotCount = 5;
        options.mondayCount = 5;
    }

    return options;
}

function printHelp(): void {
    console.log(`
Combined Seed Script - Creates test data in both Monday.com and HubSpot

Usage:
  npx tsx scripts/seed.ts [options]

Options:
  -n, --count <number>     Number of entries for BOTH platforms (default: 5)
  -h, --hubspot <number>   Number of companies to create in HubSpot
  -m, --monday <number>    Number of items to create in Monday.com
  -p, --prefix <string>    Prefix for names (default: [SEED])
  -b, --board-id <string>  Monday board ID (default: from env MONDAY_BOARD_ID)
  -c, --cleanup            Remove all seeded test data from both platforms
  --help                   Show this help message

Examples:
  npx tsx scripts/seed.ts --count 10                    # 10 entries in each platform
  npx tsx scripts/seed.ts --hubspot 5 --monday 10       # Different counts per platform
  npx tsx scripts/seed.ts -n 5 --prefix "[TEST]"        # Custom prefix
  npx tsx scripts/seed.ts --cleanup                     # Clean up all seeded data
`);
}

function generateSchoolName(prefix: string, platform: 'hubspot' | 'monday'): string {
    const schoolTypes = ['Elementary School', 'Middle School', 'High School', 'Academy', 'Preparatory School', 'Charter School'];
    const schoolType = faker.helpers.arrayElement(schoolTypes);
    const cityName = faker.location.city();
    const platformSuffix = platform === 'hubspot' ? 'HS' : 'MON';
    return `${prefix} ${cityName} ${schoolType} ${platformSuffix}`;
}

function generateContact(): MainContact {
    return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email({ provider: `${faker.word.noun()}.edu` }),
        phone: faker.phone.number({ style: 'national' })
    };
}

// ===== HubSpot Functions =====

async function seedHubspot(appConfig: AppConfig, count: number, prefix: string): Promise<{ created: number; failed: number }> {
    if (count === 0) {
        return { created: 0, failed: 0 };
    }

    console.log('\n📦 Seeding HubSpot...');
    console.log(`Creating ${count} companies with prefix "${prefix}"...\n`);

    let created = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
        const schoolName = generateSchoolName(prefix, 'hubspot');
        const mainContact = generateContact();

        const schoolData: SchoolData = {
            schoolName,
            owner: null,
            mainContact,
            // Use a fake numeric ID that looks like a real Monday item ID
            mondayUrl: `${appConfig.monday.boardBaseUrl}/boards/${appConfig.monday.schoolsBoardId}/pulses/${faker.number.int({ min: 1000000000, max: 9999999999 })}`
        };

        try {
            console.log(`  [${i + 1}/${count}] Creating: ${schoolName}`);
            const company = await createCompanyInHubSpot(appConfig, schoolData);

            if (schoolData.mainContact) {
                await createContactInHubSpot(appConfig, schoolData.mainContact, company.companyId);
            }

            console.log(`    ✓ Created: ${company.companyId}`);
            created++;
        } catch (error) {
            console.error(`    ✗ Failed:`, error instanceof Error ? error.message : 'Unknown error');
            failed++;
        }
    }

    return { created, failed };
}

async function cleanupHubspot(prefix: string): Promise<{ deleted: number; failed: number }> {
    console.log('\n🧹 Cleaning up HubSpot...');

    const hubspotClient = new hubspot.Client({
        accessToken: process.env.HUBSPOT_ACCESS_TOKEN
    });

    let deleted = 0;
    let failed = 0;

    try {
        const searchResponse = await hubspotClient.crm.companies.searchApi.doSearch({
            filterGroups: [
                {
                    filters: [
                        {
                            propertyName: 'name',
                            operator: FilterOperatorEnum.ContainsToken,
                            value: prefix
                        }
                    ]
                }
            ],
            properties: ['name'],
            limit: 100
        });

        const companies = searchResponse.results;
        console.log(`Found ${companies.length} companies to delete.\n`);

        for (const company of companies) {
            try {
                await hubspotClient.crm.companies.basicApi.archive(company.id);
                console.log(`  ✓ Deleted: ${company.properties.name} (${company.id})`);
                deleted++;
            } catch (error) {
                console.error(`  ✗ Failed to delete ${company.id}:`, error instanceof Error ? error.message : 'Unknown error');
                failed++;
            }
        }
    } catch (error) {
        console.error('Failed to search HubSpot:', error instanceof Error ? error.message : 'Unknown error');
    }

    return { deleted, failed };
}

// ===== Monday.com Functions =====


async function fetchBoardItems(appConfig: AppConfig, boardId: string): Promise<MondayItem[]> {
    const query = `
        query {
            boards (ids: ${boardId}) {
                items_page {
                    items {
                        id
                        name
                        column_values {
                            id
                            text
                            value
                        }
                    }
                }
            }
        }
    `;

    const response = await axios.post<MondayApiResponse>(
        appConfig.monday.apiUrl,
        { query },
        {
            headers: {
                Authorization: `Bearer ${appConfig.monday.apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (response.data.errors) {
        throw new Error('Failed to fetch board items');
    }

    return response.data.data?.boards?.[0]?.items_page?.items || [];
}

async function deleteMondayItem(appConfig: AppConfig, itemId: string): Promise<void> {
    const mutation = `
        mutation {
            delete_item (item_id: ${itemId}) {
                id
            }
        }
    `;

    await axios.post(
        appConfig.monday.apiUrl,
        { query: mutation },
        {
            headers: {
                Authorization: `Bearer ${appConfig.monday.apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );
}

async function seedMonday(appConfig: AppConfig, count: number, prefix: string, boardId: string): Promise<{ created: number; failed: number }> {
    if (count === 0) {
        return { created: 0, failed: 0 };
    }

    console.log('\n📋 Seeding Monday.com...');
    console.log(`Creating ${count} items with prefix "${prefix}" on board ${boardId}...\n`);

    let created = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
        const schoolData: SchoolData = {
            schoolName: generateSchoolName(prefix, 'monday'),
            owner: null,
            mainContact: generateContact()
        };

        try {
            console.log(`  [${i + 1}/${count}] Creating: ${schoolData.schoolName}`);
            const { schoolItemId } = await createMondayItemWithContacts(appConfig, boardId, schoolData);

            console.log(`    ✓ Created: ${schoolItemId}`);
            created++;

            // Rate limiting protection
            await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`    ✗ Failed:`, error instanceof Error ? error.message : 'Unknown error');
            failed++;
        }
    }

    return { created, failed };
}

async function cleanupMonday(appConfig: AppConfig, prefix: string, boardId: string): Promise<{ deleted: number; failed: number }> {
    console.log('\n🧹 Cleaning up Monday.com...');

    let deleted = 0;
    let failed = 0;

    try {
        const items = await fetchBoardItems(appConfig, boardId);
        const matchingItems = items.filter((item) => item.name.startsWith(prefix));

        console.log(`Found ${matchingItems.length} items to delete.\n`);

        for (const item of matchingItems) {
            try {
                await deleteMondayItem(appConfig, item.id);
                console.log(`  ✓ Deleted: ${item.name} (${item.id})`);
                deleted++;

                // Rate limiting protection
                await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`  ✗ Failed to delete ${item.id}:`, error instanceof Error ? error.message : 'Unknown error');
                failed++;
            }
        }
    } catch (error) {
        console.error('Failed to fetch Monday items:', error instanceof Error ? error.message : 'Unknown error');
    }

    return { deleted, failed };
}

// ===== Main Functions =====

async function runSeed(appConfig: AppConfig, options: SeedOptions): Promise<SeedResult> {
    console.log('='.repeat(60));
    console.log('🌱 Combined Seed Script');
    console.log('='.repeat(60));
    console.log(`HubSpot: ${options.hubspotCount} companies`);
    console.log(`Monday:  ${options.mondayCount} items`);
    console.log(`Prefix:  "${options.prefix}"`);
    console.log('='.repeat(60));

    const hubspotResult = await seedHubspot(appConfig, options.hubspotCount, options.prefix);
    const mondayResult = await seedMonday(appConfig, options.mondayCount, options.prefix, options.boardId);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Summary');
    console.log('='.repeat(60));
    console.log('HubSpot:');
    console.log(`  ✓ Created: ${hubspotResult.created}`);
    console.log(`  ✗ Failed:  ${hubspotResult.failed}`);
    console.log('Monday.com:');
    console.log(`  ✓ Created: ${mondayResult.created}`);
    console.log(`  ✗ Failed:  ${mondayResult.failed}`);
    console.log('='.repeat(60));

    return {
        hubspot: hubspotResult,
        monday: mondayResult
    };
}

async function runCleanup(appConfig: AppConfig, options: SeedOptions): Promise<void> {
    console.log('='.repeat(60));
    console.log('🧹 Combined Cleanup Script');
    console.log('='.repeat(60));
    console.log(`Prefix: "${options.prefix}"`);
    console.log('='.repeat(60));

    const hubspotResult = await cleanupHubspot(options.prefix);
    const mondayResult = await cleanupMonday(appConfig, options.prefix, options.boardId);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Summary');
    console.log('='.repeat(60));
    console.log('HubSpot:');
    console.log(`  ✓ Deleted: ${hubspotResult.deleted}`);
    console.log(`  ✗ Failed:  ${hubspotResult.failed}`);
    console.log('Monday.com:');
    console.log(`  ✓ Deleted: ${mondayResult.deleted}`);
    console.log(`  ✗ Failed:  ${mondayResult.failed}`);
    console.log('='.repeat(60));
}

async function main(): Promise<void> {
    const appConfig = createAppConfig(process.env);

    const options = parseArgs(appConfig);

    try {
        if (options.cleanup) {
            await runCleanup(appConfig, options);
        } else {
            await runSeed(appConfig, options);
        }
    } catch (error) {
        console.error('\n❌ Script failed:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}

main();


