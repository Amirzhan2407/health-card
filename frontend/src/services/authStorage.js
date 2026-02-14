// Этот файл отвечает ТОЛЬКО за хранение статуса входа.
// Роль: сохранить “авторизован/не авторизован” между перезагрузками.

const KEY = "lkh_auth"; // ключ в localStorage

export function getAuth() {
  // Возвращает true/false
  return localStorage.getItem(KEY) === "1";
}

export function setAuth(value) {
  // value = true/false
  localStorage.setItem(KEY, value ? "1" : "0");
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}
