import { createConfig } from './createConfigs';

export function isCloudflareWorkersEnvironment(): boolean {
	const nav = (globalThis as { navigator?: { userAgent?: string } }).navigator;
	return nav?.userAgent?.toLowerCase().includes("cloudflare-workers") ?? false;
}

export const createAppConfig = (env: Partial<Record<string, string>>) => {
	const cfg = createConfig(env);

	return {
		readOnlyMode: cfg.getBoolean('READ_ONLY_MODE', true),
		hubspot: {
			accessToken: cfg.getString('HUBSPOT_ACCESS_TOKEN'),
			baseUrl: cfg.getString('HUBSPOT_BASE_URL'),
			accountId: cfg.getString('HUBSPOT_ACCOUNT_ID')
		},
		monday: {
			boardBaseUrl: cfg.getString('MONDAY_BOARD_BASE_URL'),
			apiKey: cfg.getString('MONDAY_API_KEY'),
			apiUrl: cfg.getString('MONDAY_API_URL'),
			schoolsBoardId: cfg.getString('MONDAY_SCHOOLS_BOARD_ID'),
			schoolsContactBoardId: cfg.getString('MONDAY_SCHOOLS_CONTACT_BOARD_ID'),
			columnIds: {
				owner: cfg.getString('MONDAY_SCHOOLS_BOARD_COLUMN_ID_OWNER'),
				mainContact: cfg.getString('MONDAY_SCHOOLS_BOARD_COLUMN_ID_MAIN_CONTACT'),
				mainContactEmail: cfg.getString('MONDAY_SCHOOLS_BOARD_COLUMN_ID_EMAIL_ADDRESS'),
				hubspotRecordId: cfg.getString('MONDAY_SCHOOLS_BOARD_COLUMN_ID_HUBSPOT_RECORD_ID'),
				contactName: cfg.getString('MONDAY_SCHOOLS_CONTACT_BOARD_COLUMN_ID_NAME'),
				contactEmail: cfg.getString('MONDAY_SCHOOLS_CONTACT_BOARD_COLUMN_ID_EMAIL'),
				schoolContact: cfg.getString('MONDAY_SCHOOLS_CONTACT_BOARD_COLUMN_ID_CONTACT_SCHOOL')
			}
		}
	};
};

export type AppConfig = ReturnType<typeof createAppConfig>;
