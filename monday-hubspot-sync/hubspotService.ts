import * as hubspot from '@hubspot/api-client';
import type { AppConfig } from './config';
import { HubspotCompanyResultWithContacts, MainContact, SchoolData, SyncResult, MondayToHubSpotSyncResult, mondayItemToSchoolData } from './types';
import { fetchBoardWithItems } from './mondayService';
import { filterSchoolsWithoutHubSpotId, getCompanyDomain } from './helpers';
import {
    SimplePublicObjectWithAssociations,
    BatchResponseSimplePublicObject,
    BatchResponseSimplePublicObjectWithErrors
} from '@hubspot/api-client/lib/codegen/crm/companies';
import { AssociationSpecAssociationCategoryEnum } from '@hubspot/api-client/lib/codegen/crm/associations/v4/models/AssociationSpec';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts/models/Filter';

// Lazy initialization of HubSpot client to ensure environment variables are loaded
let hubspotClient: hubspot.Client | null = null;
function getHubspotClient(appConfig: AppConfig): hubspot.Client {
    if (!hubspotClient) {

        hubspotClient = new hubspot.Client({
            accessToken: appConfig.hubspot.accessToken
        });
    }
    return hubspotClient;
}

// Helper function to reset the client (useful for testing)
export function resetHubspotClient(): void {
    hubspotClient = null;
}

/**
 * Main orchestration function to get new schools ready for HubSpot
 */
export async function fetchSchoolsFromMondayWithoutHubSpotFields(appConfig: AppConfig): Promise<SchoolData[]> {
    try {
        console.log('Fetching schools from Monday.com...');
        const boardId = appConfig.monday.schoolsBoardId;
        const board = await fetchBoardWithItems(appConfig, boardId);

        console.log(`Board: ${board.name} (ID: ${board.id})`);
        console.log(`Total items in board: ${board.items_page.items.length}`);

        const schoolsWithoutHubSpotFields = filterSchoolsWithoutHubSpotId(appConfig, board.items_page.items);

        if (schoolsWithoutHubSpotFields.length === 0) {
            console.log('No new schools found that need to be synced to HubSpot');
            return [];
        }

        const transformedSchools = schoolsWithoutHubSpotFields.map((item) =>
            mondayItemToSchoolData(appConfig, item, boardId)
        );

        console.log(`Successfully transformed ${transformedSchools.length} schools for HubSpot`);
        return transformedSchools;
    } catch (error) {
        console.error('Error in getNewSchoolsForHubSpot:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to process schools for HubSpot sync');
    }
}

export async function getAssociationsFromHubspotContacts(
    appConfig: AppConfig,
    contactIds: string[]
): Promise<BatchResponseSimplePublicObject | BatchResponseSimplePublicObjectWithErrors> {
    if (contactIds.length === 0) {
        return { results: [], status: 'COMPLETE' } as unknown as BatchResponseSimplePublicObject;
    }
    try {
        const associations = await getHubspotClient(appConfig).crm.contacts.batchApi.read({
            inputs: Array.from(contactIds).map((id) => ({ id })),
            properties: ['firstname', 'lastname', 'email', 'phone'],
            propertiesWithHistory: []
        });
        return associations;
    } catch (error) {
        console.error('Error in getAssociationsFromHubSpot:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to get associations from HubSpot');
    }
}

export function getUniqueContactIds(companies: SimplePublicObjectWithAssociations[]): string[] {
    const allContactIds = new Set<string>();
    for (const company of companies) {
        if (company.associations?.contacts?.results) {
            for (const assoc of company.associations.contacts.results) {
                allContactIds.add(assoc.id);
            }
        }
    }
    return Array.from(allContactIds);
}

/**
 * Transforms HubSpot companies with their associated contacts into a standardized format
 * @param companies - Array of HubSpot companies with associations
 * @param contactMap - Map of contact IDs to contact details
 * @returns Array of transformed company data with contacts
 */
