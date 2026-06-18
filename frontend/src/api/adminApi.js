

const API_URL = "[https://health-card.onrender.com](https://health-card.onrender.com)";

export function getAdminData() {
try {
return JSON.parse(localStorage.getItem("adminData") || "null");
} catch {
return null;
}
}

export function getAdminToken() {
const adminData = getAdminData();

return (
localStorage.getItem("adminToken") ||
localStorage.getItem("token") ||
localStorage.getItem("authToken") ||
adminData?.token ||
""
);
}

export async function adminRequest(path, options = {}) {
const token = getAdminToken();

const response = await fetch(API_URL + path, {
...options,
headers: {
"Content-Type": "application/json",
...(token ? { Authorization: "Bearer " + token } : {}),
...(options.headers || {}),
},
});

const result = await response.json().catch(() => null);

if (!response.ok) {
throw new Error(
result?.message ||
result?.error ||
"Ошибка запроса " + response.status + ": " + path
);
}

return result;
}
