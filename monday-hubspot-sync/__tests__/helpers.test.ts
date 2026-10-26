/**
 * Test environment variables are set in __tests__/setup.ts
 */

import {
	buildMondayItemUrl,
	getColumnValueFromMonday,
	splitFullName,
	filterSchoolsWithoutHubSpotId,
	getCompanyDomain,
} from "../helpers";
import { MondayColumnValue, MondayItem } from "../types";
import { createAppConfig } from "../config";

const appConfig = createAppConfig(process.env);

describe("buildMondayItemUrl", () => {
	it("should correctly build a Monday.com item URL with valid boardId and itemId", () => {
		const boardId = process.env.MONDAY_SCHOOLS_BOARD_ID!;
		const itemId = "87654321";

		const result = buildMondayItemUrl(appConfig, boardId, itemId);

		expect(result).toBe(
			`${process.env.MONDAY_BOARD_BASE_URL}/boards/${boardId}/pulses/87654321`,
		);
	});

	it("should handle numeric IDs as strings", () => {
		const boardId = "999999999";
		const itemId = "111111111";

		const result = buildMondayItemUrl(appConfig, boardId, itemId);

		expect(result).toBe(
			`${process.env.MONDAY_BOARD_BASE_URL}/boards/999999999/pulses/111111111`,
		);
	});

	it("should throw an error if boardId or itemId is empty", () => {
		const boardId = "";
		const itemId = "";

		expect(() => buildMondayItemUrl(appConfig, boardId, itemId)).toThrow(
			"Board ID and item ID are required to build a Monday.com item URL",
		);
	});

	it("should use the MONDAY_BOARD_BASE_URL from environment config", () => {
		const boardId = "board123";
		const itemId = "item456";

		const result = buildMondayItemUrl(appConfig, boardId, itemId);

		expect(result).toContain(process.env.MONDAY_BOARD_BASE_URL);
		expect(result).toContain(`/boards/${boardId}/pulses/${itemId}`);
	});

	it("should preserve special characters in IDs", () => {
		const boardId = "board-123_test";
		const itemId = "item-456_test";

		const result = buildMondayItemUrl(appConfig, boardId, itemId);

		expect(result).toBe(
			`${process.env.MONDAY_BOARD_BASE_URL}/boards/board-123_test/pulses/item-456_test`,
		);
	});
});

describe("getColumnValueFromMonday", () => {
	it("should return the text value when column exists", () => {
		const columnValues: MondayColumnValue[] = [
			{ id: "column1", text: "Test Value", value: '{"label":"Test Value"}' },
			{
				id: "column2",
				text: "Another Value",
				value: '{"label":"Another Value"}',
			},
		];

		const result = getColumnValueFromMonday(columnValues, "column1");

		expect(result).toBe("Test Value");
	});

	it("should throw an error when column does not exist", () => {
		const columnValues: MondayColumnValue[] = [
			{ id: "column1", text: "Test Value", value: '{"label":"Test Value"}' },
		];

		expect(() => getColumnValueFromMonday(columnValues, "nonexistent")).toThrow(
			"Column with ID nonexistent not found in column_values array. Please check the COLUMN_IDS mapping in config.ts",
		);
	});

	it("should return empty string when column text is null", () => {
		const columnValues: MondayColumnValue[] = [
			{ id: "column1", text: null, value: '{"label":"Test"}' },
		];

		const result = getColumnValueFromMonday(columnValues, "column1");

		expect(result).toBe("");
	});

	it("should return empty string when column text is undefined", () => {
		const columnValues: MondayColumnValue[] = [
			{ id: "column1", text: undefined as any, value: '{"label":"Test"}' },
		];

		const result = getColumnValueFromMonday(columnValues, "column1");

		expect(result).toBe("");
	});

	it("should throw an error when columnValues array is empty", () => {
		const columnValues: MondayColumnValue[] = [];

		expect(() => getColumnValueFromMonday(columnValues, "column1")).toThrow(
			"Column with ID column1 not found in column_values array. Please check the COLUMN_IDS mapping in config.ts",
		);
	});

	it("should throw an error when columnId is undefined", () => {
		const columnValues: MondayColumnValue[] = [
			{ id: "column1", text: "Test Value", value: '{"label":"Test Value"}' },
		];

		expect(() => getColumnValueFromMonday(columnValues, undefined as any)).toThrow(
			"Column ID is undefined. Please check that the corresponding COLUMN_ID_* environment variable is set.",
		);
	});

	it("should handle multiple columns and return correct value", () => {
		const columnValues: MondayColumnValue[] = [
			{ id: "owner", text: "John Doe", value: '{"label":"John Doe"}' },
			{ id: "email", text: "john@example.com", value: "john@example.com" },
			{ id: "phone", text: "123-456-7890", value: "123-456-7890" },
		];

		const emailResult = getColumnValueFromMonday(columnValues, "email");
		const phoneResult = getColumnValueFromMonday(columnValues, "phone");

		expect(emailResult).toBe("john@example.com");
		expect(phoneResult).toBe("123-456-7890");
	});

	it("should return empty string value (not null) for consistency", () => {
		const columnValues: MondayColumnValue[] = [
			{ id: "column1", text: null, value: null },
		];

		const result = getColumnValueFromMonday(columnValues, "column1");

		expect(result).toBe("");
		expect(result).not.toBeNull();
	});

	it("should handle special characters in text values", () => {
		const columnValues: MondayColumnValue[] = [
			{
				id: "column1",
				text: 'Test & Special <Characters> "Quotes"',
				value: "{}",
			},
		];

		const result = getColumnValueFromMonday(columnValues, "column1");

		expect(result).toBe('Test & Special <Characters> "Quotes"');
	});
});