export function transformCompaniesWithContacts(
    companies: SimplePublicObjectWithAssociations[],
    contactMap: Map<string, any>
): HubspotCompanyResultWithContacts[] {
    if (companies.length === 0) {
        return [];
    }
    const results = companies
        .filter((company) => {
            // Filter out companies without ID or name
            if (!company.id || !company.properties?.name) {
                console.warn(`Skipping company without ID or name: ${company.id || 'unknown ID'}, name: ${company.properties?.name || 'no name'}`);
                return false;
            }
            return true;
        })
        .map((company) => {
            const uniqueContactIds = new Set<string>();
            if (company.associations?.contacts?.results) {
                for (const assoc of company.associations.contacts.results) {
                    uniqueContactIds.add(assoc.id);
                }
            }

            // Map unique contacts
            const contacts = Array.from(uniqueContactIds)
                .map((contactId) => {
                    const contact = contactMap.get(contactId);
                    if (!contact) return null;
                    return {
                        firstName: contact.properties?.firstname ?? null,
                        lastName: contact.properties?.lastname ?? null,
                        email: contact.properties?.email ?? null,
                        phone: contact.properties?.phone ?? null
                    };
                })
                .filter(
                    (contact): contact is NonNullable<typeof contact> =>
                        contact !== null && (!!contact.email || !!contact.firstName || !!contact.lastName)
                );

            return {
                companyId: company.id,
                companyName: company.properties.name, // We know this is not null because we filtered it out
                companyUrl: company.properties.website ?? null,
                contacts,
                mondayUrl: company.properties.monday_url ?? null,
                companyOwner: company.properties.hubspot_owner_id ?? null
            } as HubspotCompanyResultWithContacts;
        });
    return results;
}

/**
 * Get companies from HubSpot, fetching all pages.
 */
export async function getCompaniesAndContactsFromHubSpot(appConfig: AppConfig, pageSize = 100): Promise<HubspotCompanyResultWithContacts[]> {
    try {
        const properties = ['name', 'domain', 'website', 'monday_url', 'main_contact', 'hubspot_owner_id'];
        const allCompanies: SimplePublicObjectWithAssociations[] = [];
        let cursor: string | undefined = undefined;

        do {
            const page = await getHubspotClient(appConfig).crm.companies.basicApi.getPage(
                pageSize,
                cursor,
                properties,
                undefined,
                ['contacts']
            );
            allCompanies.push(...page.results);
            cursor = page.paging?.next?.after;
        } while (cursor);

        const allContactIds = getUniqueContactIds(allCompanies);

        const contacts = await getAssociationsFromHubspotContacts(appConfig, allContactIds);

        const contactMap = new Map((contacts.results ?? []).map((contact) => [contact.id, contact]));

        return transformCompaniesWithContacts(allCompanies, contactMap);
    } catch (error) {
        console.error('Error getting companies from HubSpot:', error);
        throw new Error('Failed to get companies from HubSpot');
    }
}

/**
 * Creates a company in HubSpot.
 * * @param options - Configuration options for the creation process.
 * @param options.skipMondayValidation - If true, skips the validation requiring a `mondayUrl`.
 * Use this only for seeding test data where a Monday link is intentionally omitted.
 * @dev we expect monday url to exist when creating hubspot company because monday already has the record
 * * @todo Add support for associating contacts and other required properties.
 */
export async function createCompanyInHubSpot(
    appConfig: AppConfig,
    schoolData: SchoolData,
    options?: {
        skipMondayUrlValidation?: boolean;
    }
): Promise<HubspotCompanyResultWithContacts> {

    if (!schoolData.mondayUrl && !options?.skipMondayUrlValidation) {
        throw new Error('Monday URL is required to create a company in HubSpot');
    }
    try {
        const properties: Record<string, string> = {
            name: schoolData.schoolName
        };

        if (schoolData.mondayUrl) {
            properties.monday_url = schoolData.mondayUrl;
        }

        // Only add owner if it has a value
        if (schoolData.owner) {
            properties.hubspot_owner_id = schoolData.owner;
        }

        // Set domain from contact email so HubSpot can match existing companies by domain
        // and avoid auto-creating a duplicate dummy company
        const contactEmail = schoolData.mainContact?.email;
        const domain = getCompanyDomain(contactEmail);
        if (domain) {
            properties.domain = domain;
        }

        const response = await getHubspotClient(appConfig).crm.companies.basicApi.create({
            properties
        });
        const company = await getCompanyById(appConfig, response.id);
        if (!company) {
            throw new Error('Failed to get company from HubSpot. Perhaps the company was not created successfully.');
        }
        return company;
    } catch (error) {
        console.error('Error creating company in HubSpot:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to create company in HubSpot');
    }
}



