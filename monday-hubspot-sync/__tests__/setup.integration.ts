/**
 * Jest setup file for integration tests
 * Loads environment variables from .env.test for real API calls
 */

import { config } from 'dotenv';

config({ path: '.env.test' });

