# Monday.com to HubSpot Sync

This module fetches schools from Monday.com and transforms them into a HubSpot-ready JSON structure for synchronization.

## 📁 Project Structure

```
monday-hubspot-sync/
├── index.ts          # Main entry point and CLI runner
├── types.ts          # TypeScript type definitions
├── config.ts         # Configuration and environment variables
├── mondayService.ts     # Monday.com API client functions
├── helpers.ts        # Utility helper functions
├── transform.ts      # Data transformation logic
├── service.ts        # Main orchestration service
└── README.md         # This file
```

## 📄 File Descriptions

### `index.ts`

Main entry point for the application. Contains the CLI runner that can be executed directly.

**Usage:**

```bash
ts-node monday-hubspot-sync/index.ts
```

**Exports:**

-   `getNewSchoolsForHubSpot()` - Main service function
-   All types from `types.ts`

### `types.ts`

TypeScript interface definitions for:

-   Monday.com API responses (`MondayColumnValue`, `MondayItem`, `MondayBoard`, etc.)
-   HubSpot API responses (`HubSpotCompanyResult`, `HubSpotContactData`)
-   Source-specific types (`MondaySchoolResult` for Monday data)
-   **Unified `SchoolData` interface** - Used by business logic regardless of source
-   **Adapter functions** - Convert source-specific data to unified `SchoolData`:
    -   `mondayToSchoolData()` - Converts Monday.com data to unified format
    -   `hubspotToSchoolData()` - Converts HubSpot data to unified format

**Adapter Pattern:** The codebase uses the Adapter Pattern to maintain a single unified data structure (`SchoolData`) that works with both Monday.com and HubSpot. This ensures business logic doesn't need to know which system the data came from.

### `config.ts` and `createConfigs.ts`

Configuration management with type-safe environment variable parsing:

**`createConfigs.ts`:**

-   Type-safe config parser with support for boolean, integer, float, and string types
-   Automatic validation with clear error messages for missing or mistyped values
-   Custom error classes (`MissingConfigKeyError`, `MistypedConfigKeyError`)

**`config.ts`:**

-   `createAppConfig(env)` - Creates validated configuration object from environment variables
-   Returns structured config with HubSpot settings, Monday.com settings, and column ID mappings
-   Defaults `READ_ONLY_MODE` to `true` for safety

All configuration is loaded from environment variables - see `.env.sample` for required variables.

### `mondayService.ts`

Monday.com API client functions:

-   `fetchBoardWithItems(boardId)` - Fetches board data with items and column metadata

### `helpers.ts`

Utility functions:

-   `getColumnValue()` - Extracts column values from Monday.com data
-   `splitFullName()` - Splits full name into first and last name
-   `buildMondayItemUrl()` - Generates Monday.com item URLs
-   `filterSchoolsWithoutHubSpotId()` - Filters schools missing HubSpot IDs

### `transform.ts`

Data transformation logic:

-   `transformSchoolsForHubSpot()` - Transforms Monday.com items to unified `SchoolData` format using the adapter pattern

### `service.ts`

Main orchestration service:

-   `getNewSchoolsForHubSpot()` - Coordinates fetching, filtering, and transforming schools

## 🚀 Getting Started

### 1. Set Environment Variables

Create a `.env` file based on `.env.sample` or set environment variables:

```bash
# HubSpot Configuration
export HUBSPOT_ACCESS_TOKEN="your_hubspot_access_token"
export HUBSPOT_BASE_URL="https://app.hubspot.com/contacts/your_account_id"
export HUBSPOT_ACCOUNT_ID="your_hubspot_account_id"

# Monday.com Configuration
export MONDAY_API_KEY="your_monday_api_key"
export MONDAY_API_URL="https://api.monday.com/v2"
export MONDAY_BOARD_BASE_URL="https://yourdomain.monday.com"
export MONDAY_SCHOOLS_BOARD_ID="your_schools_board_id"
export MONDAY_SCHOOLS_CONTACT_BOARD_ID="your_contacts_board_id"

# Monday.com Schools Board Column IDs
export MONDAY_SCHOOLS_BOARD_COLUMN_ID_OWNER="person"
export MONDAY_SCHOOLS_BOARD_COLUMN_ID_MAIN_CONTACT="board_relation"
export MONDAY_SCHOOLS_BOARD_COLUMN_ID_EMAIL_ADDRESS="email"
export MONDAY_SCHOOLS_BOARD_COLUMN_ID_HUBSPOT_RECORD_ID="text"

# Monday.com Contacts Board Column IDs
export MONDAY_SCHOOLS_CONTACT_BOARD_COLUMN_ID_NAME="name"
export MONDAY_SCHOOLS_CONTACT_BOARD_COLUMN_ID_EMAIL="email"
export MONDAY_SCHOOLS_CONTACT_BOARD_COLUMN_ID_CONTACT_SCHOOL="board_relation"

# Optional Configuration
export READ_ONLY_MODE="true"  # Set to false to enable write operations (defaults to true for safety)
```

See `.env.sample` for a complete template with descriptions.

### 2. Board Structure

The sync system uses two Monday.com boards:

#### Schools Board

Main board containing school information with columns:

-   **Owner** (Person column) - School owner/manager
-   **Main Contact** (Board Relation) - Links to contact(s) in Contacts board
-   **HubSpot Record ID** (Text) - Tracks sync status with HubSpot

#### Contacts Board

