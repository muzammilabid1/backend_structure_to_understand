// Mock the HubSpot client before importing hubspotService
jest.mock('@hubspot/api-client', () => ({
    __esModule: true,
    Client: jest.fn().mockImplementation(() => ({
        crm: {
            companies: {},
            contacts: {}
        }
    }))
}));

jest.mock('../mondayService', () => ({
    fetchBoardWithItems: jest.fn()
}));

import * as hubspot from '@hubspot/api-client';
import { getUniqueContactIds, transformCompaniesWithContacts, matchHubspotCompanyByName, getCompaniesAndContactsFromHubSpot, findContactByEmail, associateContactWithCompany, resetHubspotClient, getAssociationsFromHubspotContacts, fetchSchoolsFromMondayWithoutHubSpotFields, getCompanyById } from '../hubspotService';
import { fetchBoardWithItems } from '../mondayService';
import { SimplePublicObjectWithAssociations } from '@hubspot/api-client/lib/codegen/crm/companies';
import { HubspotCompanyResultWithContacts } from '../types';
import type { AppConfig } from '../config';

const mockAppConfig: AppConfig = {
    hubspot: { accessToken: 'test-token', baseUrl: '', accountId: '' },
    monday: { boardBaseUrl: '', apiKey: '', apiUrl: '', schoolsBoardId: '', schoolsContactBoardId: '', columnIds: { owner: '', mainContact: '', mainContactEmail: '', hubspotRecordId: '', contactName: '', contactEmail: '', schoolContact: '' } },
    readOnlyMode: false
}

describe('getUniqueContactIds', () => {
    it('should return an empty array when given an empty array of companies', () => {
        const companies: SimplePublicObjectWithAssociations[] = [];

        const result = getUniqueContactIds(companies);

        expect(result).toEqual([]);
    });

    it('should return an empty array when companies have no associations', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-1',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            },
            {
                id: 'company-2',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            }
        ];

        const result = getUniqueContactIds(companies);

        expect(result).toEqual([]);
    });

    it('should return an empty array when companies have associations but no contacts', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-1',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {}
            }
        ];

        const result = getUniqueContactIds(companies);

        expect(result).toEqual([]);
    });

    it('should return an empty array when companies have contacts association but no results', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-1',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: []
                    }
                }
            }
        ];

        const result = getUniqueContactIds(companies);

        expect(result).toEqual([]);
    });

    it('should return contact IDs from a single company with contacts', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-1',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' },
                            { id: 'contact-2', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];

        const result = getUniqueContactIds(companies);

        expect(result).toHaveLength(2);
        expect(result).toContain('contact-1');
        expect(result).toContain('contact-2');
    });

    it('should return unique contact IDs from multiple companies', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-1',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' },
                            { id: 'contact-2', type: 'company_to_contact' }
                        ]
                    }
                }
            },
            {
                id: 'company-2',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-3', type: 'company_to_contact' },
                            { id: 'contact-4', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];

        const result = getUniqueContactIds(companies);

        expect(result).toHaveLength(4);
        expect(result).toContain('contact-1');
        expect(result).toContain('contact-2');
        expect(result).toContain('contact-3');
        expect(result).toContain('contact-4');
    });

    it('should remove duplicate contact IDs across multiple companies', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-1',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' },
                            { id: 'contact-2', type: 'company_to_contact' }
                        ]
                    }
                }
            },
            {
                id: 'company-2',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-2', type: 'company_to_contact' }, // duplicate
                            { id: 'contact-3', type: 'company_to_contact' }
                        ]
                    }
                }
            },
            {
                id: 'company-3',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' }, // duplicate
                            { id: 'contact-4', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];

        const result = getUniqueContactIds(companies);

        expect(result).toHaveLength(4);
        expect(result).toContain('contact-1');
        expect(result).toContain('contact-2');
        expect(result).toContain('contact-3');
        expect(result).toContain('contact-4');
    });

    it('should handle mixed scenario: some companies with contacts, some without', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-1',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' }
                        ]
                    }
                }
            },
            {
                id: 'company-2',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
                // No associations at all
            },
            {
                id: 'company-3',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-2', type: 'company_to_contact' }
                        ]
                    }
                }
            },
            {
                id: 'company-4',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [] // Empty results
                    }
                }
            },
            {
                id: 'company-5',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {} // Has associations but no contacts property
            }
        ];

        const result = getUniqueContactIds(companies);

        expect(result).toHaveLength(2);
        expect(result).toContain('contact-1');
        expect(result).toContain('contact-2');
    });

    it('should handle a single company with multiple duplicate contacts (edge case)', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-1',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' },
                            { id: 'contact-1', type: 'company_to_contact' }, // duplicate in same company
                            { id: 'contact-1', type: 'company_to_contact' }  // duplicate in same company
                        ]
                    }
                }
            }
        ];

        const result = getUniqueContactIds(companies);

        expect(result).toHaveLength(1);
        expect(result).toContain('contact-1');
    });

    it('should preserve numeric contact IDs as strings', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-1',
                properties: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: '12345', type: 'company_to_contact' },
                            { id: '67890', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];

        const result = getUniqueContactIds(companies);

        expect(result).toHaveLength(2);
        expect(result).toContain('12345');
        expect(result).toContain('67890');
        expect(typeof result[0]).toBe('string');
        expect(typeof result[1]).toBe('string');
    });
});

