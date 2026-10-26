import {
    detectOrphanedLinks,
    detectPotentialDuplicates,
    parseArgs,
    getHelpText
} from '../syncOrchestrator';
import type { MondayItem, HubspotCompanyResultWithContacts } from '../types';
import { createAppConfig } from '../config';

const appConfig = createAppConfig(process.env);

const testColumnIds = appConfig.monday.columnIds;

/**
 * Helper to create a mock Monday item with required column values
 */
function createMockMondayItem(
    id: string,
    name: string,
    hubspotId: string | null = null,
    contactEmail: string | null = null
): MondayItem {
    const linkedItems = contactEmail ? [{
        id: 'contact-1',
        name: 'John Doe',
        column_values: [{ id: testColumnIds.contactEmail, text: contactEmail, value: null }]
    }] : [];

    // Non-null assertions used because setup.ts sets these env vars before tests run
    return {
        id,
        name,
        updated_at: '2025-01-01T00:00:00Z',
        column_values: [
            { id: testColumnIds.owner, text: 'Owner Name', value: null },
            { id: testColumnIds.mainContact, text: contactEmail ? 'John Doe' : '', value: null, linked_items: linkedItems },
            { id: testColumnIds.hubspotRecordId, text: hubspotId, value: hubspotId }
        ]
    };
}

/**
 * Helper to create a mock HubSpot company
 */
function createMockHubspotCompany(
    companyId: string,
    companyName: string,
    mondayUrl: string | null = null,
    email: string | null = null
): HubspotCompanyResultWithContacts {
    const contacts = email ? [{ firstName: 'Test', lastName: 'Contact', email, phone: null }] : [];
    return {
        companyId,
        companyName,
        companyOwner: null,
        mondayUrl,
        companyUrl: `https://hubspot.com/company/${companyId}`,
        contacts
    };
}

describe('detectOrphanedLinks', () => {
    // Suppress console.log during tests
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('when there are no orphaned links', () => {
        it('should return empty array when both systems are empty', () => {
            const result = detectOrphanedLinks(appConfig, [], []);
            expect(result).toEqual([]);
        });

        it('should return empty array when no items are linked', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A'),
                createMockMondayItem('2', 'School B')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company A'),
                createMockHubspotCompany('h2', 'Company B')
            ];

            const result = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);
            expect(result).toEqual([]);
        });

        it('should return empty array when all links are valid', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A', 'h1')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company A', 'https://monday.com/boards/123/pulses/1')
            ];

            const result = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);
            expect(result).toEqual([]);
        });
    });

    describe('when Monday item references non-existent HubSpot company', () => {
        it('should detect orphaned link from Monday', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A', 'h999')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company A')
            ];

            const result = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                source: 'monday',
                sourceId: '1',
                sourceName: 'School A',
                targetId: 'h999',
                targetSystem: 'hubspot',
                reason: 'Monday item references HubSpot company ID h999 which does not exist'
            });
        });

        it('should detect multiple orphaned links from Monday', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A', 'h999'),
                createMockMondayItem('2', 'School B', 'h888')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company A')
            ];

            const result = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(2);
            expect(result.map(o => o.sourceId)).toEqual(['1', '2']);
        });
    });

    describe('when HubSpot company references non-existent Monday item', () => {
        it('should detect orphaned link from HubSpot', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company A', 'https://monday.com/boards/123/pulses/999')
            ];

            const result = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                source: 'hubspot',
                sourceId: 'h1',
                sourceName: 'Company A',
                targetId: '999',
                targetSystem: 'monday',
                reason: 'HubSpot company references Monday item ID 999 which does not exist'
            });
        });

        it('should detect multiple orphaned links from HubSpot', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company A', 'https://monday.com/boards/123/pulses/999'),
                createMockHubspotCompany('h2', 'Company B', 'https://monday.com/boards/123/pulses/888')
            ];

            const result = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(2);
            expect(result.map(o => o.sourceId)).toEqual(['h1', 'h2']);
        });
    });

    describe('when there are orphaned links in both directions', () => {
        it('should detect orphans from both Monday and HubSpot', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A', 'h999')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company A', 'https://monday.com/boards/123/pulses/888')
            ];

            const result = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(2);
            expect(result.find(o => o.source === 'monday')).toBeDefined();
            expect(result.find(o => o.source === 'hubspot')).toBeDefined();
        });
    });

    describe('edge cases', () => {
        it('should ignore HubSpot companies with invalid Monday URL format', () => {
            const mondayItems = [createMockMondayItem('1', 'School A')];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company A', 'https://invalid-url.com/no-pulses')
            ];

            const result = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);
            expect(result).toEqual([]);
        });

        it('should handle Monday items with empty HubSpot ID', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A', '')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company A')
            ];

            const result = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);
            expect(result).toEqual([]);
        });

        it('should handle HubSpot companies with empty Monday URL', () => {
            const mondayItems = [createMockMondayItem('1', 'School A')];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company A', '')
            ];

            const result = detectOrphanedLinks(appConfig, mondayItems, hubspotCompanies);
            expect(result).toEqual([]);
        });
    });
});