/**
/**
 * Associates an existing HubSpot contact with a company.
 */
export async function associateContactWithCompany(appConfig: AppConfig, contactId: string, companyId: string): Promise<void> {
    try {
        await getHubspotClient(appConfig).crm.associations.v4.basicApi.create(
            'contacts',
            contactId,
            'companies',
            companyId,
            [
                {
                    associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
                    associationTypeId: 1
                }
            ]
        );
    } catch (error) {
        console.error('Error associating contact with company in HubSpot:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to associate contact with company in HubSpot');
    }
}

/**
 * Creates a contact in HubSpot and associates it with a company.
 * If the contact already exists (409), searches for the existing contact by email
 * and associates it to the company instead, preventing orphaned contacts
 * that would trigger HubSpot's dummy-company auto-creation.
 */
export async function createContactInHubSpot(appConfig: AppConfig, contactData: MainContact, companyId: string): Promise<string> {
    if (!companyId) {
        throw new Error('Company ID cannot be null for creating a company');
    }
    try {
        // Create the contact
        const contactResponse = await getHubspotClient(appConfig).crm.contacts.basicApi.create({
            properties: {
                firstname: contactData.firstName ?? '',
                lastname: contactData.lastName ?? '',
                email: contactData.email ?? '',
                phone: contactData.phone ?? ''
            },
            associations: [
                {
                    to: { id: companyId },
                    types: [
                        {
                            associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
                            associationTypeId: 1
                        }
                    ]
                }
            ]
        });

        return contactResponse.id;
    } catch (error) {
        // 409 means the contact already exists in HubSpot. Rather than parsing the error body
        // (which may be a raw string depending on SDK version), search by email to get the
        // existing contact ID and associate it so no orphaned contact remains.
        const hubspotError = error as { code?: number };
        if (hubspotError.code === 409 && contactData.email) {
            const searchResponse = await getHubspotClient(appConfig).crm.contacts.searchApi.doSearch({
                filterGroups: [{ filters: [{ propertyName: 'email', operator: FilterOperatorEnum.Eq, value: contactData.email }] }],
                properties: ['email'],
                limit: 1
            });
            if (searchResponse.results.length > 0) {
                const existingContactId = searchResponse.results[0].id;
                await associateContactWithCompany(appConfig, existingContactId, companyId);
                return existingContactId;
            }
        }
        console.error('Error creating contact in HubSpot:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to create contact in HubSpot');
    }
}

/**
 * Searches HubSpot for an existing contact by email address.
 * Returns the contact ID if found, null otherwise.
 */
export async function findContactByEmail(appConfig: AppConfig, email: string): Promise<string | null> {
    try {
        const searchResponse = await getHubspotClient(appConfig).crm.contacts.searchApi.doSearch({
            filterGroups: [
                {
                    filters: [
                        {
                            propertyName: 'email',
                            operator: FilterOperatorEnum.Eq,
                            value: email
                        }
                    ]
                }
            ],
            properties: ['email'],
            limit: 1
        });
        if (searchResponse.results.length > 0) {
            return searchResponse.results[0].id;
        }
        return null;
    } catch (error) {
        console.error('Error searching for contact in HubSpot:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to search for contact in HubSpot');
    }
}


/**
 * Updates a company in HubSpot with same properties as Monday board
 * NOTE: Only updates the Monday URL property
 * TODO: Check if other properties need to be updated, such as name, owner, contacts, etc.
 */
export async function updateCompanyInHubSpot(appConfig: AppConfig, companyId: string, schoolItem: SchoolData): Promise<HubspotCompanyResultWithContacts> {
    if (!schoolItem.mondayUrl || !companyId) {
        throw new Error('Required paramas Monday Url Or Company ID is missing to update a company in HubSpot');
    }
    try {
        const response = await getHubspotClient(appConfig).crm.companies.basicApi.update(companyId, {
            properties: {
                monday_url: schoolItem.mondayUrl
            }
        });
        const company = await getCompanyById(appConfig, response.id);
        if (!company) {
            throw new Error('Failed to get company from HubSpot. Perhaps the company was not updated successfully.');
        }
        return company;
    } catch (error) {
        console.error('Error updating company in HubSpot:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to update company in HubSpot');
    }
}

