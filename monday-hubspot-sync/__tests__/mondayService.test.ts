/**
 * Mock environment variables before importing modules that depend on them
 */


import axios from 'axios';
import {
    buildColumnValues,
    buildCreateItemMutation,
    buildUpdateHubspotFieldsMutation,
    buildFetchBoardQuery,
    validateBoardResponse,
    validateNextItemsPageResponse,
    fetchBoardWithItems
} from '../mondayService';
import type { SchoolData, MondayApiResponse, MondayBoard } from '../types';

jest.mock('axios');
import { OperationDefinitionNode, parse } from 'graphql';
import { createAppConfig } from '../config';

const appConfig = createAppConfig(process.env);

describe('buildColumnValues - Data Transformation Logic', () => {
    const columnIds = appConfig.monday.columnIds;
    it('should only set hubspotRecordId (contact fields are set via board relations)', () => {
        const schoolData: SchoolData = {
            schoolName: 'Test School',
            owner: 'John Doe',
            mainContact: {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@test.com',
                phone: null
            },
            hubspotCompanyId: 'hs-123',
            hubspotCompanyUrl: 'https://hubspot.com/company/123'
        };

        const result = buildColumnValues(schoolData, columnIds);

        expect(result).toEqual({
            col_hubspot_id: 'hs-123'
        });
    });

    it('should not set mainContact or mainContactEmail as text values', () => {
        const schoolData: SchoolData = {
            schoolName: 'Test',
            owner: null,
            mainContact: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'test@test.com',
                phone: null
            },
            hubspotCompanyId: 'hs-456'
        };

        const result = buildColumnValues(schoolData, columnIds);

        expect(result[columnIds.mainContact]).toBeUndefined();
        expect(result[columnIds.mainContactEmail]).toBeUndefined();
    });

    it('should handle undefined hubspotCompanyId', () => {
        const schoolData: SchoolData = {
            schoolName: 'Test',
            owner: null,
            mainContact: {
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'test@test.com',
                phone: null
            },
            hubspotCompanyId: undefined
        };

        const result = buildColumnValues(schoolData, columnIds);

        expect(result[columnIds.hubspotRecordId]).toBeUndefined();
    });
});

describe('buildCreateItemMutation - GraphQL String Generation', () => {
    it('should create a valid GraphQL mutation string', () => {
        const mutation = buildCreateItemMutation('123456', 'Test School', {
            col_id_1: 'value1',
            col_id_2: 'value2'
        });

        // this will throw if the mutation string is invalid
        const ast = parse(mutation);
        expect(ast.definitions).toHaveLength(1);
        expect(ast.definitions[0].kind).toBe('OperationDefinition');
        expect((ast.definitions[0] as OperationDefinitionNode).operation).toBe('mutation');
    })

    it('should generate valid GraphQL mutation structure', () => {
        const boardId = '123456';
        const schoolName = 'Test School';
        const columnValues = {
            col_id_1: 'value1',
            col_id_2: 'value2'
        };

        const mutation = buildCreateItemMutation(boardId, schoolName, columnValues);

        expect(mutation).toContain('mutation {');
        expect(mutation).toContain('create_item');
        expect(mutation).toContain('}');
    });

    it('should include board_id parameter', () => {
        const boardId = '987654';
        const mutation = buildCreateItemMutation(boardId, 'Test', {});

        expect(mutation).toContain(`board_id: ${boardId}`);
    });

    it('should include item_name parameter with quotes', () => {
        const schoolName = 'Springfield Elementary';
        const mutation = buildCreateItemMutation('123', schoolName, {});

        expect(mutation).toContain(`item_name: "${schoolName}"`);
    });

    it('should include column_values as double-stringified JSON', () => {
        const columnValues = {
            text_field: 'some value',
            number_field: '42'
        };

        const mutation = buildCreateItemMutation('123', 'Test', columnValues);

        // Should be double-stringified
        expect(mutation).toContain('column_values:');
        expect(mutation).toContain('\\"text_field\\"');
        expect(mutation).toContain('\\"some value\\"');
    });

    it('should request id and name in response', () => {
        const mutation = buildCreateItemMutation('123', 'Test', {});

        expect(mutation).toContain('id');
        expect(mutation).toContain('name');
    });

    it('should handle school names with special characters', () => {
        const schoolName = "St. Mary's School";
        const mutation = buildCreateItemMutation('123', schoolName, {});

        expect(mutation).toContain(schoolName);
    });

    it('should handle empty column values', () => {
        const mutation = buildCreateItemMutation('123', 'Test', {});

        expect(mutation).toContain('column_values:');
        expect(mutation).toContain('{}');
    });

    it('should handle multiple column values', () => {
        const columnValues = {
            field1: 'value1',
            field2: 'value2',
            field3: 'value3',
            field4: 'value4'
        };

        const mutation = buildCreateItemMutation('123', 'Test', columnValues);

        // All fields should be present
        expect(mutation).toContain('\\"field1\\"');
        expect(mutation).toContain('\\"field2\\"');
        expect(mutation).toContain('\\"field3\\"');
        expect(mutation).toContain('\\"field4\\"');
    });

    it('should handle values with quotes', () => {
        const columnValues = {
            text: 'value with "quotes"'
        };

        const mutation = buildCreateItemMutation('123', 'Test', columnValues);

        // Should be properly escaped in the double-stringified JSON
        expect(mutation).toContain('column_values:');
    });
});

