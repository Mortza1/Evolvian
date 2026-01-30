/**
 * API Module
 *
 * Export core API client and utilities.
 */

export {
  api,
  apiRequest,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  APIError,
  API_BASE_URL,
} from './client';

export type { RequestOptions } from './client';