describe('detectPotentialDuplicates', () => {
    // Suppress console.log during tests
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('when there are no potential duplicates', () => {
        it('should return empty array when both systems are empty', () => {
            const result = detectPotentialDuplicates(appConfig, [], []);
            expect(result).toEqual([]);
        });

        it('should return empty array when no names match', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A'),
                createMockMondayItem('2', 'School B')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'Company X'),
                createMockHubspotCompany('h2', 'Company Y')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);
            expect(result).toEqual([]);
        });

        it('should return empty array when matching names are already linked', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A', 'h1')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A', 'https://monday.com/boards/123/pulses/1')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);
            expect(result).toEqual([]);
        });
    });

    describe('when there are potential duplicates', () => {
        it('should detect exact name matches between unlinked records', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                mondayItemId: '1',
                mondayItemName: 'School A',
                hubspotCompanyId: 'h1',
                hubspotCompanyName: 'School A',
                confidence: 'exact'
            });
        });

        it('should detect case-insensitive matches', () => {
            const mondayItems = [
                createMockMondayItem('1', 'SCHOOL A')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'school a')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
            expect(result[0].confidence).toBe('exact');
        });

        it('should detect matches with leading/trailing whitespace', () => {
            const mondayItems = [
                createMockMondayItem('1', '  School A  ')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
        });

        it('should detect multiple potential duplicates', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A'),
                createMockMondayItem('2', 'School B')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A'),
                createMockHubspotCompany('h2', 'School B')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(2);
            expect(result.map(d => d.mondayItemName)).toContain('School A');
            expect(result.map(d => d.mondayItemName)).toContain('School B');
        });
        it('should detect potential duplicates based on name matches', () => {
            // Create an unlinked Monday item (no HubSpot ID)
            const mondayItems = [
                createMockMondayItem('1', 'School A')
            ];
            // Create an unlinked HubSpot company (no Monday URL) with matching name
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A', null, 'john@example.com'),
                createMockHubspotCompany('h2', 'School B', null, 'jane@example.com')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
            expect(result[0].mondayItemId).toBe('1');
            expect(result[0].hubspotCompanyId).toBe('h1');
        });
        it('should detect potential duplicates based on email matches', () => {
            // Create an unlinked Monday item (no HubSpot ID) with email in linked contact
            const mondayItems = [
                createMockMondayItem('1', 'Different School Name', null, 'john@example.com')
            ];
            // Create an unlinked HubSpot company (no Monday URL) with matching email
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A', null, 'john@example.com')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
            expect(result[0].mondayItemId).toBe('1');
            expect(result[0].hubspotCompanyId).toBe('h1');
        });
    });
    describe('edge cases', () => {
        it('should only flag unlinked Monday items (no HubSpot ID)', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A', 'h999'), // linked
                createMockMondayItem('2', 'School B') // unlinked
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A'),
                createMockHubspotCompany('h2', 'School B')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
            expect(result[0].mondayItemId).toBe('2');
        });

        it('should only flag unlinked HubSpot companies (no Monday URL)', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A'),
                createMockMondayItem('2', 'School B')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A', 'https://monday.com/boards/123/pulses/999'), // linked
                createMockHubspotCompany('h2', 'School B') // unlinked
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
            expect(result[0].hubspotCompanyId).toBe('h2');
        });

        it('should handle empty strings in Monday HubSpot ID as unlinked', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A', '')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
        });

        it('should handle empty strings in HubSpot Monday URL as unlinked', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A', '')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
        });

        it('should handle whitespace-only values as unlinked', () => {
            const mondayItems = [
                createMockMondayItem('1', 'School A', '   ')
            ];
            const hubspotCompanies = [
                createMockHubspotCompany('h1', 'School A', '   ')
            ];

            const result = detectPotentialDuplicates(appConfig, mondayItems, hubspotCompanies);

            expect(result).toHaveLength(1);
        });
    });
});

