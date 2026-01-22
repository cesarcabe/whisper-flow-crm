/**
 * ChatEngine configuration for the CRM frontend.
 */

const CHATENGINE_API_URL = import.meta.env.VITE_CHATENGINE_API_URL ?? '';
const CHATENGINE_BASE_URL = import.meta.env.VITE_CHATENGINE_BASE_URL ?? CHATENGINE_API_URL;

export { CHATENGINE_BASE_URL, CHATENGINE_API_URL };