describe('buildUpdateHubspotFieldsMutation - Update Mutation Logic', () => {
    it('should generate valid update mutation structure', () => {
        const boardId = '123456';
        const itemId = '789012';
        const columnValues = {
            hubspot_id: 'hs-123',
            hubspot_url: 'https://hubspot.com/company/123'
        };

        const mutation = buildUpdateHubspotFieldsMutation(boardId, itemId, columnValues);

        expect(mutation).toContain('mutation {');
        expect(mutation).toContain('change_multiple_column_values');
        expect(mutation).toContain('}');
    });

    it('should include board_id parameter', () => {
        const boardId = '999888';
        const mutation = buildUpdateHubspotFieldsMutation(boardId, '123', {});

        expect(mutation).toContain(`board_id: ${boardId}`);
    });

    it('should include item_id parameter', () => {
        const itemId = '555666';
        const mutation = buildUpdateHubspotFieldsMutation('123', itemId, {});

        expect(mutation).toContain(`item_id: ${itemId}`);
    });

    it('should include column_values as double-stringified JSON', () => {
        const columnValues = {
            hubspot_id: 'hs-999',
            hubspot_url: 'https://test.hubspot.com'
        };

        const mutation = buildUpdateHubspotFieldsMutation('123', '456', columnValues);

        expect(mutation).toContain('column_values:');
        expect(mutation).toContain('\\"hubspot_id\\"');
        expect(mutation).toContain('\\"hs-999\\"');
    });

    it('should request id and name in response', () => {
        const mutation = buildUpdateHubspotFieldsMutation('123', '456', {});

        expect(mutation).toContain('id');
        expect(mutation).toContain('name');
    });
});

describe('buildFetchBoardQuery - GraphQL Query Generation', () => {
    it('should create a valid GraphQL query string', () => {
        const query = buildFetchBoardQuery('123456');

        // This will throw if the query string is invalid
        const ast = parse(query);
        expect(ast.definitions).toHaveLength(1);
        expect(ast.definitions[0].kind).toBe('OperationDefinition');
        expect((ast.definitions[0] as OperationDefinitionNode).operation).toBe('query');
    });

    it('should generate valid GraphQL query structure', () => {
        const boardId = '123456';
        const query = buildFetchBoardQuery(boardId);

        expect(query).toContain('query {');
        expect(query).toContain('boards');
        expect(query).toContain('}');
    });

    it('should include board_id parameter', () => {
        const boardId = '987654';
        const query = buildFetchBoardQuery(boardId);

        expect(query).toContain(`boards (ids: ${boardId})`);
    });

    it('should request board metadata fields', () => {
        const query = buildFetchBoardQuery('123');

        expect(query).toContain('id');
        expect(query).toContain('name');
        expect(query).toContain('description');
    });

    it('should request column information', () => {
        const query = buildFetchBoardQuery('123');

        expect(query).toContain('columns {');
        expect(query).toContain('id');
        expect(query).toContain('title');
        expect(query).toContain('type');
    });

    it('should request items_page with cursor', () => {
        const query = buildFetchBoardQuery('123');

        expect(query).toContain('items_page (limit: 500) {');
        expect(query).toContain('cursor');
        expect(query).toContain('items {');
    });

    it('should request item fields', () => {
        const query = buildFetchBoardQuery('123');

        expect(query).toContain('created_at');
        expect(query).toContain('updated_at');
        expect(query).toContain('column_values {');
    });

    it('should request column_values with text and value', () => {
        const query = buildFetchBoardQuery('123');

        expect(query).toContain('column_values {');
        expect(query).toContain('text');
        expect(query).toContain('value');
    });

    it('should handle numeric board IDs', () => {
        const query = buildFetchBoardQuery('999888777');

        expect(query).toContain('boards (ids: 999888777)');
    });
});

