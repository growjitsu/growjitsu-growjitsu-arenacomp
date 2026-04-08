
/**
 * Centralized API configuration for production and development.
 * In production, it uses VITE_API_URL if defined, otherwise falls back to relative path.
 */

const getApiBaseUrl = () => {
  // Check if VITE_API_URL is defined (e.g., https://api.arenacomp.com.br)
  const envApiUrl = import.meta.env.VITE_API_URL;
  
  if (envApiUrl) {
    // Ensure no trailing slash
    return envApiUrl.endsWith('/') ? envApiUrl.slice(0, -1) : envApiUrl;
  }
  
  // Fallback to relative path (works if frontend and backend are on the same domain)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Helper to build API URLs with proper base path.
 */
export const getApiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};
