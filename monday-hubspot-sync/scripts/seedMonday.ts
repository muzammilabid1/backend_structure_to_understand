#!/usr/bin/env tsx
/**
 * Seed script for Monday.com
 *
 * Creates test school items on a Monday.com board for manual and programmatic testing.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/seedMonday.ts --count 10
 *   node --env-file=.env --import tsx scripts/seedMonday.ts -n 5
 *   node --env-file=.env --import tsx scripts/seedMonday.ts --count 10 --prefix "Demo"
 *   node --env-file=.env --import tsx scripts/seedMonday.ts --cleanup  # Remove all seeded test data
 */

import axios from 'axios';
import { faker } from '@faker-js/faker';

import { type AppConfig, createAppConfig } from '../config';
import { createMondayItemWithContacts } from '../mondayService';
import type { MondayMutationResponse, MondayApiResponse, MondayItem, SchoolData, MainContact } from '../types';

interface SeedOptions {
    count: number;
    prefix: string;
    cleanup: boolean;
    boardId: string;
}

interface SeededItem {
    itemId: string;
    itemName: string;
}

// TODO: use a small library to parse args
function parseArgs(appConfig: AppConfig): SeedOptions {
    const args = process.argv.slice(2);
    const options: SeedOptions = {
        count: 5,
        prefix: '[SEED]',
        cleanup: false,
        boardId: appConfig.monday.schoolsBoardId
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        if (arg === '--count' || arg === '-n') {
            const count = parseInt(nextArg, 10);
            if (isNaN(count) || count < 1) {
                console.error('Error: --count must be a positive integer');
                process.exit(1);
            }
            options.count = count;
            i++;
        } else if (arg === '--prefix' || arg === '-p') {
            options.prefix = nextArg || '[SEED]';
            i++;
        } else if (arg === '--cleanup' || arg === '-c') {
            options.cleanup = true;
        } else if (arg === '--board-id' || arg === '-b') {
            options.boardId = nextArg || appConfig.monday.schoolsBoardId;
            i++;
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    return options;
}

function printHelp(): void {
    console.log(`
Monday.com Seed Script - Creates test school items on a board

Usage:
  npx tsx scripts/seedMonday.ts [options]

Options:
  -n, --count <number>     Number of items to create (default: 5)
  -p, --prefix <string>    Prefix for item names (default: [SEED])
  -b, --board-id <string>  Board ID to use (default: from env MONDAY_BOARD_ID)
  -c, --cleanup            Remove all seeded test data with the prefix
  -h, --help               Show this help message

Examples:
  npx tsx scripts/seedMonday.ts --count 10
  npx tsx scripts/seedMonday.ts -n 5 --prefix "[TEST]"
  npx tsx scripts/seedMonday.ts --cleanup
`);
}

function generateSchoolName(prefix: string): string {
    const schoolTypes = ['Elementary', 'Middle School', 'High School', 'Academy', 'Prep', 'Charter'];
    const schoolType = faker.helpers.arrayElement(schoolTypes);
    const cityName = faker.location.city();
    return `${prefix} ${cityName} ${schoolType}`;
}

function generateContact(): MainContact {
    return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email({ provider: 'seed-test.example.com' }),
        phone: null
    };
}

function generateSchoolData(prefix: string): SchoolData {
    return {
        schoolName: generateSchoolName(prefix),
        owner: null,
        mainContact: generateContact()
    };
}


async function deleteMondayItem(appConfig: AppConfig, itemId: string): Promise<void> {
    const mutation = `
        mutation {
            delete_item (item_id: ${itemId}) {
                id
            }
        }
    `;

    try {
        const response = await axios.post<{ data: MondayMutationResponse; errors?: Array<{ message: string }> }>(
            appConfig.monday.apiUrl,
            { query: mutation },
            {
                headers: {
                    Authorization: `Bearer ${appConfig.monday.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.errors) {
            throw new Error(response.data.errors.map((e) => e.message).join(', '));
        }
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.errors) {
            throw new Error(error.response.data.errors.map((e: { message: string }) => e.message).join(', '));
        }
        throw error;
    }
}

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

    try {
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

        const boards = response.data.data?.boards;
        if (!boards || boards.length === 0) {
            throw new Error('No board found');
        }

        return boards[0].items_page.items;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error fetching board items:', error.message);
        }
        throw error;
    }
}

async function seedMonday(appConfig: AppConfig, options: SeedOptions): Promise<SeededItem[]> {
    console.log('='.repeat(60));
    console.log('🌱 Monday.com Seed Script');
    console.log('='.repeat(60));
    console.log(`Creating ${options.count} items with prefix "${options.prefix}" on board ${options.boardId}...\n`);

    const seededItems: SeededItem[] = [];

    for (let i = 0; i < options.count; i++) {
        const schoolData = generateSchoolData(options.prefix);

        try {
            console.log(`[${i + 1}/${options.count}] Creating: ${schoolData.schoolName}`);

            const { schoolItemId } = await createMondayItemWithContacts(appConfig, options.boardId, schoolData);

            seededItems.push({
                itemId: schoolItemId,
                itemName: schoolData.schoolName
            });
            console.log(`  ✓ Item created: ${schoolItemId}`);

            // Add small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`  ✗ Failed to create "${schoolData.schoolName}":`, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Seed Summary');
    console.log('='.repeat(60));
    console.log(`✓ Items created: ${seededItems.length}/${options.count}`);
    console.log(`📋 Board ID: ${options.boardId}`);
    console.log('='.repeat(60));

    return seededItems;
}

async function cleanupMonday(appConfig: AppConfig, options: SeedOptions): Promise<void> {
    console.log('='.repeat(60));
    console.log('🧹 Monday.com Cleanup Script');
    console.log('='.repeat(60));
    console.log(`Searching for items with prefix "${options.prefix}" on board ${options.boardId}...\n`);

    try {
        const items = await fetchBoardItems(appConfig, options.boardId);

        // Filter items that match the prefix
        const matchingItems = items.filter((item) => item.name.startsWith(options.prefix));

        console.log(`Found ${matchingItems.length} items to delete.\n`);

        if (matchingItems.length === 0) {
            console.log('No seeded items found. Nothing to clean up.');
            return;
        }

        let deletedCount = 0;
        for (const item of matchingItems) {
            try {
                await deleteMondayItem(appConfig, item.id);
                console.log(`✓ Deleted item: ${item.name} (${item.id})`);
                deletedCount++;

                // Add small delay to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`✗ Failed to delete item ${item.id}:`, error instanceof Error ? error.message : 'Unknown error');
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Cleanup Summary');
        console.log('='.repeat(60));
        console.log(`✓ Items deleted: ${deletedCount}/${matchingItems.length}`);
        console.log('='.repeat(60));
    } catch (error) {
        console.error('Failed to fetch board items:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
    }
}

async function main(): Promise<void> {
    const appConfig = createAppConfig(process.env);

    const options = parseArgs(appConfig);

    try {
        if (options.cleanup) {
            await cleanupMonday(appConfig, options);
        } else {
            await seedMonday(appConfig, options);
        }
    } catch (error) {
        console.error('\n❌ Script failed:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}

main();