Separate board for contact information with columns:

-   **Name** (Name column) - Contact's full name
-   **Email** (Email column) - Contact's email address
-   **Contact School** (Board Relation) - Links back to the school

**Note:** The system uses board relations instead of text fields for contacts, allowing proper contact management and bidirectional linking between schools and contacts.

### 3. Run the Script

```bash
ts-node monday-hubspot-sync/index.ts
```

## 📊 Output Format

The script outputs an array of schools in the following format:

```json
[
    {
        "schoolName": "Example School",
        "owner": "John Smith",
        "mainContact": {
            "firstName": "Jane",
            "lastName": "Doe",
            "email": "jane.doe@example.com"
        },
        "mondayUrl": "https://yourdomain.monday.com/boards/123/pulses/456",
        "mondayItemId": "456",
        "createdAt": "2025-11-06T10:30:00Z"
    }
]
```

## 🔄 Adapter Pattern - Unified Data Structure

The codebase implements the **Adapter Pattern** to maintain a single unified data structure across Monday.com and HubSpot integrations.

### Core Concept

Instead of working with different data structures from each API, we use:

-   **Source-specific types**: `MondaySchoolResult`, `HubSpotCompanyResult`
-   **Unified type**: `SchoolData` - single structure for business logic
-   **Adapter functions**: Convert source data to unified format

### Unified SchoolData Interface

```typescript
interface SchoolData {
    schoolName: string;
    owner: string | null;
    mainContact: HubSpotContactData;
    createdAt: string;
    // Optional fields - populated based on source
    mondayUrl?: string;
    mondayItemId?: string;
    hubspotCompanyId?: string;
    hubspotCompanyUrl?: string;
    additionalContacts?: HubSpotContactData[];
}
```

### Using the Adapters

**Converting Monday.com data:**

```typescript
import { mondayToSchoolData, MondaySchoolResult } from './types';

const mondaySchool: MondaySchoolResult = {
    itemId: '123',
    itemName: 'Example School',
    owner: 'John Smith',
    mainContact: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
    mondayUrl: 'https://monday.com/boards/123/pulses/456',
    createdAt: '2025-11-20T10:00:00Z'
};

// Convert to unified format
const unifiedData = mondayToSchoolData(mondaySchool);
```

**Converting HubSpot data:**

```typescript
import { hubspotToSchoolData, HubSpotCompanyResult } from './types';

const hubspotCompany: HubSpotCompanyResult = {
    companyId: '789',
    companyName: 'Example School',
    companyOwner: 'John Smith',
    mondayUrl: '',
    companyUrl: 'https://example.com',
    contacts: [{ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '555-0100' }]
};

// Convert to unified format
const unifiedData = hubspotToSchoolData(hubspotCompany);
```

### Benefits

✅ **Single source of truth** - Business logic uses one data structure ✅ **Easy maintenance** - API changes only affect adapters ✅ **Type safety** - Compilation catches data structure mismatches ✅ **Testability** - Mock `SchoolData` without complex API structures ✅ **Flexibility** - Add new sources by creating new adapters

## 🔧 Usage in Other Modules

You can import and use the service in other parts of your application:

```typescript
import { getNewSchoolsForHubSpot } from './monday-hubspot-sync';

async function syncSchools() {
    const schools = await getNewSchoolsForHubSpot();

    for (const school of schools) {
        // Create company in HubSpot
        // Update Monday.com with HubSpot ID
    }
}
```

## ✨ Features

-   ✅ **Readonly operations** - No data mutations
-   ✅ **Type-safe** - Full TypeScript support
-   ✅ **Modular** - Clean separation of concerns
-   ✅ **Error handling** - Proper error messages without exposing sensitive data
-   ✅ **Filtered sync** - Only fetches schools without HubSpot IDs
-   ✅ **Name parsing** - Automatically splits contact names
-   ✅ **URL generation** - Creates proper Monday.com item links

## 🔍 How It Works

1. **Fetch** - Retrieves board data from Monday.com API
2. **Filter** - Identifies schools without HubSpot Record IDs
3. **Transform** - Converts Monday.com data to HubSpot-ready format
4. **Output** - Returns structured JSON array

## 🔄 Monday → HubSpot Sync

The module now supports full bidirectional synchronization!

### Running Monday → HubSpot Sync

```bash
ts-node monday-hubspot-sync/sync-monday-to-hubspot.ts
```

This will:

1. Fetch schools from Monday.com without HubSpot IDs
2. Create companies in HubSpot for each school (with name, owner, and monday_url)
3. Create contacts in HubSpot and associate them with companies
4. Update Monday.com items with HubSpot IDs and URLs

### First-Time Setup (Optional)

If the `monday_url` property doesn't exist in your HubSpot account, you can create it by running:

```bash
ts-node monday-hubspot-sync/setup-hubspot-properties.ts
```

This creates a custom property called `monday_url` on companies to store the link back to Monday.com.

### Programmatic Usage

```typescript
import { syncMondayToHubSpot } from './monday-hubspot-sync';

async function runSync() {
    const summary = await syncMondayToHubSpot();
    console.log(`Created: ${summary.created}, Failed: ${summary.failed}`);
}
```

## 📝 Next Steps

Future enhancements:

1. Automated scheduling (cron jobs)
2. Enhanced duplicate detection and handling
3. Sync additional fields (website, phone, address)
4. Conflict resolution strategies
