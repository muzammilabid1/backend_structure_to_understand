/**
 * Jest setup file - runs before each test file
 * Sets up test-specific environment variables for unit tests
 */

process.env.MONDAY_BOARD_BASE_URL = 'https://test.monday.com';
process.env.MONDAY_API_KEY = 'test-api-key';
process.env.MONDAY_API_URL = 'https://api.monday.com/v2';
process.env.HUBSPOT_ACCESS_TOKEN = 'test-hubspot-token';
process.env.HUBSPOT_BASE_URL = 'https://app.hubspot.com';
process.env.HUBSPOT_ACCOUNT_ID = 'test-account-id';

// Board IDs
process.env.MONDAY_SCHOOLS_BOARD_ID = 'test_schools_board';
process.env.MONDAY_SCHOOLS_CONTACT_BOARD_ID = 'test_contacts_board';

// Column IDs for Monday Schools board - must match what config.ts expects
process.env.MONDAY_SCHOOLS_BOARD_COLUMN_ID_OWNER = 'col_owner';
process.env.MONDAY_SCHOOLS_BOARD_COLUMN_ID_MAIN_CONTACT = 'col_contact';
process.env.MONDAY_SCHOOLS_BOARD_COLUMN_ID_EMAIL_ADDRESS = 'col_email';
process.env.MONDAY_SCHOOLS_BOARD_COLUMN_ID_HUBSPOT_RECORD_ID = 'col_hubspot_id';

// Column IDs for Monday Schools Contact board
process.env.MONDAY_SCHOOLS_CONTACT_BOARD_COLUMN_ID_NAME = 'col_contact_name';
process.env.MONDAY_SCHOOLS_CONTACT_BOARD_COLUMN_ID_EMAIL = 'col_contact_email';
process.env.MONDAY_SCHOOLS_CONTACT_BOARD_COLUMN_ID_CONTACT_SCHOOL = 'col_school_contact';
