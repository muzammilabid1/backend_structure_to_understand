import type { AppConfig } from './config';
import { getColumnValueFromMonday, splitFullName, buildMondayItemUrl } from './helpers';

/**
 * HubSpot types
 */

export type MainContact = {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
};
export interface HubspotCompanyResultWithContacts {
    companyId: string;
    companyName: string;
    companyOwner: string | null;
    mondayUrl: string | null;
    companyUrl: string | null;
    contacts: MainContact[];
}

/**
 * Unified School Data Type
 * Used by business logic regardless of source (Monday or HubSpot)
 * Source data is transformed directly to this structure using transformation functions
 */
export interface SchoolData {
    schoolName: string;
    owner: string | null;
    mainContact: MainContact | null;

    mondayUrl?: string;
    mondayItemId?: string;
    hubspotCompanyId?: string;
    hubspotCompanyUrl?: string;
    additionalContacts?: MainContact[];
}

/**
 * Monday.com types
 */

export interface MondayLinkedItem {
    id: string;
    name: string;
    column_values: Array<{ id: string; text: string | null; value: string | null }>;
}

export interface MondayColumnValue {
    id: string;
    text: string | null;
    value: string | null;
    linked_items?: MondayLinkedItem[];
}

export interface MondayItem {
    id: string;
    name: string;
    updated_at: string;
    column_values: MondayColumnValue[];
}

export interface MondayColumn {
    id: string;
    title: string;
    type: string;
}

export interface MondayBoard {
    id: string;
    name: string;
    description: string | null;
    columns: MondayColumn[];
    items_page: {
        cursor: string | null;
        items: MondayItem[];
    };
}

export interface MondayApiResponse {
    data: {
        boards: MondayBoard[];
    };
    errors?: Array<{ message: string }>;
}

export interface MondayMutationResponse {
    create_item?: {
        id: string;
        name: string;
    };
    change_multiple_column_values?: {
        id: string;
        name: string;
    };
    delete_item?: {
        id: string;
    };
    boards?: MondayBoard[];
    [key: string]: any;
}

export interface MondayItemData {
    itemName: string;
    columnValues: {
        hubspot_record_id: string;
        main_contact: string;
        main_contact_email: string;
    };
}

/**
 * Result of syncing Monday to HubSpot
 */
export interface SyncResult {
    success: boolean;
    data: SchoolData;
    error?: string;
}

/**
 * Summary statistics for sync operation
 */
export interface SyncSummary {
    total: number;
    created: number;
    failed: number;
    skipped: number;
}

/**
 * Result of Monday → HubSpot sync operation
 * Contains summary and the synced schools with HubSpot IDs populated
 */
export interface MondayToHubSpotSyncResult {
    summary: SyncSummary;
    syncedSchools: SchoolData[];
}

/**
 * Orphaned link - a record that references another system but the target doesn't exist
 */
export interface OrphanedLink {
    source: 'monday' | 'hubspot';
    sourceId: string;
    sourceName: string;
    targetId: string;
    targetSystem: 'monday' | 'hubspot';
    reason: string;
}

/**
 * Potential duplicate - records with same name in both systems but not linked
 */
export interface PotentialDuplicate {
    mondayItemId: string;
    mondayItemName: string;
    hubspotCompanyId: string;
    hubspotCompanyName: string;
    confidence: 'exact' | 'similar';
}

/**
 * Orchestrator options for controlling sync behavior
 */
export interface OrchestratorOptions {
    dryRun?: boolean;
    direction?: 'monday-to-hubspot' | 'hubspot-to-monday' | 'both';
    detectOrphans?: boolean;
    detectDuplicates?: boolean;
}

/**
 * Result of the orchestration process
 */
export interface OrchestrationResult {
    mondayToHubspot?: MondayToHubSpotSyncResult;
    hubspotToMonday?: {
        summary: SyncSummary;
        updatedCount: number;
    };
    orphanedLinks: OrphanedLink[];
    potentialDuplicates: PotentialDuplicate[];
}

/**
 * Transformation Functions
 * Convert source-specific data structures to unified SchoolData
 */

/**
 * Converts HubSpot company data to unified SchoolData structure
 */
export function hubspotToSchoolData(appConfig: AppConfig, hubspot: HubspotCompanyResultWithContacts): SchoolData {
    // Use first contact as main contact, or provide defaults
    const mainContact = hubspot.contacts[0] || {
        firstName: '',
        lastName: '',
        email: ''
    };

    // Additional contacts are all contacts except the first
    const additionalContacts = hubspot.contacts.slice(1);

    const hubspotCompanyUrl = hubspot.companyUrl || `${appConfig.hubspot.baseUrl}/contacts/${appConfig.hubspot.accountId}/record/0-2/${hubspot.companyId}`;

    return {
        schoolName: hubspot.companyName || 'Unnamed School',
        owner: hubspot.companyOwner,
        mainContact,
        hubspotCompanyId: hubspot.companyId,
        hubspotCompanyUrl: hubspotCompanyUrl,
        mondayUrl: hubspot.mondayUrl || undefined,
        mondayItemId: undefined, // Monday item ID should be set by caller if available
        additionalContacts: additionalContacts.length > 0 ? additionalContacts : undefined
    };
}

/**
 * Transforms a MondayItem directly to SchoolData
 */
export function mondayItemToSchoolData(appConfig: AppConfig, item: MondayItem, boardId: string): SchoolData {
    const mondayItemId = item.id;
    const owner = getColumnValueFromMonday(item.column_values, appConfig.monday.columnIds.owner);
    const hubspotCompanyId = getColumnValueFromMonday(item.column_values, appConfig.monday.columnIds.hubspotRecordId);

    // Extract contacts from the connected board relation column
    const contactColumn = item.column_values.find(
        (col) => col.id === appConfig.monday.columnIds.mainContact
    );
    const linkedContacts: MainContact[] = (contactColumn?.linked_items ?? []).map((linkedItem) => {
        const email = linkedItem.column_values.find(
            (col) => col.id === appConfig.monday.columnIds.contactEmail
        )?.text ?? null;
        const { firstName, lastName } = splitFullName(linkedItem.name);
        return { firstName, lastName, email, phone: null };
    });

    const mainContact = linkedContacts[0] ?? null;
    const additionalContacts = linkedContacts.slice(1);

    console.log(`[Monday Import] "${item.name}" — ${linkedContacts.length} contact(s) linked`);

    // Derive hubspot URL from company ID if available
    const hubspotCompanyUrl = hubspotCompanyId
        ? `${appConfig.hubspot.baseUrl}/contacts/${appConfig.hubspot.accountId}/record/0-2/${hubspotCompanyId}`
        : undefined;

    return {
        schoolName: item.name,
        owner: owner || null,
        mainContact,
        mondayUrl: buildMondayItemUrl(appConfig, boardId, item.id),
        mondayItemId: mondayItemId,
        hubspotCompanyId: hubspotCompanyId || undefined,
        hubspotCompanyUrl,
        additionalContacts: additionalContacts.length > 0 ? additionalContacts : undefined
    };
}