describe("splitFullName", () => {
	it("should split a full name with first and last name", () => {
		const result = splitFullName("John Doe");

		expect(result).toEqual({ firstName: "John", lastName: "Doe" });
	});

	it("should handle a single word name as first name only", () => {
		const result = splitFullName("Madonna");

		expect(result).toEqual({ firstName: "Madonna", lastName: "" });
	});

	it("should handle empty string and return empty first and last name", () => {
		const result = splitFullName("");

		expect(result).toEqual({ firstName: "", lastName: "" });
	});

	it("should handle names with multiple spaces and combine into last name", () => {
		const result = splitFullName("John Paul Smith");

		expect(result).toEqual({ firstName: "John", lastName: "Paul Smith" });
	});

	it("should handle names with leading and trailing whitespace", () => {
		const result = splitFullName("  John Doe  ");

		expect(result).toEqual({ firstName: "John", lastName: "Doe" });
	});

	it("should handle names with multiple consecutive spaces", () => {
		const result = splitFullName("John    Doe");

		expect(result).toEqual({ firstName: "John", lastName: "Doe" });
	});

	it("should handle names with only whitespace", () => {
		const result = splitFullName("   ");

		expect(result).toEqual({ firstName: "", lastName: "" });
	});

	it("should handle hyphenated last names", () => {
		const result = splitFullName("Mary Smith-Johnson");

		expect(result).toEqual({ firstName: "Mary", lastName: "Smith-Johnson" });
	});

	it("should handle names with apostrophes", () => {
		const result = splitFullName("Patrick O'Brien");

		expect(result).toEqual({ firstName: "Patrick", lastName: "O'Brien" });
	});

	it("should handle names with special characters", () => {
		const result = splitFullName("José María García");

		expect(result).toEqual({ firstName: "José", lastName: "María García" });
	});

	it("should handle very long compound last names", () => {
		const result = splitFullName("Juan Carlos de la Cruz y García");

		expect(result).toEqual({
			firstName: "Juan",
			lastName: "Carlos de la Cruz y García",
		});
	});

	it("should trim trailing spaces in first and last name", () => {
		const result = splitFullName("   John Doe   ");

		expect(result).toEqual({ firstName: "John", lastName: "Doe" });
	});

	it("should handle names with periods", () => {
		const result = splitFullName("Dr. John Smith");

		expect(result).toEqual({ firstName: "Dr.", lastName: "John Smith" });
	});

	it("should handle names with tabs and newlines as part of the string", () => {
		const result = splitFullName("John\t\nDoe");

		expect(result).toEqual({ firstName: "John\t\nDoe", lastName: "" });
	});
});