describe('validateBoardResponse - Response Validation', () => {
    it('should return the first board from a valid response', () => {
        const mockBoard: MondayBoard = {
            id: '123456',
            name: 'Test Board',
            description: 'Test Description',
            columns: [
                { id: 'col1', title: 'Column 1', type: 'text' }
            ],
            items_page: {
                cursor: null,
                items: []
            }
        };

        const response: MondayApiResponse = {
            data: {
                boards: [mockBoard]
            }
        };

        const result = validateBoardResponse(response);

        expect(result).toEqual(mockBoard);
    });

    it('should throw error when response contains API errors', () => {
        // Suppress expected console.error output
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const response: MondayApiResponse = {
            data: {
                boards: []
            },
            errors: [
                { message: 'API Error' }
            ]
        };

        expect(() => validateBoardResponse(response)).toThrow(
            'Failed to fetch board data from Monday.com'
        );

        consoleErrorSpy.mockRestore();
    });

    it('should throw error when boards array is empty', () => {
        const response: MondayApiResponse = {
            data: {
                boards: []
            }
        };

        expect(() => validateBoardResponse(response)).toThrow(
            'No board found with the specified ID'
        );
    });

    it('should throw error when boards property is undefined', () => {
        const response: MondayApiResponse = {
            data: {
                boards: undefined as any
            }
        };

        expect(() => validateBoardResponse(response)).toThrow(
            'No board found with the specified ID'
        );
    });

    it('should throw error when data is undefined', () => {
        const response: MondayApiResponse = {
            data: undefined as any
        };

        expect(() => validateBoardResponse(response)).toThrow(
            'No board found with the specified ID'
        );
    });

    it('should throw error when data is null', () => {
        const response: MondayApiResponse = {
            data: null as any
        };

        expect(() => validateBoardResponse(response)).toThrow(
            'No board found with the specified ID'
        );
    });

    it('should return the first board when multiple boards are present', () => {
        const firstBoard: MondayBoard = {
            id: '111',
            name: 'First Board',
            description: '',
            columns: [],
            items_page: { cursor: null, items: [] }
        };

        const secondBoard: MondayBoard = {
            id: '222',
            name: 'Second Board',
            description: '',
            columns: [],
            items_page: { cursor: null, items: [] }
        };

        const response: MondayApiResponse = {
            data: {
                boards: [firstBoard, secondBoard]
            }
        };

        expect(() => validateBoardResponse(response)).toThrow(
            'Multiple boards were fetched from Monday.com. This is not expected.'
        );

    });

    it('should handle board with empty description', () => {
        const mockBoard: MondayBoard = {
            id: '123',
            name: 'Test Board',
            description: '',
            columns: [],
            items_page: { cursor: null, items: [] }
        };

        const response: MondayApiResponse = {
            data: {
                boards: [mockBoard]
            }
        };

        const result = validateBoardResponse(response);

        expect(result.description).toBe('');
    });

    it('should handle board with null description', () => {
        const mockBoard: MondayBoard = {
            id: '123',
            name: 'Test Board',
            description: null as any,
            columns: [],
            items_page: { cursor: null, items: [] }
        };

        const response: MondayApiResponse = {
            data: {
                boards: [mockBoard]
            }
        };

        const result = validateBoardResponse(response);

        expect(result.description).toBeNull();
    });

    it('should handle board with items', () => {
        const mockBoard: MondayBoard = {
            id: '123',
            name: 'Test Board',
            description: 'Test',
            columns: [
                { id: 'col1', title: 'Column 1', type: 'text' }
            ],
            items_page: {
                cursor: 'next_page_cursor',
                items: [
                    {
                        id: 'item1',
                        name: 'Test Item',
                        updated_at: '2024-01-02',
                        column_values: [
                            { id: 'col1', text: 'Test Value', value: '"test"' }
                        ]
                    }
                ]
            }
        };

        const response: MondayApiResponse = {
            data: {
                boards: [mockBoard]
            }
        };

        const result = validateBoardResponse(response);

        expect(result.items_page.items).toHaveLength(1);
        expect(result.items_page.items[0].name).toBe('Test Item');
    });

    it('should handle multiple errors in response', () => {
        // Suppress expected console.error output
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const response: MondayApiResponse = {
            data: {
                boards: []
            },
            errors: [
                { message: 'Error 1' },
                { message: 'Error 2' }
            ]
        };

        expect(() => validateBoardResponse(response)).toThrow(
            'Failed to fetch board data from Monday.com'
        );

        consoleErrorSpy.mockRestore();
    });
});