/**
 * Fetches a specific company by ID from HubSpot
 */
export async function getCompanyById(appConfig: AppConfig, companyId: string): Promise<HubspotCompanyResultWithContacts> {
    try {
        const company = await getHubspotClient(appConfig).crm.companies.basicApi.getById(
            companyId,
            ['name', 'monday_url', 'hubspot_owner_id', 'website'],
            undefined,
            ['contacts']
        );

        const contactIds = [...new Set(
            (company.associations?.contacts?.results ?? []).map(assoc => assoc.id)
        )];
        const contactsResponse = await getAssociationsFromHubspotContacts(appConfig, contactIds);
        const contactMap = new Map(contactsResponse.results.map(c => [c.id, c]));
        const contacts = transformCompaniesWithContacts([company], contactMap)[0]?.contacts ?? [];

        return {
            companyId: company.id,
            companyName: company.properties.name ?? '',
            companyOwner: company.properties.hubspot_owner_id ?? '',
            mondayUrl: company.properties.monday_url ?? '',
            companyUrl: company.properties.website ?? '',
            contacts
        };
    } catch (error) {
        console.error('Error fetching company from HubSpot:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to fetch company from HubSpot');
    }
}

/**
 * Matches a company by name from HubSpot
 * Returns the first company that matches the name
 * TODO: Add more matching criteria, such as email, phone, etc.
 */
export async function matchHubspotCompanyByName(
    name: string,
    companies: HubspotCompanyResultWithContacts[]
): Promise<HubspotCompanyResultWithContacts | null> {
    if (companies.length === 0) {
        return null;
    }
    const company = companies.find((company) => company.companyName?.toLowerCase().trim() === name.toLowerCase().trim());
    if (!company) {
        return null;
    }
    return company;
}

/**
 * Syncs a school to HubSpot
 * If the company does not exist, creates it
 * If the company exists, updates it
 */
export async function syncHubspot(appConfig: AppConfig, school: SchoolData): Promise<HubspotCompanyResultWithContacts> {
    const companies = await getCompaniesAndContactsFromHubSpot(appConfig);
    const company = await matchHubspotCompanyByName(school.schoolName, companies);
    if (company === null) {
        // Create New Company in Hubspot with Monday URL
        const newCompany = await createCompanyInHubSpot(appConfig, school);
        return newCompany;
    } else {
        const updatedCompany = await updateCompanyInHubSpot(appConfig, company.companyId, school);
        return updatedCompany;
    }
}

/**
 * Syncs schools from Monday.com to HubSpot
 * Creates companies and contacts in HubSpot
 * Returns synced schools with HubSpot IDs populated (does NOT write back to Monday)
 */
