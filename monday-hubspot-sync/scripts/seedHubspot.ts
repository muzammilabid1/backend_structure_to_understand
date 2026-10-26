#!/usr/bin/env tsx
/**
 * Seed script for HubSpot
 *
 * Creates test companies and contacts in HubSpot for manual and programmatic testing.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/seedHubspot.ts --count 10
 *   node --env-file=.env --import tsx scripts/seedHubspot.ts -n 5
 *   node --env-file=.env --import tsx scripts/seedHubspot.ts --count 10 --prefix "Demo"
 *   node --env-file=.env --import tsx scripts/seedHubspot.ts --cleanup  # Remove all seeded test data
 */

import { faker } from '@faker-js/faker';
import * as hubspot from '@hubspot/api-client';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/companies';

import { type AppConfig, createAppConfig } from '../config';
import { createCompanyInHubSpot, createContactInHubSpot } from '../hubspotService';
import type { SchoolData, MainContact } from '../types';

interface SeedOptions {
    count: number;
    prefix: string;
    cleanup: boolean;
}

interface SeededCompany {
    companyId: string;
    companyName: string;
    contactIds: string[];
}

// TODO: use a small library to parse args
function parseArgs(): SeedOptions {
    const args = process.argv.slice(2);
    const options: SeedOptions = {
        count: 5,
        prefix: '[SEED]',
        cleanup: false
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
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    return options;
}

function printHelp(): void {
    console.log(`
HubSpot Seed Script - Creates test companies and contacts

Usage:
  npx tsx scripts/seedHubspot.ts [options]

Options:
  -n, --count <number>   Number of companies to create (default: 5)
  -p, --prefix <string>  Prefix for company names (default: [SEED])
  -c, --cleanup          Remove all seeded test data with the prefix
  -h, --help             Show this help message

Examples:
  npx tsx scripts/seedHubspot.ts --count 10
  npx tsx scripts/seedHubspot.ts -n 5 --prefix "[TEST]"
  npx tsx scripts/seedHubspot.ts --cleanup
`);
}

function generateSchoolName(prefix: string): string {
    const schoolTypes = ['Elementary School', 'Middle School', 'High School', 'Academy', 'Preparatory School', 'Charter School'];
    const schoolType = faker.helpers.arrayElement(schoolTypes);
    const cityName = faker.location.city();
    return `${prefix} ${cityName} ${schoolType}`;
}

function generateContact(schoolName: string): MainContact {
    // Use a school-based domain so HubSpot can match the company by domain
    // and avoid auto-creating a dummy company for the contact
    const domain = schoolName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-') + '.edu';

    return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email({ firstName: faker.person.firstName(), lastName: faker.person.lastName(), provider: domain }),
        phone: faker.phone.number({ style: 'national' })
    };
}

function generateSchoolData(prefix: string): SchoolData {
    const schoolName = generateSchoolName(prefix);
    const mainContact = generateContact(schoolName);

    return {
        schoolName,
        owner: null,
        mainContact
    };
}

async function seedHubspot(appConfig: AppConfig, options: SeedOptions): Promise<SeededCompany[]> {
    console.log('='.repeat(60));
    console.log('🌱 HubSpot Seed Script');
    console.log('='.repeat(60));
    console.log(`Creating ${options.count} companies with prefix "${options.prefix}"...\n`);

    const seededCompanies: SeededCompany[] = [];

    for (let i = 0; i < options.count; i++) {
        const schoolData = generateSchoolData(options.prefix);

        try {
            console.log(`[${i + 1}/${options.count}] Creating: ${schoolData.schoolName}`);

            // Create company (skip mondayUrl validation since we're seeding test data)
            const company = await createCompanyInHubSpot(appConfig, schoolData, { skipMondayUrlValidation: true });
            console.log(`  ✓ Company created: ${company.companyId}`);

            const contactIds: string[] = [];

            // Create main contact if exists
            if (schoolData.mainContact) {
                const contactId = await createContactInHubSpot(appConfig, schoolData.mainContact, company.companyId);
                contactIds.push(contactId);
                console.log(`  ✓ Contact created: ${contactId}`);
            }

            // Randomly add 0-2 additional contacts for variety
            const additionalContactCount = faker.number.int({ min: 0, max: 2 });
            for (let j = 0; j < additionalContactCount; j++) {
                const additionalContact = generateContact(schoolData.schoolName);
                const contactId = await createContactInHubSpot(appConfig, additionalContact, company.companyId);
                contactIds.push(contactId);
                console.log(`  ✓ Additional contact created: ${contactId}`);
            }

            seededCompanies.push({
                companyId: company.companyId,
                companyName: company.companyName,
                contactIds
            });
        } catch (error) {
            console.error(`  ✗ Failed to create "${schoolData.schoolName}":`, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Seed Summary');
    console.log('='.repeat(60));
    console.log(`✓ Companies created: ${seededCompanies.length}/${options.count}`);
    console.log(`✓ Total contacts created: ${seededCompanies.reduce((sum, c) => sum + c.contactIds.length, 0)}`);
    console.log('='.repeat(60));

    return seededCompanies;
}

async function cleanupHubspot(prefix: string): Promise<void> {
    console.log('='.repeat(60));
    console.log('🧹 HubSpot Cleanup Script');
    console.log('='.repeat(60));
    console.log(`Searching for companies with prefix "${prefix}"...\n`);

    const hubspotClient = new hubspot.Client({
        accessToken: process.env.HUBSPOT_ACCESS_TOKEN
    });

    try {
        // Search for companies with the prefix
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

        if (companies.length === 0) {
            console.log('No seeded companies found. Nothing to clean up.');
            return;
        }

        let deletedCount = 0;
        for (const company of companies) {
            try {
                await hubspotClient.crm.companies.basicApi.archive(company.id);
                console.log(`✓ Deleted company: ${company.properties.name} (${company.id})`);
                deletedCount++;
            } catch (error) {
                console.error(`✗ Failed to delete company ${company.id}:`, error instanceof Error ? error.message : 'Unknown error');
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Cleanup Summary');
        console.log('='.repeat(60));
        console.log(`✓ Companies deleted: ${deletedCount}/${companies.length}`);
        console.log('='.repeat(60));
    } catch (error) {
        console.error('Failed to search for companies:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
    }
}

async function main(): Promise<void> {
    const appConfig = createAppConfig(process.env);
    const options = parseArgs();

    try {
        if (options.cleanup) {
            await cleanupHubspot(options.prefix);
        } else {
            await seedHubspot(appConfig, options);
        }
    } catch (error) {
        console.error('\n❌ Script failed:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}

main();