describe('parseArgs', () => {
    describe('when no arguments provided', () => {
        it('should return default options', () => {
            const result = parseArgs([]);

            expect(result.options).toEqual({
                dryRun: false,
                direction: 'both',
                detectOrphans: true,
                detectDuplicates: true
            });
            expect(result.error).toBeUndefined();
            expect(result.showHelp).toBeUndefined();
        });
    });

    describe('--dry-run flag', () => {
        it('should set dryRun to true with --dry-run', () => {
            const result = parseArgs(['--dry-run']);

            expect(result.options.dryRun).toBe(true);
        });

        it('should set dryRun to true with -d', () => {
            const result = parseArgs(['-d']);

            expect(result.options.dryRun).toBe(true);
        });
    });

    describe('--direction flag', () => {
        it('should set direction to monday-to-hubspot', () => {
            const result = parseArgs(['--direction', 'monday-to-hubspot']);

            expect(result.options.direction).toBe('monday-to-hubspot');
        });

        it('should set direction to hubspot-to-monday', () => {
            const result = parseArgs(['--direction', 'hubspot-to-monday']);

            expect(result.options.direction).toBe('hubspot-to-monday');
        });

        it('should set direction to both', () => {
            const result = parseArgs(['--direction', 'both']);

            expect(result.options.direction).toBe('both');
        });

        it('should return error for invalid direction', () => {
            const result = parseArgs(['--direction', 'invalid']);

            expect(result.error).toBe("Invalid direction: invalid. Use 'monday-to-hubspot', 'hubspot-to-monday', or 'both'");
        });
    });

    describe('--help flag', () => {
        it('should return showHelp with --help', () => {
            const result = parseArgs(['--help']);

            expect(result.showHelp).toBe(true);
        });

        it('should return showHelp with -h', () => {
            const result = parseArgs(['-h']);

            expect(result.showHelp).toBe(true);
        });
    });

    describe('unknown arguments', () => {
        it('should return error for unknown argument', () => {
            const result = parseArgs(['--unknown-flag']);

            expect(result.error).toBe('Unknown argument: --unknown-flag. Use --help for usage information.');
        });
    });

    describe('multiple arguments', () => {
        it('should handle multiple flags together', () => {
            const result = parseArgs([
                '--dry-run',
                '--direction', 'monday-to-hubspot'
            ]);

            expect(result.options).toEqual({
                dryRun: true,
                direction: 'monday-to-hubspot',
                detectOrphans: true,
                detectDuplicates: true
            });
            expect(result.error).toBeUndefined();
        });

        it('should handle short flags combined with long flags', () => {
            const result = parseArgs(['-d', '--direction', 'hubspot-to-monday']);

            expect(result.options.dryRun).toBe(true);
            expect(result.options.direction).toBe('hubspot-to-monday');
        });
    });
});

describe('getHelpText', () => {
    it('should return help text string', () => {
        const helpText = getHelpText();

        expect(typeof helpText).toBe('string');
        expect(helpText.length).toBeGreaterThan(0);
    });

    it('should include all CLI options', () => {
        const helpText = getHelpText();

        expect(helpText).toContain('--dry-run');
        expect(helpText).toContain('-d');
        expect(helpText).toContain('--direction');
        expect(helpText).toContain('--help');
        expect(helpText).toContain('-h');
    });

    it('should include direction options', () => {
        const helpText = getHelpText();

        expect(helpText).toContain('monday-to-hubspot');
        expect(helpText).toContain('hubspot-to-monday');
        expect(helpText).toContain('both');
    });

    it('should include usage examples', () => {
        const helpText = getHelpText();

        expect(helpText).toContain('ts-node syncOrchestrator.ts');
    });
});

