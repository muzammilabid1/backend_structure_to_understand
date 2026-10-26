/**
 * Test fixtures for HubSpot integration tests
 * 
 * This module provides utilities to set up and tear down test data in HubSpot.
 * It creates companies and contacts that can be used across multiple test suites.
 */

import * as hubspot from '@hubspot/api-client';

import type { AppConfig } from '../../config';
import { createCompanyInHubSpot, createContactInHubSpot } from '../../hubspotService';
import type { SchoolData, MainContact } from '../../types';

export interface TestCompanyData {
    companyId: string;
    companyName: string;
    mondayUrl: string;
    contactIds: string[];
}

export interface HubSpotIntegrationTestFixture {
    companies: TestCompanyData[];
    cleanup: () => Promise<void>;
}

/**
 * Creates test companies with associated contacts in HubSpot
 */
export async function createHubSpotIntegrationTestFixture(appConfig: AppConfig): Promise<HubSpotIntegrationTestFixture> {
    const timestamp = Date.now();
    const companies: TestCompanyData[] = [];

    console.log('📦 Setting up HubSpot test fixtures...');

    // Company 1: Basic school with one contact
    const school1: SchoolData = {
        schoolName: `[TEST] Basic School ${timestamp}`,
        owner: null,
        mainContact: {
            firstName: 'John',
            lastName: 'Doe',
            email: `john.doe.${timestamp}@test-fixture.com`,
            phone: '+1234567890'
        },
        mondayUrl: `https://monday.com/boards/${process.env.MONDAY_SCHOOLS_BOARD_ID}/pulses/fixture-1-${timestamp}`
    };

    const company1 = await createCompanyInHubSpot(appConfig, school1);
    const contact1Id = await createContactInHubSpot(appConfig, school1.mainContact!, company1.companyId);
    
    companies.push({
        companyId: company1.companyId,
        companyName: company1.companyName,
        mondayUrl: school1.mondayUrl!,
        contactIds: [contact1Id]
    });

    console.log(`  ✓ Created company: ${company1.companyName} (${company1.companyId})`);

    // Company 2: School with multiple contacts
    const school2: SchoolData = {
        schoolName: `[TEST] Multi-Contact School ${timestamp}`,
        owner: null,
        mainContact: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: `jane.smith.${timestamp}@test-fixture.com`,
            phone: '+1987654321'
        },
        mondayUrl: `https://monday.com/boards/${process.env.MONDAY_SCHOOLS_BOARD_ID}/pulses/fixture-2-${timestamp}`
    };

    const company2 = await createCompanyInHubSpot(appConfig, school2);
    const contact2aId = await createContactInHubSpot(appConfig, school2.mainContact!, company2.companyId);
    
    // Add second contact
    const secondContact: MainContact = {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: `bob.johnson.${timestamp}@test-fixture.com`,
        phone: '+1555555555'
    };
    const contact2bId = await createContactInHubSpot(appConfig, secondContact, company2.companyId);

    companies.push({
        companyId: company2.companyId,
        companyName: company2.companyName,
        mondayUrl: school2.mondayUrl!,
        contactIds: [contact2aId, contact2bId]
    });

    console.log(`  ✓ Created company: ${company2.companyName} (${company2.companyId})`);

    // Company 3: School without contacts (edge case)
    const school3: SchoolData = {
        schoolName: `[TEST] No Contact School ${timestamp}`,
        owner: null,
        mainContact: null,
        mondayUrl: `https://monday.com/boards/${process.env.MONDAY_SCHOOLS_BOARD_ID}/pulses/fixture-3-${timestamp}`
    };

    const company3 = await createCompanyInHubSpot(appConfig, school3);
    
    companies.push({
        companyId: company3.companyId,
        companyName: company3.companyName,
        mondayUrl: school3.mondayUrl!,
        contactIds: []
    });

    console.log(`  ✓ Created company: ${company3.companyName} (${company3.companyId})`);

    // Company 4: School with special characters in name
    const school4: SchoolData = {
        schoolName: `[TEST] Special School & Academy (Est. 2024) ${timestamp}`,
        owner: null,
        mainContact: {
            firstName: 'Alice',
            lastName: "O'Brien",
            email: `alice.obrien.${timestamp}@test-fixture.com`,
            phone: null
        },
        mondayUrl: `https://monday.com/boards/${process.env.MONDAY_SCHOOLS_BOARD_ID}/pulses/fixture-4-${timestamp}`
    };

    const company4 = await createCompanyInHubSpot(appConfig, school4);
    const contact4Id = await createContactInHubSpot(appConfig, school4.mainContact!, company4.companyId);
    
    companies.push({
        companyId: company4.companyId,
        companyName: company4.companyName,
        mondayUrl: school4.mondayUrl!,
        contactIds: [contact4Id]
    });

    console.log(`  ✓ Created company: ${company4.companyName} (${company4.companyId})`);

    console.log(`📦 Test fixtures ready: ${companies.length} companies created`);
    
    // Wait a bit for HubSpot to index the associations
    console.log('⏳ Waiting for HubSpot to index associations...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    console.log('✓ Ready to run tests');

    // Return fixture with cleanup function
    return {
        companies,
        cleanup: async () => {
            await cleanupTestFixture(companies);
        }
    };
}

/**
 * Cleans up test companies and contacts from HubSpot
 */
async function cleanupTestFixture(companies: TestCompanyData[]): Promise<void> {
    const hubspotClient = new hubspot.Client({
        accessToken: process.env.HUBSPOT_ACCESS_TOKEN
    });

    console.log('🧹 Cleaning up HubSpot test fixtures...');

    for (const company of companies) {
        try {
            // Delete all contacts first
            for (const contactId of company.contactIds) {
                try {
                    await hubspotClient.crm.contacts.basicApi.archive(contactId);
                    console.log(`  ✓ Deleted contact: ${contactId}`);
                } catch (error) {
                    console.warn(`  ⚠️  Failed to delete contact ${contactId}:`, error instanceof Error ? error.message : 'Unknown error');
                }
            }

            // Delete the company
            await hubspotClient.crm.companies.basicApi.archive(company.companyId);
            console.log(`  ✓ Deleted company: ${company.companyName} (${company.companyId})`);
        } catch (error) {
            console.error(`  ❌ Failed to delete company ${company.companyId}:`, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    console.log('🧹 Cleanup complete');
}

/**
 * Helper to find a company by name prefix
 */
export function findCompanyByNamePrefix(fixture: HubSpotIntegrationTestFixture, prefix: string): TestCompanyData | undefined {
    return fixture.companies.find(c => c.companyName.includes(prefix));
}

/**
 * Helper to get company by index
 */
export function getCompanyByIndex(fixture: HubSpotIntegrationTestFixture, index: number): TestCompanyData {
    if (index < 0 || index >= fixture.companies.length) {
        throw new Error(`Invalid company index: ${index}. Available: 0-${fixture.companies.length - 1}`);
    }
    return fixture.companies[index];
}

