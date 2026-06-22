import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send refresh cookies
});

// Stored in-memory on the frontend for zero-trust token storage
let inMemoryToken = null;

export const setInMemoryToken = (token) => {
  inMemoryToken = token;
};

export const getInMemoryToken = () => {
  return inMemoryToken;
};

// Request interceptor to attach bearer token
api.interceptors.request.use(
  (config) => {
    if (inMemoryToken) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auto token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Prevent infinite loop on refresh route itself
    if (originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Request token refresh
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        if (res.data?.success && res.data?.accessToken) {
          setInMemoryToken(res.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed (or revoked), logout user
        setInMemoryToken(null);
        window.dispatchEvent(new Event("unauthorized"));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
