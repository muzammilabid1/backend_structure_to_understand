import axios from 'axios';

import type { AppConfig } from './config';
import type { MondayApiResponse, MondayBoard, MondayItem, SchoolData, MondayMutationResponse, MainContact } from './types';

export function buildColumnValues(
    schoolData: SchoolData,
    columnIds: AppConfig['monday']['columnIds']
): Record<string, unknown> {
    if (!columnIds.hubspotRecordId) {
        throw new Error('HUBSPOT_RECORD_ID column ID is required. Check that COLUMN_ID_HUBSPOT_RECORD_ID environment variable is set.');
    }

    // Contact fields (mainContact, mainContactEmail) are intentionally excluded here.
    // They are stored on the separate Contacts board and linked to the school via a
    // board relation column (mainContact). See createMondayItemWithContacts() for the
    // full flow. Setting them as text on the Schools board would bypass the relation.
    const values: Record<string, unknown> = {
        [columnIds.hubspotRecordId]: schoolData.hubspotCompanyId
    };

    return values;
}

export function buildCreateItemMutation(boardId: string, schoolName: string, columnValuesObj: Record<string, unknown>) {
    const columnValuesString = JSON.stringify(columnValuesObj);

    return `
    mutation {
      create_item (
        board_id: ${boardId},
        item_name: "${schoolName}",
        column_values: ${JSON.stringify(columnValuesString)}
      ) {
        id
        name
      }
    }
  `;
}


