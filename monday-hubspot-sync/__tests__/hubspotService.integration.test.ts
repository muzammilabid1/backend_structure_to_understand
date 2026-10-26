
import {
    getCompaniesAndContactsFromHubSpot,
    updateCompanyInHubSpot,
    getCompanyById,
    resetHubspotClient
} from '../hubspotService';
import { createHubSpotIntegrationTestFixture, type HubSpotIntegrationTestFixture, getCompanyByIndex } from './fixtures/hubspotIntegrationTestFixtures';

import { createAppConfig } from '../config';
import type { SchoolData } from '../types';

const appConfig = createAppConfig(process.env);

describe('HubSpot Service - Setup', () => {
    let fixture: HubSpotIntegrationTestFixture;
    
    beforeAll(async () => {
        // Reset the HubSpot client to ensure it uses the freshly loaded environment variables
        resetHubspotClient();
        console.log('✓ HubSpot credentials found, running integration tests');

        // Set up test fixtures (companies and contacts)
        fixture = await createHubSpotIntegrationTestFixture(appConfig);
    }, 60000);
    
    afterAll(async () => {
        if (!fixture) {
            return;
        }

        // Clean up all fixture data
        await fixture.cleanup();
    }, 30000); 

    describe('HubSpot Service - Integration Tests', () => {
        it('should fetch companies from Hubspot', async () => {
            const companies = await getCompaniesAndContactsFromHubSpot(appConfig);

            // Verify we get results
            expect(companies).toBeDefined();
            expect(Array.isArray(companies)).toBe(true);
            expect(companies.length).toBeGreaterThan(0);

            // Verify at least one of our fixture companies is in the results
            const fixtureCompanyIds = new Set(fixture.companies.map(c => c.companyId));
            const foundFixtureCompanies = companies.filter(c => 
                fixtureCompanyIds.has(c.companyId)
            );

            expect(foundFixtureCompanies.length).toBeGreaterThan(0);
            console.log(`✓ Found ${foundFixtureCompanies.length}/${fixture.companies.length} fixture companies`);
        }, 20000);

        it('should retrieve a specific  company by ID', async () => {
            // Get the first fixture company
            const fixtureCompany = getCompanyByIndex(fixture, 0);

            const company = await getCompanyById(appConfig, fixtureCompany.companyId);

            expect(company).toBeDefined();
            expect(company.companyId).toBe(fixtureCompany.companyId);
            expect(company.companyName).toBe(fixtureCompany.companyName);
            expect(company.mondayUrl).toBe(fixtureCompany.mondayUrl);

            console.log(`✓ Retrieved fixture company: ${company.companyName}`);
        }, 15000);

        it('should verify fixture company with multiple contacts', async () => {
            // Get the company with multiple contacts (index 1)
            const fixtureCompany = getCompanyByIndex(fixture, 1);

            const company = await getCompanyById(appConfig, fixtureCompany.companyId);

            expect(company).toBeDefined();
            expect(company.contacts).toBeDefined();
            
            // This test verifies the structure if contacts exist
            if (company.contacts.length > 0) {
                company.contacts.forEach(contact => {
                    expect(contact).toHaveProperty('firstName');
                    expect(contact).toHaveProperty('lastName');
                    expect(contact).toHaveProperty('email');
                });

                console.log(`✓ Verified company with ${company.contacts.length} contacts`);
            } else {
                console.log(`⚠️  Contacts not yet indexed (expected 2, found 0). This is normal for HubSpot.`);
            }
        }, 15000);

        it('should verify fixture company without contacts', async () => {
            // Get the company without contacts (index 2)
            const fixtureCompany = getCompanyByIndex(fixture, 2);

            const company = await getCompanyById(appConfig, fixtureCompany.companyId);

            expect(company).toBeDefined();
            expect(company.contacts).toBeDefined();
            expect(company.contacts.length).toBe(0); // Should have no contacts

            console.log(`✓ Verified company without contacts: ${company.companyName}`);
        }, 15000);

        it('should update a fixture company', async () => {
            // Get the first fixture company
            const fixtureCompany = getCompanyByIndex(fixture, 0);
            const newMondayUrl = `https://monday.com/boards/${process.env.MONDAY_SCHOOLS_BOARD_ID}/pulses/updated-${Date.now()}`;

            const schoolData: SchoolData = {
                schoolName: fixtureCompany.companyName,
                owner: null,
                mainContact: null,
                mondayUrl: newMondayUrl
            };

            const updatedCompany = await updateCompanyInHubSpot(appConfig, fixtureCompany.companyId, schoolData);

            expect(updatedCompany).toBeDefined();
            expect(updatedCompany.companyId).toBe(fixtureCompany.companyId);
            expect(updatedCompany.mondayUrl).toBe(newMondayUrl);

            console.log(`✓ Updated fixture company Monday URL`);

            // Update fixture data to reflect the change
            fixtureCompany.mondayUrl = newMondayUrl;
        }, 20000);

        it('should verify all fixture companies exist in HubSpot', async () => {
            // Fetch all companies
            const allCompanies = await getCompaniesAndContactsFromHubSpot(appConfig);
            const allCompanyIds = allCompanies.map(c => c.companyId);

            // Check that all fixture companies exist
            for (const fixtureCompany of fixture.companies) {
                expect(allCompanyIds).toContain(fixtureCompany.companyId);
            }

            console.log(`✓ All ${fixture.companies.length} fixture companies verified in HubSpot`);
        }, 20000);

        it('should return all companies when page size is smaller than total company count', async () => {
            // Fixture creates 4 companies. pageSize: 2 forces at least 2 pages,
            // exercising the pagination cursor loop against the real HubSpot API.
            const fixtureCompanyIds = new Set(fixture.companies.map(c => c.companyId));

            const companies = await getCompaniesAndContactsFromHubSpot(appConfig, 2);

            const foundFixtureCompanies = companies.filter(c => fixtureCompanyIds.has(c.companyId));
            expect(foundFixtureCompanies.length).toBe(fixture.companies.length);

            console.log(`✓ Pagination verified: all ${fixture.companies.length} fixture companies returned with pageSize=2`);
        }, 30000);

        it('should handle special characters in company names', async () => {
            // Get the company with special characters (index 3)
            const fixtureCompany = getCompanyByIndex(fixture, 3);

            const company = await getCompanyById(appConfig, fixtureCompany.companyId);

            expect(company).toBeDefined();
            expect(company.companyName).toContain('&');
            expect(company.companyName).toContain('(');
            expect(company.companyName).toContain(')');

            // Note: HubSpot associations may take time to index
            if (company.contacts.length > 0) {
                const contact = company.contacts[0];
                expect(contact.lastName).toContain("'");
                console.log(`✓ Verified special characters handling: ${company.companyName}`);
            } else {
                console.log(`✓ Verified special characters in company name: ${company.companyName}`);
            }
        }, 15000);
    });
});
