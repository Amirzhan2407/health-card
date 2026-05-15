const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export async function searchMedicine({ medicine, city }) {
  const url = `${BACKEND_URL}/api/pharmacy/search?medicine=${encodeURIComponent(
    medicine
  )}&city=${encodeURIComponent(city)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Ошибка запроса к backend");
  }

  return await response.json();
}