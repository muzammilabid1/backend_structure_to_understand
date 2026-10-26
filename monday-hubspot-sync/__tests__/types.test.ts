/**
 * Tests for mondayItemToSchoolData transformation function
 */

import { mondayItemToSchoolData } from '../types';
import { createAppConfig } from '../config';
import type { MondayItem, MondayColumnValue, SchoolData } from '../types';

const appConfig = createAppConfig(process.env);

describe('mondayItemToSchoolData', () => {
    const mockBoardId = '12345678';
    const testColumnIds = appConfig.monday.columnIds;

    /**
     * Helper function to create a mock MondayItem with default values.
     * The mainContact column uses linked_items (connected board), not plain text.
     */
    const createMockMondayItem = (
        overrides: {
            id?: string;
            name?: string;
            columnValues?: Partial<Record<string, string | null>>;
            mainContactName?: string;
            mainContactEmail?: string;
        } = {}
    ): MondayItem => {
        const contactEmailColId = appConfig.monday.columnIds.contactEmail;

        const mainContactName = overrides.mainContactName !== undefined ? overrides.mainContactName : 'Jane Smith';
        const mainContactEmail = overrides.mainContactEmail !== undefined ? overrides.mainContactEmail : 'jane.smith@example.com';

        const linkedItems = [{
            id: 'contact-1',
            name: mainContactName,
            column_values: [{ id: contactEmailColId, text: mainContactEmail, value: mainContactEmail ? `"${mainContactEmail}"` : null }]
        }];

        const defaultColumnValues: Record<string, string | null> = {
            [testColumnIds.owner]: 'John Owner',
            [testColumnIds.hubspotRecordId]: 'hubspot-123'
        };

        const columnValues = { ...defaultColumnValues, ...overrides.columnValues };

        const regularColumnValues: MondayColumnValue[] = Object.entries(columnValues).map(([id, text]) => ({
            id,
            text: text ?? null,
            value: text ? `{"label":"${text}"}` : null
        }));

        const mainContactColumnValue: MondayColumnValue = {
            id: testColumnIds.mainContact,
            text: mainContactName || null,
            value: null,
            linked_items: linkedItems
        };

        return {
            id: overrides.id || 'item-123',
            name: overrides.name || 'Test School',
            updated_at: '2025-01-01T00:00:00Z',
            column_values: [...regularColumnValues, mainContactColumnValue]
        };
    };

    it('should transform a complete MondayItem to SchoolData with all fields', () => {
        const mockItem = createMockMondayItem();

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result).toEqual<SchoolData>({
            schoolName: 'Test School',
            owner: 'John Owner',
            mainContact: {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                phone: null
            },
            mondayUrl: `${process.env.MONDAY_BOARD_BASE_URL}/boards/12345678/pulses/item-123`,
            mondayItemId: 'item-123',
            hubspotCompanyId: 'hubspot-123',
            hubspotCompanyUrl: `${process.env.HUBSPOT_BASE_URL}/contacts/${process.env.HUBSPOT_ACCOUNT_ID}/record/0-2/hubspot-123`
        });
    });

    it('should handle item with no owner (empty string)', () => {
        const mockItem = createMockMondayItem({
            columnValues: { [testColumnIds.owner]: '' }
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.owner).toBeNull();
    });

    it('should handle item with null owner', () => {
        const mockItem = createMockMondayItem({
            columnValues: { [testColumnIds.owner]: null }
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.owner).toBeNull();
    });

    it('should handle main contact with single name', () => {
        const mockItem = createMockMondayItem({
            mainContactName: 'Madonna'
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.mainContact).toEqual({
            firstName: 'Madonna',
            lastName: '',
            email: 'jane.smith@example.com',
            phone: null
        });
    });

    it('should handle main contact with multiple word names', () => {
        const mockItem = createMockMondayItem({
            mainContactName: 'John Paul Smith'
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.mainContact).toEqual({
            firstName: 'John',
            lastName: 'Paul Smith',
            email: 'jane.smith@example.com',
            phone: null
        });
    });

    it('should handle empty main contact name', () => {
        const mockItem = createMockMondayItem({
            mainContactName: ''
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.mainContact).toEqual({
            firstName: '',
            lastName: '',
            email: 'jane.smith@example.com',
            phone: null
        });
    });

    it('should handle missing HubSpot company ID (empty string)', () => {
        const mockItem = createMockMondayItem({
            columnValues: { [testColumnIds.hubspotRecordId]: '' }
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.hubspotCompanyId).toBeUndefined();
    });

    it('should handle missing HubSpot company ID (null)', () => {
        const mockItem = createMockMondayItem({
            columnValues: { [testColumnIds.hubspotRecordId]: null }
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.hubspotCompanyId).toBeUndefined();
    });

    it('should derive HubSpot URL from company ID', () => {
        const mockItem = createMockMondayItem({
            columnValues: { [testColumnIds.hubspotRecordId]: 'custom-id-456' }
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.hubspotCompanyUrl).toBe(
            `${process.env.HUBSPOT_BASE_URL}/contacts/${process.env.HUBSPOT_ACCOUNT_ID}/record/0-2/custom-id-456`
        );
    });

    it('should have undefined HubSpot URL when company ID is missing', () => {
        const mockItem = createMockMondayItem({
            columnValues: { [testColumnIds.hubspotRecordId]: '' }
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.hubspotCompanyUrl).toBeUndefined();
    });

    it('should correctly build Monday URL with provided boardId and item.id', () => {
        const mockItem = createMockMondayItem({
            id: 'custom-item-456'
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, '98765432');

        expect(result.mondayUrl).toBe(`${process.env.MONDAY_BOARD_BASE_URL}/boards/98765432/pulses/custom-item-456`);
        expect(result.mondayItemId).toBe('custom-item-456');
    });

    it('should handle school name from item.name', () => {
        const mockItem = createMockMondayItem({
            name: 'Harvard University'
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.schoolName).toBe('Harvard University');
    });

    it('should handle special characters in school name', () => {
        const mockItem = createMockMondayItem({
            name: 'École Polytechnique & MIT'
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.schoolName).toBe('École Polytechnique & MIT');
    });

    it('should handle main contact with hyphenated last name', () => {
        const mockItem = createMockMondayItem({
            mainContactName: 'Mary Smith-Johnson'
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.mainContact).toEqual({
            firstName: 'Mary',
            lastName: 'Smith-Johnson',
            email: 'jane.smith@example.com',
            phone: null
        });
    });

    it('should handle main contact with apostrophe in name', () => {
        const mockItem = createMockMondayItem({
            mainContactName: "Patrick O'Brien"
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.mainContact).toEqual({
            firstName: 'Patrick',
            lastName: "O'Brien",
            email: 'jane.smith@example.com',
            phone: null
        });
    });

    it('should preserve main contact email exactly as provided', () => {
        const mockItem = createMockMondayItem({
            mainContactEmail: 'test.user+tag@example.co.uk'
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.mainContact).not.toBeNull();
        expect(result.mainContact!.email).toBe('test.user+tag@example.co.uk');
    });

    it('should handle empty email', () => {
        const mockItem = createMockMondayItem({
            mainContactEmail: ''
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.mainContact).not.toBeNull();
        expect(result.mainContact!.email).toBe('');
    });

    it('should handle complete item without any HubSpot data', () => {
        const mockItem = createMockMondayItem({
            mainContactName: 'Bob Johnson',
            mainContactEmail: 'bob@school.edu',
            columnValues: {
                [testColumnIds.owner]: 'Jane Owner',
                [testColumnIds.hubspotRecordId]: ''
            }
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result).toEqual<SchoolData>({
            schoolName: 'Test School',
            owner: 'Jane Owner',
            mainContact: {
                firstName: 'Bob',
                lastName: 'Johnson',
                email: 'bob@school.edu',
                phone: null
            },
            mondayUrl: `${process.env.MONDAY_BOARD_BASE_URL}/boards/12345678/pulses/item-123`,
            mondayItemId: 'item-123',
            hubspotCompanyId: undefined,
            hubspotCompanyUrl: undefined
        });
    });

    it('should handle item with all fields populated', () => {
        const mockItem = createMockMondayItem({
            id: 'item-999',
            name: 'Stanford University',
            mainContactName: 'Robert Williams Jr.',
            mainContactEmail: 'r.williams@stanford.edu',
            columnValues: {
                [testColumnIds.owner]: 'Alice Manager',
                [testColumnIds.hubspotRecordId]: 'hs-company-789'
            }
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, '11111111');

        expect(result).toEqual<SchoolData>({
            schoolName: 'Stanford University',
            owner: 'Alice Manager',
            mainContact: {
                firstName: 'Robert',
                lastName: 'Williams Jr.',
                email: 'r.williams@stanford.edu',
                phone: null
            },
            mondayUrl: `${process.env.MONDAY_BOARD_BASE_URL}/boards/11111111/pulses/item-999`,
            mondayItemId: 'item-999',
            hubspotCompanyId: 'hs-company-789',
            hubspotCompanyUrl: `${process.env.HUBSPOT_BASE_URL}/contacts/${process.env.HUBSPOT_ACCOUNT_ID}/record/0-2/hs-company-789`
        });
    });

    it('should handle whitespace trimming in main contact name', () => {
        const mockItem = createMockMondayItem({
            mainContactName: '  John   Doe  '
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);

        expect(result.mainContact).toEqual({
            firstName: 'John',
            lastName: 'Doe',
            email: 'jane.smith@example.com',
            phone: null
        });
    });

    it('should return correct structure with all optional fields as undefined when empty', () => {
        const mockItem = createMockMondayItem({
            columnValues: {
                [testColumnIds.owner]: '',
                [testColumnIds.hubspotRecordId]: ''
            }
        });

        const result = mondayItemToSchoolData(appConfig, mockItem, mockBoardId);


        expect(result).toHaveProperty('schoolName');
        expect(result).toHaveProperty('owner');
        expect(result).toHaveProperty('mainContact');
        expect(result).toHaveProperty('mondayUrl');
        expect(result).toHaveProperty('mondayItemId');
        expect(result).toHaveProperty('hubspotCompanyId');
        expect(result).toHaveProperty('hubspotCompanyUrl');

        // Verify optional field handling
        expect(result.owner).toBeNull();
        expect(result.hubspotCompanyId).toBeUndefined();
        expect(result.hubspotCompanyUrl).toBeUndefined();

        // Verify required fields are still present
        expect(result.mondayUrl).toBeDefined();
        expect(result.mondayItemId).toBeDefined();
    });
});

