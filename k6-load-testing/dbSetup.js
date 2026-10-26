import * as pg from 'pg'
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export class DatabaseService {
    constructor() {
        // Only use SSL for non-local connections
        const isLocalDocker = process.env.PGHOST === 'host.docker.internal' || process.env.PGHOST === 'localhost';

        let sslConfig = false;
        if (!isLocalDocker) {
            // Use the same SSL configuration as the main app for staging/production
            sslConfig = {
                ca: fs
                    .readFileSync(
                        path.resolve(
                            __dirname,
                            '../graphql-provider/lib/eu-west-2-bundle.pem',
                        ),
                    )
                    .toString(),
            };
        }

        this.client = new Client({
            host: process.env.PGHOST,
            user: process.env.PGAPPUSER,
            database: process.env.PGDATABASE,
            password: process.env.PGAPPPASSWORD,
            port: parseInt(process.env.PGPORT, 10),
            ssl: sslConfig,
        });
    }

    async connect() {
        try {
            await this.client.connect();
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to database:', error.message);
            throw error;
        }
    }

    async testConnection() {
        try {
            const result = await this.client.query(
                'SELECT NOW() as current_time',
            );
            const environment = process.env.PGHOST === 'host.docker.internal' ? 'LOCAL DOCKER' : 'STAGING';
            console.log(`✅ ${environment} Database connection successful!`);
            console.log('Current database time:', result.rows[0].current_time);
            return true;
        } catch (error) {
            const environment = process.env.PGHOST === 'host.docker.internal' ? 'LOCAL DOCKER' : 'STAGING';
            console.error(
                `❌ ${environment} Database connection failed:`,
                error.message,
            );
            console.error('Full error:', error);
            return false;
        }
    }

    async query(query, params) {
        return this.client.query(query, params);
    }

    async close() {
        return this.client.end();
    }
}

export async function testDatabaseConnection() {
    const dbService = new DatabaseService();

    try {
        await dbService.connect();
        const isConnected = await dbService.testConnection();
        await dbService.close();
        return { isConnected };
    } catch (error) {
        await dbService.close();
        throw error;
    }
}

// if file executed directly test the connection only
if (import.meta.url === `file://${process.argv[1]}`) {
    testDatabaseConnection()
        .then(({ isConnected }) => {
            if (isConnected) {
                console.log('🎉 Database connection test completed!');
                if (isConnected)
                    console.log('✅ Regular user connection works');
            } else {
                console.log('💥 All database connection attempts failed!');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('💥 Unexpected error during connection test:', error);
            process.exit(1);
        });
}
