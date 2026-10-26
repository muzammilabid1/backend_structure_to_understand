import { createAppConfig } from '../config';
import {
    executeMondayMutation,
    buildFetchBoardQuery,
    createMondayItem,
    fetchBoardWithItems
} from '../mondayService';
import type { SchoolData } from '../types';

const appConfig = createAppConfig(process.env);

describe('executeMondayMutation - Integration Tests', () => {
    const MONDAY_BOARD_ID = process.env.MONDAY_SCHOOLS_BOARD_ID!;

    describe('Successful API calls', () => {
        it('should successfully execute a valid query mutation', async () => {
            const query = buildFetchBoardQuery(MONDAY_BOARD_ID);

            const result = await executeMondayMutation(appConfig, query);

            // Verify response structure
            expect(result).toBeDefined();
            expect(result.boards).toBeDefined();

            if (!result.boards) {
                throw new Error('boards not returned from API');
            }

            expect(Array.isArray(result.boards)).toBe(true);

            if (result.boards.length > 0) {
                const board = result.boards[0];
                expect(board).toHaveProperty('id');
                expect(board).toHaveProperty('name');
                expect(board).toHaveProperty('columns');
                expect(board).toHaveProperty('items_page');
            }
        }, 10000); // 10 second timeout for API call

        it('should successfully create an item in Monday board', async () => {
            const testSchoolData: SchoolData = {
                schoolName: `[TEST] Integration Test School ${Date.now()}`,
                owner: 'Test Owner',
                mainContact: {
                    firstName: 'Test',
                    lastName: 'Contact',
                    email: 'test.contact@integration-test.com',
                    phone: null
                },
                hubspotCompanyId: 'test-hs-id-123',
                hubspotCompanyUrl: 'https://test.hubspot.com/company/123'
            };

            let createdItemId: string | null = null;

            try {
                // Create the item
                const result = await createMondayItem(appConfig, MONDAY_BOARD_ID, testSchoolData);

                expect(result).toBeDefined();
                expect(result.create_item).toBeDefined();

                if (!result.create_item) {
                    throw new Error('create_item not returned from API');
                }

                expect(result.create_item.id).toBeDefined();
                expect(result.create_item.name).toBe(testSchoolData.schoolName);

                createdItemId = result.create_item.id;
                console.log('✅ Created test item:', createdItemId);

            } finally {
                // Clean up: Delete the created item
                if (createdItemId) {
                    try {
                        const deleteMutation = `
                            mutation {
                                delete_item (item_id: ${createdItemId}) {
                                    id
                                }
                            }
                        `;
                        const deleteResult = await executeMondayMutation(appConfig, deleteMutation);
                        expect(deleteResult.delete_item?.id).toBe(createdItemId);
                        console.log('🧹 Cleaned up test item:', createdItemId);
                    } catch (cleanupError) {
                        console.error('⚠️  Failed to clean up test item:', cleanupError);
                    }
                }
            }
        }, 15000); // 15 second timeout for create and delete operations

        it('should return all items across multiple pages when pageSize is smaller than item count', async () => {
            // Seed 3 items so that pageSize: 2 forces the cursor loop to fetch a second page
            const createdItemIds: string[] = [];
            try {
                for (let i = 1; i <= 3; i++) {
                    const schoolData: SchoolData = {
                        schoolName: `[TEST] Pagination Item ${i} ${Date.now()}`,
                        owner: null,
                        mainContact: null,
                        hubspotCompanyId: undefined
                    };
                    const result = await createMondayItem(appConfig, MONDAY_BOARD_ID, schoolData);
                    createdItemIds.push(result.create_item!.id);
                }

                const board = await fetchBoardWithItems(appConfig, MONDAY_BOARD_ID, 2);

                const foundIds = new Set(board.items_page.items.map(i => i.id));
                for (const id of createdItemIds) {
                    expect(foundIds.has(id)).toBe(true);
                }

                console.log(`✓ Pagination verified: all 3 seeded items returned with pageSize=2`);
            } finally {
                for (const id of createdItemIds) {
                    try {
                        await executeMondayMutation(appConfig, `mutation { delete_item(item_id: ${id}) { id } }`);
                    } catch {
                        // best effort cleanup
                    }
                }
            }
        }, 30000);

        it('should handle queries that return empty results', async () => {
            const query = buildFetchBoardQuery(MONDAY_BOARD_ID);

            const result = await executeMondayMutation(appConfig, query);

            expect(result).toBeDefined();
            expect(result.boards).toBeDefined();

            const board = await fetchBoardWithItems(appConfig, MONDAY_BOARD_ID);
            // Board structure should be valid regardless of item count
            expect(Array.isArray(board.items_page.items)).toBe(true);
            expect(board.items_page.items.length).toBeGreaterThanOrEqual(0);
        }, 10000);
    });

    describe('Error handling', () => {
        it('should throw error for invalid GraphQL syntax', async () => {
            // Suppress console.error for this test
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const invalidMutation = `
                mutation {
                    create_item (
                        board_id: ${MONDAY_BOARD_ID}
                        // Missing required fields and has syntax errors
                    }
                }
            `;

            await expect(executeMondayMutation(appConfig, invalidMutation))
                .rejects
                .toThrow('Failed to execute Monday mutation');

            consoleErrorSpy.mockRestore();
        }, 10000);

        it('should return empty boards array for invalid board ID', async () => {
            // Monday API doesn't throw errors for invalid board IDs
            // It returns a successful response with empty boards array
            const invalidBoardQuery = buildFetchBoardQuery('999999999999');

            const result = await executeMondayMutation(appConfig, invalidBoardQuery);


            expect(result).toBeDefined();
            expect(result.boards).toBeDefined();

            if (!result.boards) {
                throw new Error('boards not returned from API');
            }

            expect(Array.isArray(result.boards)).toBe(true);
            expect(result.boards.length).toBe(0);
        }, 10000);

        it('should throw error when fetchBoardWithItems gets invalid board ID', async () => {
            // The higher-level fetchBoardWithItems function validates responses
            // and throws errors for empty boards array
            await expect(fetchBoardWithItems(appConfig, '999999999999'))
                .rejects
                .toThrow('No board found with the specified ID');
        }, 10000);

        it('should throw error for malformed mutation string', async () => {
            // Suppress console.error for this test
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const malformedMutation = 'this is not valid GraphQL';

            await expect(executeMondayMutation(appConfig, malformedMutation))
                .rejects
                .toThrow('Failed to execute Monday mutation');

            consoleErrorSpy.mockRestore();
        }, 10000);

        describe('API Response handling', () => {
            it('should return data property from successful response', async () => {
                const query = buildFetchBoardQuery(MONDAY_BOARD_ID);

                const result = await executeMondayMutation(appConfig, query);

                // The function should return response.data.data
                expect(result).toBeDefined();
                expect(typeof result).toBe('object');
            }, 10000);

            it('should handle Monday API errors in response body', async () => {
                // Suppress console.error for this test
                const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

                // Create a mutation that will cause Monday API to return an error
                const errorCausingMutation = `
                mutation {
                    create_item (
                        board_id: "invalid_board_id",
                        item_name: "Test"
                    ) {
                        id
                    }
                }
            `;

                await expect(executeMondayMutation(appConfig, errorCausingMutation))
                    .rejects
                    .toThrow('Failed to execute Monday mutation');

                // Verify error was logged
                expect(consoleErrorSpy).toHaveBeenCalled();

                consoleErrorSpy.mockRestore();
            }, 10000);
        });

        describe('Real-world scenarios', () => {
            it('should fetch board with all its metadata', async () => {
                const query = buildFetchBoardQuery(MONDAY_BOARD_ID);

                const result = await executeMondayMutation(appConfig, query);

                expect(result.boards).toBeDefined();

                if (!result.boards) {
                    throw new Error('boards not returned from API');
                }

                if (result.boards.length > 0) {
                    const board = result.boards[0];

                    // Verify board structure
                    expect(board.id).toBeDefined();
                    expect(board.name).toBeDefined();
                    expect(Array.isArray(board.columns)).toBe(true);
                    expect(board.items_page).toBeDefined();

                    // Verify columns have proper structure
                    if (board.columns.length > 0) {
                        const column = board.columns[0];
                        expect(column).toHaveProperty('id');
                        expect(column).toHaveProperty('title');
                        expect(column).toHaveProperty('type');
                    }

                    // Verify items structure
                    expect(board.items_page).toHaveProperty('cursor');
                    expect(board.items_page).toHaveProperty('items');
                    expect(Array.isArray(board.items_page.items)).toBe(true);
                }
            }, 10000);

            it('should handle queries with complex nested fields', async () => {
                // Complex query with multiple levels of nesting
                const complexQuery = `
                query {
                    boards (ids: ${MONDAY_BOARD_ID}) {
                        id
                        name
                        columns {
                            id
                            title
                        }
                        items_page(limit: 5) {
                            cursor
                            items {
                                id
                                name
                                column_values {
                                    id
                                    text
                                    value
                                }
                            }
                        }
                    }
                }
            `;

                const result = await executeMondayMutation(appConfig, complexQuery);

                expect(result).toBeDefined();
                expect(result.boards).toBeDefined();
            }, 10000);
        });

    });
});