describe('transformCompaniesWithContacts', () => {
    it('should return an empty array when given an empty array of companies', () => {
        const companies: SimplePublicObjectWithAssociations[] = [];
        const contactMap = new Map<string, any>();

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toEqual([]);
    });

    it('should transform a single company without contacts', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-123',
                properties: {
                    name: 'Test Company',
                    website: 'https://test.com',
                    monday_url: 'https://monday.com/boards/123',
                    hubspot_owner_id: 'Owner Name'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            }
        ];
        const contactMap = new Map<string, any>();

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            companyId: 'company-123',
            companyName: 'Test Company',
            companyUrl: 'https://test.com',
            contacts: [],
            mondayUrl: 'https://monday.com/boards/123',
            companyOwner: 'Owner Name'
        });
    });

    it('should handle missing optional properties with empty strings', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-456',
                properties: {
                    name: 'Minimal Company'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            }
        ];
        const contactMap = new Map<string, any>();

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            companyId: 'company-456',
            companyName: 'Minimal Company',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        });
    });

    it('should transform a company with valid contacts', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-789',
                properties: {
                    name: 'Company with Contacts',
                    website: 'https://example.com',
                    monday_url: 'https://monday.com/boards/456',
                    hubspot_owner_id: 'John Doe'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' },
                            { id: 'contact-2', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];
        const contactMap = new Map<string, any>([
            [
                'contact-1',
                {
                    properties: {
                        firstname: 'Alice',
                        lastname: 'Smith',
                        email: 'alice@example.com',
                        phone: '+1234567890'
                    }
                }
            ],
            [
                'contact-2',
                {
                    properties: {
                        firstname: 'Bob',
                        lastname: 'Johnson',
                        email: 'bob@example.com',
                        phone: '+0987654321'
                    }
                }
            ]
        ]);

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        expect(result[0].contacts).toHaveLength(2);
        expect(result[0].contacts).toContainEqual({
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@example.com',
            phone: '+1234567890'
        });
        expect(result[0].contacts).toContainEqual({
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob@example.com',
            phone: '+0987654321'
        });
    });

    it('should filter out contacts that are not in the contactMap', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-111',
                properties: {
                    name: 'Company A'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' },
                            { id: 'contact-2', type: 'company_to_contact' },
                            { id: 'contact-3', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];
        const contactMap = new Map<string, any>([
            [
                'contact-1',
                {
                    properties: {
                        firstname: 'Alice',
                        email: 'alice@example.com'
                    }
                }
            ]
            // contact-2 and contact-3 are not in the map
        ]);

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        expect(result[0].contacts).toHaveLength(1);
        expect(result[0].contacts[0]).toEqual({
            firstName: 'Alice',
            lastName: null,
            email: 'alice@example.com',
            phone: null
        });
    });

    it('should filter out contacts with no email, firstName, or lastName', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-222',
                properties: {
                    name: 'Company B'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' },
                            { id: 'contact-2', type: 'company_to_contact' },
                            { id: 'contact-3', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];
        const contactMap = new Map<string, any>([
            [
                'contact-1',
                {
                    properties: {
                        firstname: 'Alice',
                        email: 'alice@example.com'
                    }
                }
            ],
            [
                'contact-2',
                {
                    properties: {
                        phone: '+1234567890',
                        firstname: null,
                        lastname: null,
                        email: null
                    }
                }
            ],
            [
                'contact-3',
                {
                    properties: {
                        firstname: null,
                        lastname: 'Doe',
                        email: null,
                        phone: null
                    }
                }
            ]
        ]);

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        expect(result[0].contacts).toHaveLength(2);
        expect(result[0].contacts).toContainEqual({
            firstName: 'Alice',
            lastName: null,
            email: 'alice@example.com',
            phone: null
        });
        expect(result[0].contacts).toContainEqual({
            firstName: null,
            lastName: 'Doe',
            email: null,
            phone: null
        });
    });

    it('should handle contacts with missing property fields', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-333',
                properties: {
                    name: 'Company C'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];
        const contactMap = new Map<string, any>([
            [
                'contact-1',
                {
                    properties: {
                        firstname: 'John',
                        lastname: null,
                        email: null,
                        phone: null
                    }
                }
            ]
        ]);

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        expect(result[0].contacts).toHaveLength(1);
        expect(result[0].contacts[0]).toEqual({
            firstName: 'John',
            lastName: null,
            email: null,
            phone: null
        });
    });

    it('should deduplicate contact IDs within a single company', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-444',
                properties: {
                    name: 'Company D'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' },
                            { id: 'contact-1', type: 'company_to_contact' },
                            { id: 'contact-1', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];
        const contactMap = new Map<string, any>([
            [
                'contact-1',
                {
                    properties: {
                        firstname: 'Duplicate',
                        email: 'duplicate@example.com',
                        lastname: null,
                        phone: null
                    }
                }
            ]
        ]);

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        expect(result[0].contacts).toHaveLength(1);
        expect(result[0].contacts[0]).toEqual({
            firstName: 'Duplicate',
            lastName: null,
            email: 'duplicate@example.com',
            phone: null
        });
    });

    it('should transform multiple companies correctly', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-1',
                properties: {
                    name: 'First Company',
                    website: 'https://first.com',
                    monday_url: 'https://monday.com/boards/1',
                    hubspot_owner_id: 'Owner 1'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' }
                        ]
                    }
                }
            },
            {
                id: 'company-2',
                properties: {
                    name: 'Second Company',
                    website: 'https://second.com',
                    monday_url: 'https://monday.com/boards/2',
                    hubspot_owner_id: 'Owner 2'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-2', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];
        const contactMap = new Map<string, any>([
            [
                'contact-1',
                {
                    properties: {
                        firstname: 'Alice',
                        email: 'alice@first.com',
                        lastname: null,
                        phone: null
                    }
                }
            ],
            [
                'contact-2',
                {
                    properties: {
                        firstname: 'Bob',
                        email: 'bob@second.com',
                        lastname: null,
                        phone: null
                    }
                }
            ]
        ]);

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            companyId: 'company-1',
            companyName: 'First Company',
            companyUrl: 'https://first.com',
            contacts: [
                {
                    firstName: 'Alice',
                    lastName: null,
                    email: 'alice@first.com',
                    phone: null
                }
            ],
            mondayUrl: 'https://monday.com/boards/1',
            companyOwner: 'Owner 1'
        });
        expect(result[1]).toEqual({
            companyId: 'company-2',
            companyName: 'Second Company',
            companyUrl: 'https://second.com',
            contacts: [
                {
                    firstName: 'Bob',
                    lastName: null,
                    email: 'bob@second.com',
                    phone: null
                }
            ],
            mondayUrl: 'https://monday.com/boards/2',
            companyOwner: 'Owner 2'
        });
    });

    it('should handle companies with no associations object', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-555',
                properties: {
                    name: 'No Associations Company'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
                // No associations property
            }
        ];
        const contactMap = new Map<string, any>();

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        expect(result[0].contacts).toEqual([]);
    });

    it('should handle empty contactMap gracefully', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-666',
                properties: {
                    name: 'Company with No Map'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' },
                            { id: 'contact-2', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];
        const contactMap = new Map<string, any>();

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        expect(result[0].contacts).toEqual([]);
    });

    it('should handle contact with only email (no name)', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-777',
                properties: {
                    name: 'Company E'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];
        const contactMap = new Map<string, any>([
            [
                'contact-1',
                {
                    properties: {
                        email: 'only-email@example.com',
                        firstname: null,
                        lastname: null,
                        phone: null
                    }
                }
            ]
        ]);

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        expect(result[0].contacts).toHaveLength(1);
        expect(result[0].contacts[0]).toEqual({
            firstName: null,
            lastName: null,
            email: 'only-email@example.com',
            phone: null
        });
    });

    it('should preserve empty strings and not convert them to null or undefined', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-888',
                properties: {
                    name: 'Company F',
                    website: '',
                    monday_url: '',
                    hubspot_owner_id: ''
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false,
                associations: {
                    contacts: {
                        results: [
                            { id: 'contact-1', type: 'company_to_contact' }
                        ]
                    }
                }
            }
        ];
        const contactMap = new Map<string, any>([
            [
                'contact-1',
                {
                    properties: {
                        firstname: '',
                        lastname: '',
                        email: 'contact@example.com',
                        phone: ''
                    }
                }
            ]
        ]);

        const result = transformCompaniesWithContacts(companies, contactMap);

        expect(result).toHaveLength(1);
        // Check company properties preserve empty strings
        expect(result[0].companyUrl).toBe('');
        expect(result[0].mondayUrl).toBe('');
        expect(result[0].companyOwner).toBe('');

        // Check that empty strings are distinct from null/undefined
        expect(result[0].companyUrl).not.toBe(null);
        expect(result[0].companyUrl).not.toBe(undefined);
        expect(result[0].mondayUrl).not.toBe(null);
        expect(result[0].mondayUrl).not.toBe(undefined);
        expect(result[0].companyOwner).not.toBe(null);
        expect(result[0].companyOwner).not.toBe(undefined);

        // Check contact properties preserve empty strings
        expect(result[0].contacts).toHaveLength(1);
        expect(result[0].contacts[0].firstName).toBe('');
        expect(result[0].contacts[0].lastName).toBe('');
        expect(result[0].contacts[0].phone).toBe('');

        // Check that empty strings are distinct from null/undefined
        expect(result[0].contacts[0].firstName).not.toBe(null);
        expect(result[0].contacts[0].firstName).not.toBe(undefined);
        expect(result[0].contacts[0].lastName).not.toBe(null);
        expect(result[0].contacts[0].lastName).not.toBe(undefined);
        expect(result[0].contacts[0].phone).not.toBe(null);
        expect(result[0].contacts[0].phone).not.toBe(undefined);
    });

    it('should filter out companies when company ID is missing', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: '',
                properties: {
                    name: 'Valid Company Name'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            }
        ];
        const contactMap = new Map<string, any>();

        const result = transformCompaniesWithContacts(companies, contactMap);
        expect(result).toHaveLength(0);
    });

    it('should filter out companies when company name is missing', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-123',
                properties: {
                    name: ''
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            }
        ];
        const contactMap = new Map<string, any>();

        const result = transformCompaniesWithContacts(companies, contactMap);
        expect(result).toHaveLength(0);
    });

    it('should filter out companies when both company ID and name are missing', () => {
        const companies: SimplePublicObjectWithAssociations[] = [
            {
                id: '',
                properties: {
                    name: ''
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            }
        ];
        const contactMap = new Map<string, any>();

        const result = transformCompaniesWithContacts(companies, contactMap);
        expect(result).toHaveLength(0);
    });

    it('should filter out companies when company ID is null or undefined', () => {
        const contactMap = new Map<string, any>();

        // Test with null ID
        const companiesWithNullId: SimplePublicObjectWithAssociations[] = [
            {
                id: null as unknown as string,
                properties: {
                    name: 'Valid Company Name'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            }
        ];

        const result1 = transformCompaniesWithContacts(companiesWithNullId, contactMap);
        expect(result1).toHaveLength(0);

        // Test with undefined ID
        const companiesWithUndefinedId: SimplePublicObjectWithAssociations[] = [
            {
                id: undefined as unknown as string,
                properties: {
                    name: 'Valid Company Name'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            }
        ];

        const result2 = transformCompaniesWithContacts(companiesWithUndefinedId, contactMap);
        expect(result2).toHaveLength(0);
    });

    it('should filter out companies when company name is null or undefined', () => {
        const contactMap = new Map<string, any>();

        // Test with null name
        const companiesWithNullName: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-123',
                properties: {
                    name: null
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            }
        ];

        const result1 = transformCompaniesWithContacts(companiesWithNullName, contactMap);
        expect(result1).toHaveLength(0);

        // Test with undefined name
        const companiesWithUndefinedName: SimplePublicObjectWithAssociations[] = [
            {
                id: 'company-123',
                properties: {
                    name: undefined as unknown as string
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            }
        ];

        const result2 = transformCompaniesWithContacts(companiesWithUndefinedName, contactMap);
        expect(result2).toHaveLength(0);
    });
});

describe('matchHubspotCompanyByName', () => {
    it('should return null when given an empty companies array', async () => {
        const companies: HubspotCompanyResultWithContacts[] = [];
        const result = await matchHubspotCompanyByName('Test Company', companies);

        expect(result).toBeNull();
    });

    it('should return null when no company matches the name', async () => {
        const companies: HubspotCompanyResultWithContacts[] = [
            {
                companyId: 'company-1',
                companyName: 'ABC Corporation',
                companyUrl: 'https://abc.com',
                contacts: [],
                mondayUrl: 'https://monday.com/boards/123',
                companyOwner: 'Owner 1'
            },
            {
                companyId: 'company-2',
                companyName: 'XYZ Industries',
                companyUrl: 'https://xyz.com',
                contacts: [],
                mondayUrl: 'https://monday.com/boards/456',
                companyOwner: 'Owner 2'
            }
        ];

        const result = await matchHubspotCompanyByName('NonExistent Company', companies);

        expect(result).toBeNull();
    });

    it('should return the matching company when exact name match is found', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-123',
            companyName: 'Test Company',
            companyUrl: 'https://test.com',
            contacts: [],
            mondayUrl: 'https://monday.com/boards/789',
            companyOwner: 'Test Owner'
        };

        const companies: HubspotCompanyResultWithContacts[] = [
            {
                companyId: 'company-1',
                companyName: 'Other Company',
                companyUrl: 'https://other.com',
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            },
            matchingCompany,
            {
                companyId: 'company-3',
                companyName: 'Another Company',
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            }
        ];

        const result = await matchHubspotCompanyByName('Test Company', companies);

        expect(result).toEqual(matchingCompany);
        expect(result?.companyId).toBe('company-123');
        expect(result?.companyName).toBe('Test Company');
    });

    it('should match company name case-insensitively (lowercase input)', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-456',
            companyName: 'Test Company',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('test company', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should match company name case-insensitively (uppercase input)', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-789',
            companyName: 'test company',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('TEST COMPANY', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should match company name case-insensitively (mixed case)', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-101',
            companyName: 'TeSt CoMpAnY',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('tEsT cOmPaNy', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should trim whitespace from search name', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-202',
            companyName: 'Trimmed Company',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('   Trimmed Company   ', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should trim whitespace from company names in array', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-303',
            companyName: '   Spaced Company   ',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('Spaced Company', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should trim whitespace from both search name and company names', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-404',
            companyName: '  Both Trimmed  ',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('  Both Trimmed  ', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should combine case-insensitive and whitespace trimming', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-505',
            companyName: '  MiXeD CaSe  ',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('  mIxEd cAsE  ', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should return the first matching company when multiple matches exist', async () => {
        const firstMatch: HubspotCompanyResultWithContacts = {
            companyId: 'company-first',
            companyName: 'Duplicate Company',
            companyUrl: 'https://first.com',
            contacts: [],
            mondayUrl: 'https://monday.com/boards/1',
            companyOwner: 'Owner 1'
        };

        const secondMatch: HubspotCompanyResultWithContacts = {
            companyId: 'company-second',
            companyName: 'Duplicate Company',
            companyUrl: 'https://second.com',
            contacts: [],
            mondayUrl: 'https://monday.com/boards/2',
            companyOwner: 'Owner 2'
        };

        const companies: HubspotCompanyResultWithContacts[] = [
            {
                companyId: 'company-other',
                companyName: 'Other Company',
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            },
            firstMatch,
            secondMatch
        ];

        const result = await matchHubspotCompanyByName('Duplicate Company', companies);

        expect(result).toEqual(firstMatch);
        expect(result?.companyId).toBe('company-first');
    });

    it('should handle empty string name search', async () => {
        const companies: HubspotCompanyResultWithContacts[] = [
            {
                companyId: 'company-1',
                companyName: 'Valid Company',
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            }
        ];

        const result = await matchHubspotCompanyByName('', companies);

        expect(result).toBeNull();
    });

    it('should handle company with empty string name in array', async () => {
        const companies: HubspotCompanyResultWithContacts[] = [
            {
                companyId: 'company-empty',
                companyName: '',
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            },
            {
                companyId: 'company-valid',
                companyName: 'Valid Company',
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            }
        ];

        const result = await matchHubspotCompanyByName('', companies);

        expect(result?.companyId).toBe('company-empty');
    });

    it('should handle companies with null companyName', async () => {
        const companies: HubspotCompanyResultWithContacts[] = [
            {
                companyId: 'company-null',
                companyName: null as any,
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            },
            {
                companyId: 'company-valid',
                companyName: 'Valid Company',
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            }
        ];

        const result = await matchHubspotCompanyByName('Valid Company', companies);

        expect(result?.companyId).toBe('company-valid');
    });

    it('should handle companies with undefined companyName', async () => {
        const companies: HubspotCompanyResultWithContacts[] = [
            {
                companyId: 'company-undefined',
                companyName: undefined as any,
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            },
            {
                companyId: 'company-valid',
                companyName: 'Valid Company',
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            }
        ];

        const result = await matchHubspotCompanyByName('Valid Company', companies);

        expect(result?.companyId).toBe('company-valid');
    });

    it('should match company names with special characters', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-special',
            companyName: "O'Reilly Media & Co.",
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName("O'Reilly Media & Co.", companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should match company names with numbers', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-numbers',
            companyName: 'Company 123 Inc',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('Company 123 Inc', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should not match partial names', async () => {
        const companies: HubspotCompanyResultWithContacts[] = [
            {
                companyId: 'company-1',
                companyName: 'Test Company Inc',
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            }
        ];

        const result = await matchHubspotCompanyByName('Test Company', companies);

        expect(result).toBeNull();
    });

    it('should handle company with only whitespace name', async () => {
        const companies: HubspotCompanyResultWithContacts[] = [
            {
                companyId: 'company-whitespace',
                companyName: '     ',
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            }
        ];

        const result = await matchHubspotCompanyByName('', companies);

        expect(result?.companyId).toBe('company-whitespace');
    });

    it('should handle search name with only whitespace', async () => {
        const companies: HubspotCompanyResultWithContacts[] = [
            {
                companyId: 'company-empty',
                companyName: '',
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            }
        ];

        const result = await matchHubspotCompanyByName('     ', companies);

        expect(result?.companyId).toBe('company-empty');
    });

    it('should match company with contacts present', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-with-contacts',
            companyName: 'Company With Contacts',
            companyUrl: 'https://example.com',
            contacts: [
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '+1234567890'
                },
                {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane@example.com',
                    phone: null
                }
            ],
            mondayUrl: 'https://monday.com/boards/999',
            companyOwner: 'Owner Name'
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('Company With Contacts', companies);

        expect(result).toEqual(matchingCompany);
        expect(result?.contacts).toHaveLength(2);
    });

    it('should handle company names with unicode characters', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-unicode',
            companyName: 'Café Société Ñoño',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('Café Société Ñoño', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should handle company names with unicode characters case-insensitively', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-unicode-case',
            companyName: 'Café SOCIÉTÉ',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('café société', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should handle large arrays efficiently', async () => {
        const targetCompany: HubspotCompanyResultWithContacts = {
            companyId: 'target-company',
            companyName: 'Target Company',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        // Create a large array with the target at the end
        const companies: HubspotCompanyResultWithContacts[] = [];
        for (let i = 0; i < 1000; i++) {
            companies.push({
                companyId: `company-${i}`,
                companyName: `Company ${i}`,
                companyUrl: null,
                contacts: [],
                mondayUrl: null,
                companyOwner: null
            });
        }
        companies.push(targetCompany);

        const result = await matchHubspotCompanyByName('Target Company', companies);

        expect(result).toEqual(targetCompany);
        expect(result?.companyId).toBe('target-company');
    });

    it('should handle company names with multiple consecutive spaces', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-spaces',
            companyName: 'Company   With   Spaces',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        // Should NOT match because trim() only removes leading/trailing spaces
        const result = await matchHubspotCompanyByName('Company With Spaces', companies);

        expect(result).toBeNull();
    });

    it('should match when both have multiple consecutive spaces', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-multi-spaces',
            companyName: 'Test   Multiple   Spaces',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('Test   Multiple   Spaces', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should handle company names with tabs', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-tabs',
            companyName: '\tTabbed Company\t',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('Tabbed Company', companies);

        expect(result).toEqual(matchingCompany);
    });

    it('should handle company names with newlines', async () => {
        const matchingCompany: HubspotCompanyResultWithContacts = {
            companyId: 'company-newlines',
            companyName: '\nNewline Company\n',
            companyUrl: null,
            contacts: [],
            mondayUrl: null,
            companyOwner: null
        };

        const companies: HubspotCompanyResultWithContacts[] = [matchingCompany];

        const result = await matchHubspotCompanyByName('Newline Company', companies);

        expect(result).toEqual(matchingCompany);
    });
});

// ---------------------------------------------------------------------------
// getCompaniesAndContactsFromHubSpot - pagination
// ---------------------------------------------------------------------------

function makeHubspotCompany(id: string, name: string): SimplePublicObjectWithAssociations {
    return {
        id,
        properties: { name, domain: null, website: null, monday_url: null, main_contact: null, hubspot_owner_id: null },
        createdAt: new Date(),
        updatedAt: new Date(),
        archived: false
    };
}

function makePageResult(companies: SimplePublicObjectWithAssociations[], nextAfter?: string) {
    return {
        results: companies,
        paging: nextAfter ? { next: { after: nextAfter, link: '' } } : undefined
    };
}

describe('getCompaniesAndContactsFromHubSpot - pagination', () => {
    let mockGetPage: jest.Mock;
    let mockBatchRead: jest.Mock;

    beforeEach(() => {
        resetHubspotClient();
        mockGetPage = jest.fn();
        mockBatchRead = jest.fn().mockResolvedValue({ results: [] });
        (hubspot.Client as jest.Mock).mockImplementation(() => ({
            crm: {
                companies: { basicApi: { getPage: mockGetPage } },
                contacts: { batchApi: { read: mockBatchRead } }
            }
        }));
    });

    it('should return all companies when there is only one page (no paging.next)', async () => {
        const companies = [makeHubspotCompany('1', 'School A'), makeHubspotCompany('2', 'School B')];
        mockGetPage.mockResolvedValueOnce(makePageResult(companies));

        const result = await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        expect(mockGetPage).toHaveBeenCalledTimes(1);
        expect(result).toHaveLength(2);
        expect(result.map((c) => c.companyId)).toEqual(['1', '2']);
    });

    it('should fetch two pages and combine all companies', async () => {
        const page1 = [makeHubspotCompany('1', 'School A'), makeHubspotCompany('2', 'School B')];
        const page2 = [makeHubspotCompany('3', 'School C')];

        mockGetPage
            .mockResolvedValueOnce(makePageResult(page1, 'cursor-p2'))
            .mockResolvedValueOnce(makePageResult(page2));

        const result = await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        expect(mockGetPage).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(3);
        expect(result.map((c) => c.companyId)).toEqual(['1', '2', '3']);
    });

    it('should fetch three or more pages until paging.next is absent', async () => {
        const page1 = [makeHubspotCompany('1', 'A')];
        const page2 = [makeHubspotCompany('2', 'B')];
        const page3 = [makeHubspotCompany('3', 'C')];

        mockGetPage
            .mockResolvedValueOnce(makePageResult(page1, 'after-1'))
            .mockResolvedValueOnce(makePageResult(page2, 'after-2'))
            .mockResolvedValueOnce(makePageResult(page3));

        const result = await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        expect(mockGetPage).toHaveBeenCalledTimes(3);
        expect(result).toHaveLength(3);
    });

    it('should pass the after cursor from paging.next to the next getPage call', async () => {
        const page1 = [makeHubspotCompany('1', 'A')];
        const page2 = [makeHubspotCompany('2', 'B')];

        mockGetPage
            .mockResolvedValueOnce(makePageResult(page1, 'cursor-abc'))
            .mockResolvedValueOnce(makePageResult(page2));

        await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        const secondCallArgs = mockGetPage.mock.calls[1];
        expect(secondCallArgs[1]).toBe('cursor-abc'); // second arg is `after`
    });

    it('should pass limit of 100 on every page request', async () => {
        mockGetPage.mockResolvedValueOnce(makePageResult([]));

        await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        expect(mockGetPage.mock.calls[0][0]).toBe(100);
    });

    it('should request the required properties on every page', async () => {
        mockGetPage.mockResolvedValueOnce(makePageResult([]));

        await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        const properties: string[] = mockGetPage.mock.calls[0][2];
        expect(properties).toContain('name');
        expect(properties).toContain('domain');
        expect(properties).toContain('website');
        expect(properties).toContain('monday_url');
        expect(properties).toContain('hubspot_owner_id');
    });

    it('should request the contacts association on every page', async () => {
        mockGetPage.mockResolvedValueOnce(makePageResult([]));

        await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        const associations: string[] = mockGetPage.mock.calls[0][4];
        expect(associations).toContain('contacts');
    });

    it('should fetch contacts for all companies across all pages', async () => {
        const page1Companies = [makeHubspotCompany('c1', 'A')];
        const page2Companies = [makeHubspotCompany('c2', 'B')];

        // Add contact associations
        (page1Companies[0] as any).associations = { contacts: { results: [{ id: 'contact-1', type: 'x' }] } };
        (page2Companies[0] as any).associations = { contacts: { results: [{ id: 'contact-2', type: 'x' }] } };

        mockGetPage
            .mockResolvedValueOnce(makePageResult(page1Companies, 'next'))
            .mockResolvedValueOnce(makePageResult(page2Companies));

        await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        const batchReadCall = mockBatchRead.mock.calls[0][0];
        const requestedIds = batchReadCall.inputs.map((i: { id: string }) => i.id);
        expect(requestedIds).toContain('contact-1');
        expect(requestedIds).toContain('contact-2');
    });

    it('should return an empty array when HubSpot has no companies', async () => {
        mockGetPage.mockResolvedValueOnce(makePageResult([]));

        const result = await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        expect(result).toEqual([]);
    });

    it('should throw a wrapped error when getPage fails', async () => {
        mockGetPage.mockRejectedValueOnce(new Error('HubSpot API down'));

        await expect(getCompaniesAndContactsFromHubSpot(mockAppConfig)).rejects.toThrow('Failed to get companies from HubSpot');
    });

    it('should throw when a subsequent page request fails mid-pagination', async () => {
        const page1 = [makeHubspotCompany('1', 'A')];
        mockGetPage
            .mockResolvedValueOnce(makePageResult(page1, 'cursor-p2'))
            .mockRejectedValueOnce(new Error('Timeout on page 2'));

        await expect(getCompaniesAndContactsFromHubSpot(mockAppConfig)).rejects.toThrow('Failed to get companies from HubSpot');
    });

    it('should fetch two pages and combine all companies (pagination)', async () => {
        const page1 = [makeHubspotCompany('1', 'School A'), makeHubspotCompany('2', 'School B')];
        const page2 = [makeHubspotCompany('3', 'School C')];

        mockGetPage
            .mockResolvedValueOnce(makePageResult(page1, 'cursor-p2'))
            .mockResolvedValueOnce(makePageResult(page2));

        const result = await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        expect(mockGetPage).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(3);
        expect(result.map((c) => c.companyId)).toEqual(['1', '2', '3']);
    });

    it('should fetch three or more pages until paging.next is absent', async () => {
        const page1 = [makeHubspotCompany('1', 'A')];
        const page2 = [makeHubspotCompany('2', 'B')];
        const page3 = [makeHubspotCompany('3', 'C')];

        mockGetPage
            .mockResolvedValueOnce(makePageResult(page1, 'after-1'))
            .mockResolvedValueOnce(makePageResult(page2, 'after-2'))
            .mockResolvedValueOnce(makePageResult(page3));

        const result = await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        expect(mockGetPage).toHaveBeenCalledTimes(3);
        expect(result).toHaveLength(3);
    });

    it('should pass the after cursor from paging.next to the next getPage call', async () => {
        const page1 = [makeHubspotCompany('1', 'A')];
        const page2 = [makeHubspotCompany('2', 'B')];

        mockGetPage
            .mockResolvedValueOnce(makePageResult(page1, 'cursor-abc'))
            .mockResolvedValueOnce(makePageResult(page2));

        await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        const secondCallArgs = mockGetPage.mock.calls[1];
        expect(secondCallArgs[1]).toBe('cursor-abc'); // second arg is `after`
    });

    it('should pass limit of 100 on every page request', async () => {
        mockGetPage.mockResolvedValueOnce(makePageResult([]));

        await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        expect(mockGetPage.mock.calls[0][0]).toBe(100);
    });

    it('should request the required properties on every page', async () => {
        mockGetPage.mockResolvedValueOnce(makePageResult([]));

        await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        const properties: string[] = mockGetPage.mock.calls[0][2];
        expect(properties).toContain('name');
        expect(properties).toContain('domain');
        expect(properties).toContain('website');
        expect(properties).toContain('monday_url');
        expect(properties).toContain('hubspot_owner_id');
    });

    it('should request the contacts association on every page', async () => {
        mockGetPage.mockResolvedValueOnce(makePageResult([]));

        await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        const associations: string[] = mockGetPage.mock.calls[0][4];
        expect(associations).toContain('contacts');
    });

    it('should fetch contacts for all companies across all pages', async () => {
        const page1Companies = [makeHubspotCompany('c1', 'A')];
        const page2Companies = [makeHubspotCompany('c2', 'B')];

        // Add contact associations
        (page1Companies[0] as any).associations = { contacts: { results: [{ id: 'contact-1', type: 'x' }] } };
        (page2Companies[0] as any).associations = { contacts: { results: [{ id: 'contact-2', type: 'x' }] } };

        mockGetPage
            .mockResolvedValueOnce(makePageResult(page1Companies, 'next'))
            .mockResolvedValueOnce(makePageResult(page2Companies));

        await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        const batchReadCall = mockBatchRead.mock.calls[0][0];
        const requestedIds = batchReadCall.inputs.map((i: { id: string }) => i.id);
        expect(requestedIds).toContain('contact-1');
        expect(requestedIds).toContain('contact-2');
    });

    it('should return an empty array when HubSpot has no companies', async () => {
        mockGetPage.mockResolvedValueOnce(makePageResult([]));

        const result = await getCompaniesAndContactsFromHubSpot(mockAppConfig);

        expect(result).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// findContactByEmail
// ---------------------------------------------------------------------------

describe('findContactByEmail', () => {
    let mockDoSearch: jest.Mock;

    beforeEach(() => {
        resetHubspotClient();
        mockDoSearch = jest.fn();
        (hubspot.Client as jest.Mock).mockImplementation(() => ({
            crm: {
                companies: {},
                contacts: { searchApi: { doSearch: mockDoSearch } }
            }
        }));
    });

    it('should return the contact ID when a matching contact is found', async () => {
        mockDoSearch.mockResolvedValueOnce({
            results: [{ id: 'contact-123', properties: { email: 'jane@school.edu' } }],
            total: 1
        });

        const result = await findContactByEmail(mockAppConfig, 'jane@school.edu');

        expect(result).toBe('contact-123');
        expect(mockDoSearch).toHaveBeenCalledTimes(1);
        const searchArg = mockDoSearch.mock.calls[0][0];
        expect(searchArg.filterGroups[0].filters[0].propertyName).toBe('email');
        expect(searchArg.filterGroups[0].filters[0].value).toBe('jane@school.edu');
    });

    it('should return null when no contact matches the email', async () => {
        mockDoSearch.mockResolvedValueOnce({ results: [], total: 0 });

        const result = await findContactByEmail(mockAppConfig, 'nobody@nowhere.com');

        expect(result).toBeNull();
    });

    it('should return the first result ID when multiple matches are returned', async () => {
        mockDoSearch.mockResolvedValueOnce({
            results: [
                { id: 'contact-first', properties: { email: 'dupe@school.edu' } },
                { id: 'contact-second', properties: { email: 'dupe@school.edu' } }
            ],
            total: 2
        });

        const result = await findContactByEmail(mockAppConfig, 'dupe@school.edu');

        expect(result).toBe('contact-first');
    });

    it('should throw when the HubSpot search API call fails', async () => {
        mockDoSearch.mockRejectedValueOnce(new Error('API timeout'));

        await expect(findContactByEmail(mockAppConfig, 'jane@school.edu')).rejects.toThrow('Failed to search for contact in HubSpot');
    });
});

// ---------------------------------------------------------------------------
// associateContactWithCompany
// ---------------------------------------------------------------------------

describe('associateContactWithCompany', () => {
    let mockAssocCreate: jest.Mock;

    beforeEach(() => {
        resetHubspotClient();
        mockAssocCreate = jest.fn().mockResolvedValue({});
        (hubspot.Client as jest.Mock).mockImplementation(() => ({
            crm: {
                companies: {},
                contacts: {},
                associations: {
                    v4: {
                        basicApi: { create: mockAssocCreate }
                    }
                }
            }
        }));
    });

    it('should call the HubSpot associations API with correct arguments', async () => {
        await associateContactWithCompany(mockAppConfig, 'contact-456', 'company-789');

        expect(mockAssocCreate).toHaveBeenCalledTimes(1);
        expect(mockAssocCreate).toHaveBeenCalledWith(
            'contacts',
            'contact-456',
            'companies',
            'company-789',
            expect.arrayContaining([
                expect.objectContaining({ associationTypeId: 1 })
            ])
        );
    });

    it('should resolve without error on success', async () => {
        await expect(associateContactWithCompany(mockAppConfig, 'contact-1', 'company-2')).resolves.toBeUndefined();
    });

    it('should throw when the HubSpot associations API call fails', async () => {
        mockAssocCreate.mockRejectedValueOnce(new Error('Network error'));

        await expect(associateContactWithCompany(mockAppConfig, 'contact-1', 'company-2')).rejects.toThrow(
            'Failed to associate contact with company in HubSpot'
        );
    });
});

describe('getAssociationsFromHubspotContacts', () => {
    let mockBatchRead: jest.Mock;

    beforeEach(() => {
        resetHubspotClient();
        mockBatchRead = jest.fn().mockResolvedValue({ results: [] });
        (hubspot.Client as jest.Mock).mockImplementation(() => ({
            crm: {
                companies: {},
                contacts: { batchApi: { read: mockBatchRead } }
            }
        }));
    });

    it('should return empty results without calling the API when contactIds is empty', async () => {
        const result = await getAssociationsFromHubspotContacts(mockAppConfig, []);

        expect(mockBatchRead).not.toHaveBeenCalled();
        expect(result.results).toEqual([]);
    });

    it('should call the HubSpot batch API when contactIds is non-empty', async () => {
        const mockContact = { id: '123', properties: { firstname: 'Jane', lastname: 'Doe', email: 'jane@example.com', phone: null } };
        mockBatchRead.mockResolvedValueOnce({ results: [mockContact] });

        const result = await getAssociationsFromHubspotContacts(mockAppConfig, ['123']);

        expect(mockBatchRead).toHaveBeenCalledTimes(1);
        expect(mockBatchRead).toHaveBeenCalledWith({
            inputs: [{ id: '123' }],
            properties: ['firstname', 'lastname', 'email', 'phone'],
            propertiesWithHistory: []
        });
        expect(result.results).toEqual([mockContact]);
    });

    it('should throw when the HubSpot batch API fails', async () => {
        mockBatchRead.mockRejectedValueOnce(new Error('API error'));

        await expect(getAssociationsFromHubspotContacts(mockAppConfig, ['123'])).rejects.toThrow(
            'Failed to get associations from HubSpot'
        );
    });
});

describe('getCompanyById', () => {
    let mockGetById: jest.Mock;
    let mockBatchRead: jest.Mock;

    beforeEach(() => {
        resetHubspotClient();
        mockGetById = jest.fn();
        mockBatchRead = jest.fn().mockResolvedValue({ results: [] });
        (hubspot.Client as jest.Mock).mockImplementation(() => ({
            crm: {
                companies: { basicApi: { getById: mockGetById } },
                contacts: { batchApi: { read: mockBatchRead } }
            }
        }));
    });

    it('should return company with resolved contacts', async () => {
        mockGetById.mockResolvedValueOnce({
            id: 'company-1',
            properties: {
                name: 'Test School',
                hubspot_owner_id: 'owner-1',
                monday_url: 'https://monday.com/123',
                website: 'https://testschool.com'
            },
            associations: {
                contacts: { results: [{ id: 'contact-1' }, { id: 'contact-2' }] }
            }
        });
        mockBatchRead.mockResolvedValueOnce({
            results: [
                { id: 'contact-1', properties: { firstname: 'Alice', lastname: 'Smith', email: 'alice@example.com', phone: null } },
                { id: 'contact-2', properties: { firstname: 'Bob', lastname: 'Jones', email: 'bob@example.com', phone: null } }
            ]
        });

        const result = await getCompanyById(mockAppConfig, 'company-1');

        expect(result.companyId).toBe('company-1');
        expect(result.companyName).toBe('Test School');
        expect(result.contacts).toHaveLength(2);
        expect(result.contacts).toContainEqual(expect.objectContaining({ email: 'alice@example.com' }));
        expect(result.contacts).toContainEqual(expect.objectContaining({ email: 'bob@example.com' }));
    });

    it('should return empty contacts when company has no associations', async () => {
        mockGetById.mockResolvedValueOnce({
            id: 'company-2',
            properties: { name: 'No Contacts School', hubspot_owner_id: '', monday_url: '', website: '' },
            associations: undefined
        });

        const result = await getCompanyById(mockAppConfig, 'company-2');

        expect(result.contacts).toEqual([]);
        expect(mockBatchRead).not.toHaveBeenCalled();
    });

    it('should return empty contacts when associations.contacts is empty', async () => {
        mockGetById.mockResolvedValueOnce({
            id: 'company-3',
            properties: { name: 'Empty Contacts School', hubspot_owner_id: '', monday_url: '', website: '' },
            associations: { contacts: { results: [] } }
        });

        const result = await getCompanyById(mockAppConfig, 'company-3');

        expect(result.contacts).toEqual([]);
        expect(mockBatchRead).not.toHaveBeenCalled();
    });

    it('should deduplicate contact IDs before fetching', async () => {
        mockGetById.mockResolvedValueOnce({
            id: 'company-4',
            properties: { name: 'Dup School', hubspot_owner_id: '', monday_url: '', website: '' },
            associations: {
                contacts: { results: [{ id: 'contact-1' }, { id: 'contact-1' }, { id: 'contact-2' }] }
            }
        });
        mockBatchRead.mockResolvedValueOnce({
            results: [
                { id: 'contact-1', properties: { firstname: 'Alice', lastname: 'Smith', email: 'alice@example.com', phone: null } },
                { id: 'contact-2', properties: { firstname: 'Bob', lastname: 'Jones', email: 'bob@example.com', phone: null } }
            ]
        });

        await getCompanyById(mockAppConfig, 'company-4');

        expect(mockBatchRead).toHaveBeenCalledWith(
            expect.objectContaining({
                inputs: expect.arrayContaining([{ id: 'contact-1' }, { id: 'contact-2' }])
            })
        );
        expect(mockBatchRead.mock.calls[0][0].inputs).toHaveLength(2);
    });

    it('should throw when the HubSpot API fails', async () => {
        mockGetById.mockRejectedValueOnce(new Error('API error'));

        await expect(getCompanyById(mockAppConfig, 'company-1')).rejects.toThrow(
            'Failed to fetch company from HubSpot'
        );
    });
});

describe('fetchSchoolsFromMondayWithoutHubSpotFields', () => {
    const mockFetchBoardWithItems = fetchBoardWithItems as jest.MockedFunction<typeof fetchBoardWithItems>;

    const config = {
        hubspot: { accessToken: 'test-token', baseUrl: 'https://app.hubspot.com', accountId: 'acc-1' },
        monday: {
            boardBaseUrl: 'https://monday.com',
            apiKey: 'test-key',
            apiUrl: 'https://api.monday.com/v2',
            schoolsBoardId: 'schools-board-1',
            schoolsContactBoardId: 'contacts-board-1',
            columnIds: {
                owner: 'owner_col',
                mainContact: 'main_contact_col',
                mainContactEmail: 'main_contact_email_col',
                hubspotRecordId: 'hubspot_record_id_col',
                contactName: 'contact_name_col',
                contactEmail: 'contact_email_col',
                schoolContact: 'school_contact_col'
            }
        },
        readOnlyMode: false
    } as unknown as AppConfig;

    function makeSchoolItem(id: string, name: string, linkedContacts: Array<{ id: string; name: string; email: string }>): any {
        return {
            id,
            name,
            updated_at: '2024-01-01T00:00:00Z',
            column_values: [
                { id: 'hubspot_record_id_col', text: null, value: null },
                { id: 'owner_col', text: null, value: null },
                {
                    id: 'main_contact_col',
                    text: null,
                    value: null,
                    linked_items: linkedContacts.map((c) => ({
                        id: c.id,
                        name: c.name,
                        column_values: [{ id: 'contact_email_col', text: c.email, value: `"${c.email}"` }]
                    }))
                }
            ]
        };
    }

    const schoolsBoard = (items: any[]) => ({ id: 'schools-board-1', name: 'Schools', description: null, columns: [], items_page: { cursor: null, items } });

    beforeEach(() => {
        mockFetchBoardWithItems.mockReset();
    });

    it('should set mainContact from inline linked_items when a school has one contact', async () => {
        mockFetchBoardWithItems.mockResolvedValueOnce(
            schoolsBoard([makeSchoolItem('school-1', 'Test School', [{ id: 'c1', name: 'Alice Smith', email: 'alice@example.com' }])])
        );

        const result = await fetchSchoolsFromMondayWithoutHubSpotFields(config);

        expect(result).toHaveLength(1);
        expect(result[0].mainContact).toEqual({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: null });
        expect(result[0].additionalContacts).toBeUndefined();
    });

    it('should set mainContact and additionalContacts when a school has multiple linked contacts', async () => {
        mockFetchBoardWithItems.mockResolvedValueOnce(
            schoolsBoard([makeSchoolItem('school-1', 'Test School', [
                { id: 'c1', name: 'Alice Smith', email: 'alice@example.com' },
                { id: 'c2', name: 'Bob Jones', email: 'bob@example.com' }
            ])])
        );

        const result = await fetchSchoolsFromMondayWithoutHubSpotFields(config);

        expect(result).toHaveLength(1);
        expect(result[0].mainContact).toEqual({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: null });
        expect(result[0].additionalContacts).toEqual([
            { firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com', phone: null }
        ]);
    });

    it('should set mainContact to null when a school has no linked contacts', async () => {
        mockFetchBoardWithItems.mockResolvedValueOnce(
            schoolsBoard([makeSchoolItem('school-1', 'Test School', [])])
        );

        const result = await fetchSchoolsFromMondayWithoutHubSpotFields(config);

        expect(result).toHaveLength(1);
        expect(result[0].mainContact).toBeNull();
        expect(result[0].additionalContacts).toBeUndefined();
    });

    it('should return empty array and only fetch one board when all schools already have a HubSpot ID', async () => {
        const alreadySyncedSchool = {
            id: 'school-1',
            name: 'Already Synced School',
            updated_at: '2024-01-01T00:00:00Z',
            column_values: [
                { id: 'hubspot_record_id_col', text: '12345', value: '"12345"' },
                { id: 'owner_col', text: null, value: null },
                { id: 'main_contact_col', text: null, value: null, linked_items: [] }
            ]
        };

        mockFetchBoardWithItems.mockResolvedValueOnce(schoolsBoard([alreadySyncedSchool]));

        const result = await fetchSchoolsFromMondayWithoutHubSpotFields(config);

        expect(result).toEqual([]);
        expect(mockFetchBoardWithItems).toHaveBeenCalledTimes(1);
    });
});

