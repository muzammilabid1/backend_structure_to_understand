import fs from 'fs'
import path from 'path'
import { createPostgresClient } from '@lwp/postgres-client'
import type { AnalyticsQueryBuilder } from './analytics-db'

// Create database connection using the shared postgres client
export const createDatabaseConnection = (): AnalyticsQueryBuilder => {
  // Cast through unknown to add analytics_pupil_fact typing that's missing from generated schema
  return createPostgresClient({
    host: process.env.PGHOST_SNAPSHOT || process.env.PGHOST,
    port: parseInt(process.env.PGPORT_SNAPSHOT || process.env.PGPORT || '5432', 10),
    user: process.env.PGAPPUSER_SNAPSHOT || process.env.PGAPPUSER,
    password: process.env.PGAPPPASSWORD_SNAPSHOT || process.env.PGAPPPASSWORD,
    database: process.env.PGDATABASE_SNAPSHOT || process.env.PGDATABASE,
    ssl: process.env.PGHOST !== 'localhost' 
      ? {
          ca: fs.readFileSync(
            path.resolve(process.cwd(), '..', 'graphql-provider', 'lib', 'eu-west-2-bundle.pem')
          ).toString(),
          rejectUnauthorized: false
        }
      : false,
  }) as unknown as AnalyticsQueryBuilder
}

// Re-export the database instance
export const db = createDatabaseConnection() 
