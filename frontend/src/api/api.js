import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:10000/api";

let accessToken = null;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20000,
});

export function setInMemoryToken(token) {
  accessToken = token || null;
}

export function getInMemoryToken() {
  return accessToken;
}

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;