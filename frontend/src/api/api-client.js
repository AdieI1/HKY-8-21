import axios from 'axios';

// Base URL matching Laravel backend
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
  },
});

// Attach the stored token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 unauthenticated
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

/*
|--------------------------------------------------------------------------
| In-Memory Cache (SWR-Style) for High-Speed Tab Switching & Read Queries
|--------------------------------------------------------------------------
*/
const cache = new Map();
const DEFAULT_CACHE_TTL_MS = 20000; // 20 seconds

export function clearApiCache() {
  cache.clear();
}

if (typeof window !== 'undefined') {
  window.__hjyClearApiCache = clearApiCache;
}

api.clearCache = clearApiCache;

const originalGet = api.get.bind(api);
api.get = async function (url, config = {}) {
  const shouldSkip = config.skipCache || config.cache === false;
  const token = localStorage.getItem('auth_token') || '';
  const cacheKey = `${token}:${url}:${JSON.stringify(config.params || {})}`;

  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (!shouldSkip && cached && (now - cached.timestamp < (config.cacheTtl || DEFAULT_CACHE_TTL_MS))) {
    return Promise.resolve({
      ...cached.response,
      data: JSON.parse(JSON.stringify(cached.response.data)),
      __fromCache: true,
    });
  }

  const response = await originalGet(url, config);

  if (!shouldSkip && response && response.status === 200) {
    cache.set(cacheKey, {
      response: {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      },
      timestamp: now,
    });
  }

  return response;
};

// Invalidate in-memory cache whenever state-mutating requests occur
['post', 'put', 'patch', 'delete'].forEach((method) => {
  const originalMethod = api[method].bind(api);
  api[method] = async function (...args) {
    const result = await originalMethod(...args);
    clearApiCache();
    return result;
  };
});

export default api;