describe('validateNextItemsPageResponse - Response Validation', () => {
    it('should return next_items_page from a valid response', () => {
        const response = {
            data: {
                next_items_page: {
                    cursor: 'next-cursor',
                    items: [{ id: '1', name: 'Item 1', updated_at: '', created_at: '', column_values: [] }]
                }
            }
        };

        const result = validateNextItemsPageResponse(response);

        expect(result.cursor).toBe('next-cursor');
        expect(result.items).toHaveLength(1);
    });

    it('should return next_items_page with null cursor on last page', () => {
        const response = {
            data: {
                next_items_page: { cursor: null, items: [] }
            }
        };

        const result = validateNextItemsPageResponse(response);

        expect(result.cursor).toBeNull();
    });

    it('should throw a clear error when response contains GraphQL errors', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const response = {
            data: null,
            errors: [{ message: 'ComplexityException' }]
        };

        expect(() => validateNextItemsPageResponse(response)).toThrow(
            'Failed to fetch next page of items from Monday.com'
        );

        consoleErrorSpy.mockRestore();
    });

    it('should throw a clear error when next_items_page is missing', () => {
        const response = { data: {} };

        expect(() => validateNextItemsPageResponse(response)).toThrow(
            'Monday.com returned a response without next_items_page data'
        );
    });

    it('should throw a clear error when data is null', () => {
        const response = { data: null };

        expect(() => validateNextItemsPageResponse(response)).toThrow(
            'Monday.com returned a response without next_items_page data'
        );
    });

    it('should throw a clear error when next_items_page is null', () => {
        const response = { data: { next_items_page: null } };

        expect(() => validateNextItemsPageResponse(response)).toThrow(
            'Monday.com returned a response without next_items_page data'
        );
    });
});

describe('fetchBoardWithItems - cursor pagination loop', () => {
    const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

    const makeBoard = (cursor: string | null, itemIds: string[]): MondayBoard => ({
        id: 'board1',
        name: 'Test Board',
        description: '',
        columns: [],
        items_page: {
            cursor,
            items: itemIds.map(id => ({ id, name: `Item ${id}`, updated_at: '', created_at: '', column_values: [] }))
        }
    });

    it('should return board items without following cursor when single page', async () => {
        mockedPost.mockResolvedValueOnce({
            data: { data: { boards: [makeBoard(null, ['1', '2'])] } }
        });

        const board = await fetchBoardWithItems(appConfig, 'board1');

        expect(mockedPost).toHaveBeenCalledTimes(1);
        expect(board.items_page.items).toHaveLength(2);
    });

    it('should accumulate items across multiple pages until cursor is null', async () => {
        mockedPost
            .mockResolvedValueOnce({
                data: { data: { boards: [makeBoard('cursor-1', ['1', '2'])] } }
            })
            .mockResolvedValueOnce({
                data: { data: { next_items_page: { cursor: 'cursor-2', items: [{ id: '3', name: 'Item 3', updated_at: '', created_at: '', column_values: [] }] } } }
            })
            .mockResolvedValueOnce({
                data: { data: { next_items_page: { cursor: null, items: [{ id: '4', name: 'Item 4', updated_at: '', created_at: '', column_values: [] }] } } }
            });

        const board = await fetchBoardWithItems(appConfig, 'board1');

        expect(mockedPost).toHaveBeenCalledTimes(3);
        expect(board.items_page.items.map(i => i.id)).toEqual(['1', '2', '3', '4']);
    });

    it('should propagate errors thrown mid-pagination', async () => {
        mockedPost
            .mockResolvedValueOnce({
                data: { data: { boards: [makeBoard('cursor-1', ['1'])] } }
            })
            .mockResolvedValueOnce({
                data: { errors: [{ message: 'ComplexityException' }] }
            });

        await expect(fetchBoardWithItems(appConfig, 'board1')).rejects.toThrow(
            'Failed to fetch next page of items from Monday.com'
        );
    });
});

describe('GraphQL Mutation Snapshots', () => {
    it('should maintain consistent create mutation format', () => {
        const mutation = buildCreateItemMutation(
            '123456',
            'Snapshot Test School',
            {
                col1: 'value1',
                col2: 'value2'
            }
        );

        expect(mutation).toMatchSnapshot();
    });

    it('should maintain consistent update mutation format', () => {
        const mutation = buildUpdateHubspotFieldsMutation(
            '123456',
            '789012',
            {
                hubspot_id: 'hs-123',
                hubspot_url: 'https://hubspot.com/company/123'
            }
        );

        expect(mutation).toMatchSnapshot();
    });

    it('should maintain consistent fetch board query format', () => {
        const query = buildFetchBoardQuery('123456');

        expect(query).toMatchSnapshot();
    });
});