export async function syncMondayToHubSpot(appConfig: AppConfig): Promise<MondayToHubSpotSyncResult> {
    try {
        console.log('='.repeat(60));
        console.log('Starting Monday.com → HubSpot Sync');
        console.log('='.repeat(60));

        // Get schools without HubSpot IDs but will have Monday ID
        const schools = await fetchSchoolsFromMondayWithoutHubSpotFields(appConfig);

        if (schools.length === 0) {
            console.log('\n✓ No schools to sync. All done!');
            return {
                summary: {
                    total: 0,
                    created: 0,
                    failed: 0,
                    skipped: 0
                },
                syncedSchools: []
            };
        }

        console.log(`\n✓ Found ${schools.length} school(s) to sync to HubSpot`);

        // Fetch all existing HubSpot companies once
        console.log('\n📋 Fetching existing HubSpot companies...');
        const hubspotCompanies = await getCompaniesAndContactsFromHubSpot(appConfig);
        console.log(`✓ Found ${hubspotCompanies.length} existing companies in HubSpot`);

        console.log('\n' + '='.repeat(60));
        console.log('Processing Schools');
        console.log('='.repeat(60));

        const results: SyncResult[] = [];
        const syncedSchools: SchoolData[] = [];
        let createdCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        // In-memory cache to avoid duplicate contact creation within a single sync run.
        // If the same email appears again (e.g. shared contact across schools) we reuse
        // the already-known HubSpot ID and only create a new association.
        const contactEmailCache = new Map<string, string>(); // email -> hubspotContactId

        for (const school of schools) {
            console.log(`\n📍 Processing: "${school.schoolName}"`);

            try {
                // Check if company exists in HubSpot by name
                const existingCompany = hubspotCompanies.find(
                    (c) => c.companyName.toLowerCase().trim() === school.schoolName.toLowerCase().trim()
                );

                let company: HubspotCompanyResultWithContacts;

                if (existingCompany) {
                    console.log(`  ℹ Found existing company in HubSpot (ID: ${existingCompany.companyId})`);
                    console.log(`  🔄 Updating company in HubSpot...`);
                    company = await updateCompanyInHubSpot(appConfig, existingCompany.companyId, school);
                    console.log(`  ✓ Company updated successfully`);
                    updatedCount++;
                } else {
                    console.log(`  ➕ Creating new company in HubSpot...`);
                    company = await createCompanyInHubSpot(appConfig, school);
                    console.log(`  ✓ Company created successfully`);
                    createdCount++;
                }

                // Update school object with HubSpot fields
                school.hubspotCompanyId = company.companyId;
                school.hubspotCompanyUrl =
                    company.companyUrl || `${appConfig.hubspot.baseUrl}/contacts/${appConfig.hubspot.accountId}/record/0-2/${company.companyId}`;

                // Create or associate contacts — deduplicated across the whole sync run
                const contactsToSync = [
                    ...(school.mainContact ? [school.mainContact] : []),
                    ...(school.additionalContacts ?? [])
                ];

                let contactFailed = false;

                for (const contact of contactsToSync) {
                    if (contact.email) {
                        try {
                            console.log(`  👤 Processing contact: ${contact.email}...`);

                            // Fast path: already seen this email in the current sync run
                            let existingContactId = contactEmailCache.get(contact.email);

                            // Slow path: search HubSpot in case the contact exists from a previous run
                            if (!existingContactId) {
                                existingContactId = await findContactByEmail(appConfig, contact.email) ?? undefined;
                            }

                            if (existingContactId) {
                                await associateContactWithCompany(appConfig, existingContactId, company.companyId);
                                contactEmailCache.set(contact.email, existingContactId);
                                console.log(`  ✓ Existing contact associated successfully`);
                            } else {
                                const newContactId = await createContactInHubSpot(appConfig, contact, company.companyId);
                                contactEmailCache.set(contact.email, newContactId);
                                console.log(`  ✓ Contact created successfully`);
                            }
                        } catch (contactError) {
                            console.error(`  ✗ Failed to process contact ${contact.email}:`, contactError instanceof Error ? contactError.message : 'Unknown error');
                            console.error(
                                `  ⏭ "${school.schoolName}" — HubSpot company ${existingCompany ? 'updated' : 'created'} (ID: ${company.companyId}) but contact sync failed.` +
                                ` Monday item will NOT be backfilled with the HubSpot ID this run.` +
                                ` The next sync run will retry contact processing automatically.`
                            );
                            contactFailed = true;
                            break;
                        }
                    }
                }

                if (contactFailed) {
                    skippedCount++;
                    continue;
                }

                syncedSchools.push(school);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`  ✗ Error processing "${school?.schoolName}":`, errorMessage);
                failedCount++;
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('Sync Summary');
        console.log('='.repeat(60));
        console.log(`✓ Created:  ${createdCount} school(s) in HubSpot`);
        console.log(`✓ Updated:  ${updatedCount} school(s) in HubSpot`);
        console.log(`✗ Failed:   ${failedCount} school(s)`);
        console.log(`⏭ Skipped:  ${skippedCount} school(s) (company synced, contact sync failed — will retry next run)`);
        console.log('='.repeat(60));

        return {
            summary: {
                total: schools.length,
                created: createdCount,
                failed: failedCount,
                skipped: skippedCount
            },
            syncedSchools
        };
    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('✗ Fatal Error During Sync Process');
        console.error('='.repeat(60));
        console.error(error instanceof Error ? error.message : 'Unknown error occurred');
        throw error;
    }
}
