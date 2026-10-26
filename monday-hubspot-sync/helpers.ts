import type { AppConfig } from './config';
import type { MondayColumnValue, MondayItem, MondayItemData } from './types';

/**
 * Extracts linked item IDs from a Monday.com board relation column
 */
export function getLinkedItemIdsFromMondayBoardRelation(columnValues: MondayColumnValue[], columnId: string | undefined): string[] {
    if (!columnId) return [];
    const linkedColumn = columnValues.find((col) => col.id === columnId);
    if (!linkedColumn) return [];
    // @dev https://community.monday.com/t/inconsistent-responses-for-linked-item-ids-in-connectboard-and-dependency-column-values/77457
    if (linkedColumn.linked_items && linkedColumn.linked_items.length > 0) {
        return linkedColumn.linked_items.map((item) => item.id);
    }

    return [];
}

/**
 * Extracts a column value from Monday.com column_values array
 */
export function getColumnValueFromMonday(columnValues: MondayColumnValue[], columnId: string | undefined): string {
    if (!columnId) {
        throw new Error('Column ID is undefined. Please check that the corresponding COLUMN_ID_* environment variable is set.');
    }
    const column = columnValues.find((col) => col.id === columnId);
    if (!column) {
        throw new Error(`Column with ID ${columnId} not found in column_values array. Please check the COLUMN_IDS mapping in config.ts`);
    }
    return column.text?.trim() ?? '';
}

/**
 * Splits a full name into first and last name
 */
export function splitFullName(fullName: string) {
    const parts = fullName.trim().split(' ').filter(Boolean);
    return {
        firstName: parts.at(0) ?? '',
        lastName: parts.slice(1).join(' ') ?? '',
    };
}

/**
 * Builds a Monday.com item URL
 */
export function buildMondayItemUrl(appConfig: AppConfig, boardId: string, itemId: string): string {
    if (!boardId || !itemId) {
        throw new Error('Board ID and item ID are required to build a Monday.com item URL');
    }
    return `${appConfig.monday.boardBaseUrl}/boards/${boardId}/pulses/${itemId}`;
}

/**
 * Filters Monday items to only include schools without HubSpot Record IDs
 */
export function filterSchoolsWithoutHubSpotId(appConfig: AppConfig, items: MondayItem[]): MondayItem[] {
    const filtered = items.filter((item) => {
        const hubspotId = getColumnValueFromMonday(item.column_values, appConfig.monday.columnIds.hubspotRecordId);
        return !hubspotId;
    });

    console.log(`Found ${filtered.length} schools without HubSpot ID out of ${items.length} total schools`);
    return filtered;
}

/**
 * Checks if a school name exists in Monday items (case-insensitive)
 * Returns all matching items
 */
export function schoolExistsInMonday(schoolNameFromHubspot: string, mondayItems: MondayItem[]): MondayItem[] {
    const normalizedSearchName = schoolNameFromHubspot.toLowerCase().trim();

    return mondayItems.filter((item) => {
        const mondayName = item.name.toLowerCase().trim();
        return mondayName === normalizedSearchName;
    });
}

/**
 * Finds the best match from multiple Monday items with the same name
 * Uses additional fields like email to disambiguate
 */
export function findBestMatch(appConfig: AppConfig, schoolNameFromHubspot: string, hubspotData: MondayItemData, matchingItems: MondayItem[]): MondayItem | null {
    // If only one match, return it
    if (matchingItems.length === 1) {
        return matchingItems[0];
    }

    // If no matches, return null
    if (matchingItems.length === 0) {
        return null;
    }

    // Multiple matches - try to disambiguate using email
    const hubspotEmail = hubspotData.columnValues.main_contact_email?.toLowerCase().trim();

    if (hubspotEmail) {
        const emailMatch = matchingItems.find((item) => {
            const mondayEmail = getColumnValueFromMonday(item.column_values, appConfig.monday.columnIds.mainContactEmail).toLowerCase().trim();
            return mondayEmail === hubspotEmail;
        });

        if (emailMatch) {
            return emailMatch;
        }
    }

    // If we can't disambiguate, log a warning and return null to be safe
    console.warn(
        `⚠ Multiple items found with name "${schoolNameFromHubspot}" and cannot disambiguate. Skipping to avoid incorrect updates.`
    );
    return null;
}

const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com', 'googlemail.com',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.com.au',
    'hotmail.com', 'hotmail.co.uk',
    'outlook.com', 'outlook.co.uk',
    'icloud.com', 'me.com', 'mac.com',
    'live.com', 'live.co.uk',
    'aol.com',
    'protonmail.com', 'proton.me',
    'msn.com',
]);

/**
 * Extracts the company domain from an email address, returning null for free/personal email providers
 */
export function getCompanyDomain(email: string | null | undefined): string | null {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length !== 2) return null;
    const domain = parts[1].toLowerCase().trim();
    if (FREE_EMAIL_DOMAINS.has(domain)) return null;
    return domain;
}

/**
 * Checks if HubSpot-specific fields in Monday are up to date
 */
export function checkHubspotFieldsInMonday(appConfig: AppConfig, mondayItem: MondayItem, hubspotData: MondayItemData): boolean {
    const mondayHubspotId = getColumnValueFromMonday(mondayItem.column_values, appConfig.monday.columnIds.hubspotRecordId);
    const expectedHubspotId = hubspotData.columnValues.hubspot_record_id;

    return mondayHubspotId === expectedHubspotId;
}