export async function executeMondayMutation(appConfig: AppConfig, mutation: string): Promise<MondayMutationResponse> {
    try {
        const response = await axios.post<{ data: MondayMutationResponse; errors?: Array<{ message: string }> }>(
            appConfig.monday.apiUrl,
            { query: mutation },
            {
                headers: {
                    Authorization: `Bearer ${appConfig.monday.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.errors) {
            console.error('Monday API errors:', JSON.stringify(response.data.errors, null, 2));
            throw new Error('Failed to execute Monday mutation');
        }

        return response.data.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.errors) {
            console.error('Monday API errors:', JSON.stringify(error.response.data.errors, null, 2));
        }
        console.error('Error executing Monday mutation:', error);
        throw new Error('Failed to execute Monday mutation');
    }
}


export async function createMondayItem(appConfig: AppConfig, boardId: string, schoolData: SchoolData): Promise<MondayMutationResponse> {
    const columnValuesObj = buildColumnValues(schoolData, appConfig.monday.columnIds);
    const mutation = buildCreateItemMutation(boardId, schoolData.schoolName, columnValuesObj);
    return executeMondayMutation(appConfig, mutation);
}
/**
 * Builds the GraphQL query for fetching a board with its items and columns
 */
export function buildFetchBoardQuery(boardId: string, limit = 500): string {
    return `
    query {
      boards (ids: ${boardId}) {
        id
        name
        description
        columns {
          id
          title
          type
        }
        items_page (limit: ${limit}) {
          cursor
          items {
            id
            name
            created_at
            updated_at
            column_values {
              id
              text
              value
              ... on BoardRelationValue {
                linked_items {
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
        }
      }
    }
  `;
}

/**
 * Builds the GraphQL query for fetching subsequent pages of board items using a cursor
 */
export function buildNextItemsPageQuery(cursor: string, limit = 500): string {
    return `
    query {
      next_items_page (limit: ${limit}, cursor: "${cursor}") {
        cursor
        items {
          id
          name
          created_at
          updated_at
          column_values {
            id
            text
            value
            ... on BoardRelationValue {
              linked_items {
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
      }
    }
  `;
}

/**
 * Validates a next_items_page pagination response and extracts the page data
 * @throws {Error} If response contains GraphQL errors or next_items_page is missing
 */
export function validateNextItemsPageResponse(
    response: { data?: { next_items_page?: { cursor: string | null; items: MondayItem[] } | null } | null; errors?: Array<{ message: string }> }
): { cursor: string | null; items: MondayItem[] } {
    if (response.errors) {
        console.error('Monday API errors:', response.errors);
        throw new Error('Failed to fetch next page of items from Monday.com');
    }

    const nextPage = response.data?.next_items_page;
    if (!nextPage) {
        throw new Error('Monday.com returned a response without next_items_page data');
    }

    return nextPage;
}

/**
 * Validates the Monday API response and extracts the board data
 * @throws {Error} If response contains errors or no board is found
 */
export function validateBoardResponse(response: MondayApiResponse): MondayBoard {
    if (response.errors) {
        console.error('Monday API errors:', response.errors);
        throw new Error('Failed to fetch board data from Monday.com');
    }

    const boards = response.data?.boards;
    if (!boards || boards.length === 0) {
        throw new Error('No board found with the specified ID');
    }
    if(boards.length > 1) {
        throw new Error('Multiple boards were fetched from Monday.com. This is not expected.');
    }

    return boards[0];
}

/**
 * Fetches a Monday board with its items and column metadata.
 * Follows the cursor to retrieve all pages of items.
 */
export async function fetchBoardWithItems(appConfig: AppConfig, boardId: string, pageSize = 500): Promise<MondayBoard> {
    const query = buildFetchBoardQuery(boardId, pageSize);

    try {
        const response = await axios.post<MondayApiResponse>(
            appConfig.monday.apiUrl,
            { query },
            {
                headers: {
                    Authorization: `Bearer ${appConfig.monday.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const board = validateBoardResponse(response.data);

        let cursor = board.items_page.cursor;
        while (cursor) {
            const nextQuery = buildNextItemsPageQuery(cursor, pageSize);
            const nextResponse = await axios.post<{ data?: { next_items_page?: { cursor: string | null; items: MondayItem[] } | null } | null; errors?: Array<{ message: string }> }>(
                appConfig.monday.apiUrl,
                { query: nextQuery },
                {
                    headers: {
                        Authorization: `Bearer ${appConfig.monday.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const nextPage = validateNextItemsPageResponse(nextResponse.data);
            board.items_page.items.push(...nextPage.items);
            cursor = nextPage.cursor;
        }

        return board;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error fetching board:', error.message);
            throw new Error('Failed to connect to Monday.com API');
        }
        throw error;
    }
}

/**
 * Builds the GraphQL mutation string for updating HubSpot fields in a Monday item
 */
export function buildUpdateHubspotFieldsMutation(boardId: string, itemId: string, columnValuesObj: Record<string, any>) {
    const columnValuesString = JSON.stringify(columnValuesObj);

    return `
    mutation {
      change_multiple_column_values (
        board_id: ${boardId},
        item_id: ${itemId},
        column_values: ${JSON.stringify(columnValuesString)}
      ) {
        id
        name
      }
    }
  `;
}

/**
 * Updates HubSpot-specific fields in an existing Monday item
 */
export async function updateHubspotFieldsInMonday(
    appConfig: AppConfig,
    boardId: string,
    schoolData: SchoolData
): Promise<void> {
    if (!schoolData.hubspotCompanyId) {
        throw new Error('HubSpot company ID is required to update Monday with Hubspot specific fields');
    }
    if (!schoolData.mondayItemId) {
        throw new Error('Monday item ID is required to update the item');
    }

    const columnValuesObj = buildColumnValues(schoolData, appConfig.monday.columnIds);

    const mutation = buildUpdateHubspotFieldsMutation(boardId, schoolData.mondayItemId, columnValuesObj);

    await executeMondayMutation(appConfig, mutation);
}

/**
 * Creates a contact item on the Contact board
 * @param contact - Contact data
 * @param schoolItemId - Optional school item ID to link via board relation at creation time
 * @returns The ID of the created contact item
 */
export async function createContactOnContactBoard(appConfig: AppConfig, contact: MainContact, schoolItemId?: string): Promise<string> {
    const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown Contact';

    const columnValues: Record<string, unknown> = {};

    if (contact.email) {
        columnValues[appConfig.monday.columnIds.contactEmail] = { email: contact.email, text: contact.email };
    }

    // Set the reverse board relation on the contact at creation time. This links the
    // contact back to the school item and keeps the relation bidirectional. Monday.com
    // board relations must be established from both sides: here we set Contact → School,
    // and updateSchoolContactLink() later sets School → Contact.
    if (schoolItemId && appConfig.monday.columnIds.schoolContact) {
        columnValues[appConfig.monday.columnIds.schoolContact] = { item_ids: [Number(schoolItemId)] };
    }

    const mutation = buildCreateItemMutation(
        appConfig.monday.schoolsContactBoardId,
        contactName,
        columnValues
    );

    const response = await executeMondayMutation(appConfig, mutation);

    if (!response.create_item?.id) {
        throw new Error('Failed to create contact on Contact board - no item ID returned');
    }

    return response.create_item.id;
}

/**
 * Creates multiple contacts on the Contact board
 * @param contacts - Array of contact data
 * @param schoolItemId - Optional school item ID to link via board relation at creation time
 * @returns Array of created contact item IDs
 */
export async function createContactsOnContactBoard(appConfig: AppConfig, contacts: MainContact[], schoolItemId?: string): Promise<string[]> {
    const contactIds: string[] = [];

    for (const contact of contacts) {
        if (!contact.email && !contact.firstName && !contact.lastName) {
            console.log('  ⏭ Skipping contact with no name or email');
            continue;
        }

        const contactId = await createContactOnContactBoard(appConfig, contact, schoolItemId);
        contactIds.push(contactId);
        console.log(`  ✓ Created contact on Contact board (ID: ${contactId})`);
    }

    return contactIds;
}

/**
 * Updates the Contact School column on a contact item to link back to the school
 */
async function updateContactSchoolLink(appConfig: AppConfig, contactItemId: string, schoolItemId: string): Promise<void> {
    const columnValue = JSON.stringify({ item_ids: [parseInt(schoolItemId)] });

    const mutation = `
    mutation {
      change_column_value (
        board_id: ${appConfig.monday.schoolsContactBoardId},
        item_id: ${contactItemId},
        column_id: "${appConfig.monday.columnIds.schoolContact}",
        value: ${JSON.stringify(columnValue)}
      ) {
        id
      }
    }
  `;

    await executeMondayMutation(appConfig, mutation);
}

/**
 * Updates multiple contacts with the school link
 */
export async function updateContactsSchoolLink(appConfig: AppConfig, contactItemIds: string[], schoolItemId: string): Promise<void> {
    for (const contactId of contactItemIds) {
        await updateContactSchoolLink(appConfig, contactId, schoolItemId);
        console.log(`  ✓ Linked contact ${contactId} to school ${schoolItemId}`);
    }
}

/**
 * Builds column values for school creation including Main Contact as board relation
 */
export function buildColumnValuesWithContactRelation(
    schoolData: SchoolData,
    columnIds: AppConfig['monday']['columnIds'],
    contactItemIds: string[]
): Record<string, unknown> {
    if (!columnIds.hubspotRecordId) {
        throw new Error('HUBSPOT_RECORD_ID column ID is required. Check that MONDAY_SCHOOLS_BOARD_COLUMN_ID_HUBSPOT_RECORD_ID environment variable is set.');
    }

    const values: Record<string, unknown> = {
        [columnIds.hubspotRecordId]: schoolData.hubspotCompanyId
    };

    // Add Main Contact as board relation (linked items)
    if (contactItemIds.length > 0 && columnIds.mainContact) {
        values[columnIds.mainContact] = { item_ids: contactItemIds };
    }

    return values;
}

/**
 * Creates a Monday item with contacts linked via board relation
 * Full flow:
 * 1. Create contacts on Contact board
 * 2. Create school item with Main Contact linked to contacts
 * 3. Update contacts with link back to school
 *
 * @returns The school item ID and contact item IDs
 */
/**
 * Links contact items to a school item via the Main Contact board relation column.
 * This is the School → Contact side of the bidirectional relation. It must be called
 * after contacts are created because we need their Monday item IDs to populate the
 * board relation value.
 */
export async function updateSchoolContactLink(appConfig: AppConfig, schoolItemId: string, contactItemIds: string[], boardId: string): Promise<void> {
    const columnValue = JSON.stringify({ item_ids: contactItemIds.map(Number) });

    const mutation = `
    mutation {
      change_column_value (
        board_id: ${boardId},
        item_id: ${schoolItemId},
        column_id: "${appConfig.monday.columnIds.mainContact}",
        value: ${JSON.stringify(columnValue)}
      ) {
        id
      }
    }
  `;

    await executeMondayMutation(appConfig, mutation);
}

/**
 * Creates a Monday school item together with its contacts, establishing board relations
 * between the Schools board and the Contacts board.
 *
 * Architecture note: contacts are stored as separate items on the Contacts board rather
 * than as text fields on the Schools board. This allows contacts to be reused across
 * schools, supports richer contact data, and enables Monday automations on the Contacts
 * board. See ADR docs/adr/001-board-relations-for-contacts.md for the full decision.
 *
 * The creation order is important and cannot be changed:
 *   1. School item must be created first so we have its ID to pass to contacts.
 *   2. Contacts are created next, with the school ID embedded as a reverse relation
 *      (Contact → School). This seeds the bidirectional link from the contact side.
 *   3. School is updated last to set the forward relation (School → Contact) using the
 *      contact IDs returned in step 2. Monday requires both sides to be set explicitly.
 */
export async function createMondayItemWithContacts(
    appConfig: AppConfig,
    boardId: string,
    schoolData: SchoolData
): Promise<{ schoolItemId: string; contactItemIds: string[] }> {
    // Gather all contacts (main + additional)
    const allContacts: MainContact[] = [];
    if (schoolData.mainContact) {
        allContacts.push(schoolData.mainContact);
    }
    if (schoolData.additionalContacts) {
        allContacts.push(...schoolData.additionalContacts);
    }

    // Step 1: Create the school item with only the HubSpot record ID column set.
    // Contact fields are excluded here — they will be linked via board relation below.
    console.log(`  🏫 Creating school item...`);
    const schoolColumnValues: Record<string, unknown> = {};
    if (schoolData.hubspotCompanyId) {
        schoolColumnValues[appConfig.monday.columnIds.hubspotRecordId] = schoolData.hubspotCompanyId;
    }
    const mutation = buildCreateItemMutation(boardId, schoolData.schoolName, schoolColumnValues);
    const response = await executeMondayMutation(appConfig, mutation);

    const schoolItemId = response.create_item?.id;
    if (!schoolItemId) {
        throw new Error('Failed to create school item - no item ID returned');
    }
    console.log(`  ✓ Created school item (ID: ${schoolItemId})`);

    // Step 2: Create contacts on the Contacts board. Pass schoolItemId so each contact
    // immediately gets the reverse relation (Contact → School) set at creation time,
    // reducing the number of subsequent mutation calls needed.
    console.log(`  📇 Creating ${allContacts.length} contact(s) on Contact board...`);
    const contactItemIds = await createContactsOnContactBoard(appConfig, allContacts, schoolItemId);

    // Step 3: Update the school's Main Contact board relation column with all contact IDs.
    // This is the School → Contact side of the relation and must happen after contacts
    // are created because we need their IDs.
    if (contactItemIds.length > 0) {
        console.log(`  🔗 Linking contacts to school...`);
        await updateSchoolContactLink(appConfig, schoolItemId, contactItemIds, boardId);
        console.log(`  ✓ Linked ${contactItemIds.length} contact(s) to school`);
    }

    return { schoolItemId, contactItemIds };
}
