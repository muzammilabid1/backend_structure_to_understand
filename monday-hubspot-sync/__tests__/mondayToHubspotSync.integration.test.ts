/**
 * End-to-end integration test: Monday → HubSpot sync
 *
 * Tests real-world scenarios for the dummy company fix.
 * Seeds Monday with a mix of business email, free email, and no-contact schools,
 * runs the sync, then verifies HubSpot has the correct companies with correct domain
 * properties and no auto-created dummy companies.
 *
 * Requires .env.test with valid credentials for both Monday and HubSpot.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

import * as hubspot from '@hubspot/api-client';
import { createAppConfig } from '../config';
import { syncMondayToHubSpot } from '../hubspotService';
import { createMondayItemWithContacts, executeMondayMutation } from '../mondayService';

const appConfig = createAppConfig(process.env);
import type { SchoolData } from '../types';

const appConfig = createAppConfig(process.env);

const TIMESTAMP = Date.now();
const PREFIX = `[E2E-${TIMESTAMP}]`;
const BUSINESS_DOMAIN = `e2e-test-${TIMESTAMP}.edu`;

const TEST_SCHOOLS: SchoolData[] = [
    {
        // Business email — domain should be set on HubSpot company
        schoolName: `${PREFIX} Business Email School`,
        owner: null,
        mainContact: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: `jane.smith@${BUSINESS_DOMAIN}`,
            phone: null
        }
    },
    {
        // Free email (gmail) — domain should NOT be set on HubSpot company
        schoolName: `${PREFIX} Gmail School`,
        owner: null,
        mainContact: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe.e2e.test@gmail.com',
            phone: null
        }
    },
    {
        // No contact — domain should NOT be set on HubSpot company
        schoolName: `${PREFIX} No Contact School`,
        owner: null,
        mainContact: null
    }
];

describe('Monday → HubSpot Sync - End to End', () => {
    const mondaySchoolItemIds: string[] = [];
    const mondayContactItemIds: string[] = [];
    const hubspotCompanyIds: string[] = [];

    const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

    beforeAll(async () => {
        const missing = ['HUBSPOT_ACCESS_TOKEN', 'HUBSPOT_BASE_URL', 'HUBSPOT_ACCOUNT_ID', 'MONDAY_API_KEY']
            .filter((v) => !process.env[v]);
        if (missing.length > 0) {
            throw new Error(`Missing required env vars: ${missing.join(', ')}. Please fill them in .env.test`);
        }

        console.log(`\n🌱 Seeding ${TEST_SCHOOLS.length} schools to Monday (prefix: ${PREFIX})...`);

        for (const school of TEST_SCHOOLS) {
            const { schoolItemId, contactItemIds } = await createMondayItemWithContacts(
                appConfig,
                appConfig.monday.schoolsBoardId,
                school
            );
            mondaySchoolItemIds.push(schoolItemId);
            mondayContactItemIds.push(...contactItemIds);
            console.log(`  ✓ Created Monday item: ${school.schoolName} (${schoolItemId})`);
        }

        console.log('\n🔄 Running Monday → HubSpot sync...');
        const result = await syncMondayToHubSpot(appConfig);

        // Filter to only our test schools using the prefix
        const ourSyncedSchools = result.syncedSchools.filter((s) =>
            s.schoolName.startsWith(PREFIX)
        );

        for (const school of ourSyncedSchools) {
            if (school.hubspotCompanyId) {
                hubspotCompanyIds.push(school.hubspotCompanyId);
            }
        }

        console.log(`✓ Sync complete. ${ourSyncedSchools.length} test schools synced to HubSpot.\n`);
    }, 120000);

    afterAll(async () => {
        console.log('\n🧹 Cleaning up test data...');

        for (const itemId of [...mondaySchoolItemIds, ...mondayContactItemIds]) {
            try {
                await executeMondayMutation(appConfig, `mutation { delete_item(item_id: ${itemId}) { id } }`);
            } catch {
                // best effort
            }
        }

        for (const companyId of hubspotCompanyIds) {
            try {
                await hubspotClient.crm.companies.basicApi.archive(companyId);
            } catch {
                // best effort
            }
        }

        console.log('✓ Cleanup complete');
    }, 60000);

    it('should sync all test schools to HubSpot', () => {
        expect(hubspotCompanyIds.length).toBe(TEST_SCHOOLS.length);
    });

    it('should set domain on HubSpot company when contact has a business email', async () => {
        const businessSchool = TEST_SCHOOLS[0];
        const company = await hubspotClient.crm.companies.basicApi.getById(
            hubspotCompanyIds[0],
            ['name', 'domain']
        );

        expect(company.properties.name).toBe(businessSchool.schoolName);
        expect(company.properties.domain).toBe(BUSINESS_DOMAIN);
    }, 15000);

    it('should NOT set domain on HubSpot company when contact has a gmail address', async () => {
        const company = await hubspotClient.crm.companies.basicApi.getById(
            hubspotCompanyIds[1],
            ['name', 'domain']
        );

        expect(company.properties.name).toBe(TEST_SCHOOLS[1].schoolName);
        expect(company.properties.domain ?? '').toBe('');
    }, 15000);

    it('should NOT set domain on HubSpot company when there is no contact', async () => {
        const company = await hubspotClient.crm.companies.basicApi.getById(
            hubspotCompanyIds[2],
            ['name', 'domain']
        );

        expect(company.properties.name).toBe(TEST_SCHOOLS[2].schoolName);
        expect(company.properties.domain ?? '').toBe('');
    }, 15000);

    it('should NOT create a dummy company for the business email domain', async () => {
        // HubSpot auto-creates a dummy company named after the email domain when it
        // cannot match an existing company. If our fix works, no such dummy should exist.
        const searchResult = await hubspotClient.crm.companies.searchApi.doSearch({
            filterGroups: [
                {
                    filters: [
                        {
                            propertyName: 'name',
                            operator: 'EQ' as any,
                            value: BUSINESS_DOMAIN
                        }
                    ]
                }
            ],
            properties: ['name', 'domain'],
            limit: 10
        });

        expect(searchResult.results.length).toBe(0);
    }, 15000);

    it('should associate the contact with the correct company in HubSpot', async () => {
        // Verify the business email contact is linked to its school company, not a dummy
        const company = await hubspotClient.crm.companies.basicApi.getById(
            hubspotCompanyIds[0],
            ['name'],
            undefined,
            ['contacts']
        );

        const associatedContactIds = company.associations?.contacts?.results?.map((r) => r.id) ?? [];
        expect(associatedContactIds.length).toBeGreaterThan(0);
    }, 15000);
});
