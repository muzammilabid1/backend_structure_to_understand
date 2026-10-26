/**
 * Integration test: sync when contact already exists in HubSpot
 *
 * Scenario (LWP-9261):
 *   1. Create a Monday school item with a linked contact.
 *   2. Create the same contact directly in HubSpot (no company association).
 *      NOTE: HubSpot immediately auto-creates a dummy "--" company at this point —
 *      this is native HubSpot behaviour outside our control.
 *   3. Run the Monday → HubSpot sync.
 *   4. Verify the contact is associated to the correct school company.
 *
 * The fix: when createContactInHubSpot receives a 409, it searches for the existing
 * contact by email and associates it with the school company instead of failing.
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

const TIMESTAMP = Date.now();
const PREFIX = `[E2E-9261-${TIMESTAMP}]`;
const BUSINESS_DOMAIN = `e2e-9261-${TIMESTAMP}.edu`;
const CONTACT_EMAIL = `pre-existing.${TIMESTAMP}@${BUSINESS_DOMAIN}`;
const SCHOOL_NAME = `${PREFIX} Pre-existing Contact School`;

describe('Monday → HubSpot Sync - pre-existing contact in HubSpot', () => {
    const mondayItemIds: string[] = [];
    let hubspotCompanyId: string | undefined;
    let preExistingContactId: string | undefined;

    const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

    beforeAll(async () => {
        const missing = ['HUBSPOT_ACCESS_TOKEN', 'HUBSPOT_BASE_URL', 'HUBSPOT_ACCOUNT_ID', 'MONDAY_API_KEY']
            .filter((v) => !process.env[v]);
        if (missing.length > 0) {
            throw new Error(`Missing required env vars: ${missing.join(', ')}. Please fill them in .env.test`);
        }

        // Step 1: seed Monday with a school and a linked contact
        console.log('\n🌱 Step 1: Creating Monday school item with contact...');
        const school: SchoolData = {
            schoolName: SCHOOL_NAME,
            owner: null,
            mainContact: {
                firstName: 'Pre',
                lastName: 'Existing',
                email: CONTACT_EMAIL,
                phone: null
            }
        };

        const { schoolItemId, contactItemIds } = await createMondayItemWithContacts(
            appConfig,
            appConfig.monday.schoolsBoardId,
            school
        );
        mondayItemIds.push(schoolItemId, ...contactItemIds);
        console.log(`  ✓ Monday school item: ${schoolItemId}`);

        // Step 2: create the same contact in HubSpot with no company association
        console.log('\n🌱 Step 2: Creating contact in HubSpot (no company)...');
        const contactResponse = await hubspotClient.crm.contacts.basicApi.create({
            properties: {
                firstname: 'Pre',
                lastname: 'Existing',
                email: CONTACT_EMAIL,
                phone: ''
            }
        });
        preExistingContactId = contactResponse.id;
        console.log(`  ✓ HubSpot contact created: ${preExistingContactId}`);

        // Step 3: run the sync
        console.log('\n🔄 Step 3: Running Monday → HubSpot sync...');
        const result = await syncMondayToHubSpot(appConfig);

        const syncedSchool = result.syncedSchools.find((s) => s.schoolName === SCHOOL_NAME);
        hubspotCompanyId = syncedSchool?.hubspotCompanyId;
        console.log(`  ✓ Sync complete. Company ID: ${hubspotCompanyId ?? 'not found'}`);
    }, 120000);

    afterAll(async () => {
        console.log('\n🧹 Cleaning up test data...');

        for (const itemId of mondayItemIds) {
            try {
                await executeMondayMutation(appConfig, `mutation { delete_item(item_id: ${itemId}) { id } }`);
            } catch { /* best effort */ }
        }

        if (preExistingContactId) {
            try {
                await hubspotClient.crm.contacts.basicApi.archive(preExistingContactId);
            } catch { /* best effort */ }
        }

        // Archive the school company directly by ID (reliable, no indexing delay)
        if (hubspotCompanyId) {
            try {
                await hubspotClient.crm.companies.basicApi.archive(hubspotCompanyId);
            } catch { /* best effort */ }
        }

        // Also search by domain to catch any HubSpot auto-created dummy companies
        try {
            const companySearch = await hubspotClient.crm.companies.searchApi.doSearch({
                filterGroups: [{ filters: [{ propertyName: 'domain', operator: 'EQ' as any, value: BUSINESS_DOMAIN }] }],
                properties: ['name', 'domain'],
                limit: 100
            });
            for (const company of companySearch.results) {
                try {
                    await hubspotClient.crm.companies.basicApi.archive(company.id);
                } catch { /* best effort */ }
            }
        } catch { /* best effort */ }

        console.log('✓ Cleanup complete');
    }, 60000);

    it('should create the school company in HubSpot', () => {
        expect(hubspotCompanyId).toBeDefined();
    });

    it('should associate the pre-existing contact with the school company', async () => {
        expect(preExistingContactId).toBeDefined();
        expect(hubspotCompanyId).toBeDefined();

        const company = await hubspotClient.crm.companies.basicApi.getById(
            hubspotCompanyId!,
            ['name'],
            undefined,
            ['contacts']
        );

        const associatedContactIds = company.associations?.contacts?.results?.map((r) => r.id) ?? [];
        expect(associatedContactIds).toContain(preExistingContactId);
    }, 15000);

});
