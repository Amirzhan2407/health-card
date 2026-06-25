
import axios from "axios";

function normalizeApiUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

const LOCAL_API_URL =
  "http://localhost:10000/api";

const ENV_API_URL = normalizeApiUrl(
  import.meta.env.VITE_API_URL
);

const API_URL = import.meta.env.DEV
  ? LOCAL_API_URL
  : ENV_API_URL || LOCAL_API_URL;

let accessToken = null;
let refreshPromise = null;
let unauthorizedEventSent = false;

const api = axios.create({
  baseURL: API_URL,

  /*
   * Нужен для refresh-cookie.
   */
  withCredentials: true,

  timeout: 120000,

  /*
   * Content-Type специально не указываем.
   *
   * Для обычных JSON-запросов Axios установит
   * application/json автоматически.
   *
   * Для FormData браузер сам установит
   * multipart/form-data с правильным boundary.
   */
  headers: {
    Accept: "application/json",
  },
});

/*
 * Отдельный клиент для обновления токена.
 * На нём нет основного interceptor,
 * поэтому не возникнет бесконечного цикла.
 */
const refreshClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export function setInMemoryToken(token) {
  accessToken = token
    ? String(token).trim()
    : null;

  if (accessToken) {
    unauthorizedEventSent = false;
  }
}

export function getInMemoryToken() {
  return accessToken;
}

export function getApiUrl() {
  return API_URL;
}

function isFormData(value) {
  return (
    typeof FormData !== "undefined" &&
    value instanceof FormData
  );
}

function isAuthRequest(url = "") {
  const normalizedUrl =
    String(url || "");

  return [
    "/auth/login",
    "/auth/logout",
    "/auth/refresh",
    "/auth/register/request-code",
    "/auth/register/confirm",
    "/auth/register/resend-code",
  ].some((path) =>
    normalizedUrl.includes(path)
  );
}

function dispatchUnauthorized() {
  if (unauthorizedEventSent) {
    return;
  }

  unauthorizedEventSent = true;

  window.dispatchEvent(
    new Event("unauthorized")
  );
}

/*
 * Добавляем access-токен перед каждым запросом.
 */
api.interceptors.request.use(
  (config) => {
    config.headers =
      config.headers || {};

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    /*
     * При загрузке файла нельзя оставлять
     * Content-Type: application/json.
     *
     * Браузер самостоятельно добавит:
     *
     * multipart/form-data;
     * boundary=...
     */
    if (isFormData(config.data)) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

/*
 * Обработка ошибок и автоматическое
 * обновление access-токена.
 */
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (error?.code === "ECONNABORTED") {
      error.message =
        "Сервер слишком долго обрабатывает запрос. Повторите попытку.";
    }

    if (!error?.response) {
      error.message =
        "Не удалось подключиться к серверу Clinic OS. Проверьте, запущен ли backend на порту 10000.";

      return Promise.reject(error);
    }

    const originalRequest =
      error.config || {};

    const shouldRefresh =
      error.response.status === 401 &&
      !originalRequest._retry &&
      !isAuthRequest(
        originalRequest.url
      );

    /*
     * Если ошибка не связана с истёкшим
     * access-токеном, возвращаем её как есть.
     */
    if (!shouldRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Если одновременно упало несколько
       * запросов с 401, refresh выполняется
       * только один раз.
       */
      if (!refreshPromise) {
        refreshPromise =
          refreshClient
            .post(
              "/auth/refresh",
              {}
            )
            .then((response) => {
              const nextToken =
                response?.data
                  ?.accessToken;

              if (!nextToken) {
                throw new Error(
                  "Сервер не вернул новый access-токен."
                );
              }

              setInMemoryToken(
                nextToken
              );

              return nextToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
      }

      const nextToken =
        await refreshPromise;

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${nextToken}`;

      /*
       * При повторной отправке FormData
       * также удаляем ручной Content-Type.
       */
      if (
        isFormData(
          originalRequest.data
        )
      ) {
        delete originalRequest.headers[
          "Content-Type"
        ];

        delete originalRequest.headers[
          "content-type"
        ];
      }

      return api(
        originalRequest
      );
    } catch (refreshError) {
      setInMemoryToken(null);

      dispatchUnauthorized();

      return Promise.reject(
        refreshError
      );
    }
  }
);

if (import.meta.env.DEV) {
  console.log(
    `[Clinic OS] API подключён: ${API_URL}`
  );
}

export default api;