describe('filterSchoolsWithoutHubSpotId', () => {
    // Helper function to create a mock MondayItem
    // Non-null assertions used because setup.ts sets these env vars before tests run
    const createMockMondayItem = (
        id: string,
        name: string,
        hubspotId: string | null = null
    ): MondayItem => {
        return {
            id,
            name,
            updated_at: '2025-01-01T00:00:00Z',
            column_values: [
                {
                    id: appConfig.monday.columnIds.hubspotRecordId,
                    text: hubspotId,
                    value: hubspotId ? `{"label":"${hubspotId}"}` : null
                }
            ]
        };
    };

	// Mock console.log to prevent test output clutter
	beforeEach(() => {
		jest.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("should return empty array when input array is empty", () => {
		const result = filterSchoolsWithoutHubSpotId(appConfig, []);

		expect(result).toEqual([]);
		expect(result.length).toBe(0);
	});

    it('should filter out items that have HubSpot ID', () => {
        const items: MondayItem[] = [
            createMockMondayItem('1', 'School A', '12345'),
            createMockMondayItem('2', 'School B', null)
        ];

		const result = filterSchoolsWithoutHubSpotId(appConfig, items);

		expect(result.length).toBe(1);
		expect(result[0].id).toBe("2");
		expect(result[0].name).toBe("School B");
	});

    it('should include items with missing HubSpot ID', () => {
        const items: MondayItem[] = [
            createMockMondayItem('1', 'School A', null)
        ];

		const result = filterSchoolsWithoutHubSpotId(appConfig, items);

		expect(result.length).toBe(1);
		expect(result[0].id).toBe("1");
	});

    it('should include items with empty string HubSpot ID', () => {
        const items: MondayItem[] = [
            createMockMondayItem('1', 'School A', '')
        ];

		const result = filterSchoolsWithoutHubSpotId(appConfig, items);

		expect(result.length).toBe(1);
		expect(result[0].id).toBe("1");
	});

    it('should include items with whitespace-only HubSpot ID', () => {
        const items: MondayItem[] = [
            createMockMondayItem('1', 'School A', '   ')
        ];

		const result = filterSchoolsWithoutHubSpotId(appConfig, items);

		expect(result.length).toBe(1);
		expect(result[0].id).toBe("1");
	});

    it('should handle mixed scenarios correctly', () => {
        const items: MondayItem[] = [
            createMockMondayItem('1', 'School A', '12345'), // Should be filtered out
            createMockMondayItem('2', 'School B', null), // Should be included
            createMockMondayItem('3', 'School C', ''), // Should be included
            createMockMondayItem('4', 'School D', '67890'), // Should be filtered out
            createMockMondayItem('5', 'School E', '   '), // Should be included
        ];

		const result = filterSchoolsWithoutHubSpotId(appConfig, items);

        expect(result.length).toBe(3);
        expect(result.map(item => item.id)).toEqual(['2', '3', '5']);
    });

    it('should return all items when none have HubSpot ID populated', () => {
        const items: MondayItem[] = [
            createMockMondayItem('1', 'School A', null),
            createMockMondayItem('2', 'School B', ''),
            createMockMondayItem('3', 'School C', '   ')
        ];

		const result = filterSchoolsWithoutHubSpotId(appConfig, items);

		expect(result.length).toBe(3);
		expect(result).toEqual(items);
	});

    it('should return empty array when all items have HubSpot ID populated', () => {
        const items: MondayItem[] = [
            createMockMondayItem('1', 'School A', '12345'),
            createMockMondayItem('2', 'School B', '67890'),
            createMockMondayItem('3', 'School C', '99999')
        ];

		const result = filterSchoolsWithoutHubSpotId(appConfig, items);

		expect(result.length).toBe(0);
		expect(result).toEqual([]);
	});

    it('should not mutate the original array', () => {
        const items: MondayItem[] = [
            createMockMondayItem('1', 'School A', '12345'),
            createMockMondayItem('2', 'School B', null)
        ];
        const originalLength = items.length;
        const originalFirstItem = items[0];

		const result = filterSchoolsWithoutHubSpotId(appConfig, items);

		expect(items.length).toBe(originalLength);
		expect(items[0]).toBe(originalFirstItem);
		expect(result).not.toBe(items);
	});

    it('should handle items with HubSpot ID but trimmed whitespace results in empty string', () => {
        const items: MondayItem[] = [
            createMockMondayItem('1', 'School A', '\t  \n  ')
        ];

		const result = filterSchoolsWithoutHubSpotId(appConfig, items);

		expect(result.length).toBe(1);
		expect(result[0].id).toBe("1");
	});

    it('should preserve all properties of filtered items', () => {
        const item = createMockMondayItem('1', 'School A', null);
        const items: MondayItem[] = [item];

		const result = filterSchoolsWithoutHubSpotId(appConfig, items);

		expect(result[0]).toEqual(item);
		expect(result[0].id).toBe("1");
		expect(result[0].name).toBe("School A");
		expect(result[0].updated_at).toBe("2025-01-01T00:00:00Z");
		expect(result[0].column_values).toBeDefined();
	});
});

describe('getCompanyDomain', () => {
    it('should return the domain for a business email', () => {
        expect(getCompanyDomain('john@springfield-elementary.edu')).toBe('springfield-elementary.edu');
    });

    it('should return null for gmail', () => {
        expect(getCompanyDomain('john@gmail.com')).toBeNull();
    });

    it('should return null for yahoo', () => {
        expect(getCompanyDomain('john@yahoo.com')).toBeNull();
    });

    it('should return null for hotmail', () => {
        expect(getCompanyDomain('john@hotmail.com')).toBeNull();
    });

    it('should return null for outlook', () => {
        expect(getCompanyDomain('john@outlook.com')).toBeNull();
    });

    it('should return null for icloud', () => {
        expect(getCompanyDomain('john@icloud.com')).toBeNull();
    });

    it('should return null for null input', () => {
        expect(getCompanyDomain(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
        expect(getCompanyDomain(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
        expect(getCompanyDomain('')).toBeNull();
    });

    it('should return null for invalid email with no @', () => {
        expect(getCompanyDomain('notanemail')).toBeNull();
    });

    it('should be case-insensitive for free domains', () => {
        expect(getCompanyDomain('john@GMAIL.COM')).toBeNull();
    });

    it('should return domain in lowercase for business emails', () => {
        expect(getCompanyDomain('John@School.EDU')).toBe('school.edu');
    });
});
