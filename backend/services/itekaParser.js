import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://i-teka.kz";

const cityMap = {
  алматы: "almaty",
  астана: "astana",
  шымкент: "shymkent",
  караганда: "karaganda",
  актобе: "aktobe",
  тараз: "taraz",
  павлодар: "pavlodar",
  "усть-каменогорск": "ust-kamenogorsk",
  семей: "semey",
  атырау: "atyrau",
  костанай: "kostanay",
  кызылорда: "kyzylorda",
  актау: "aktau",
  кокшетау: "kokshetau",
  петропавловск: "petropavlovsk",
  уральск: "uralsk",
  туркестан: "turkestan",
};

const cityRuBySlug = {
  almaty: "Алматы",
  astana: "Астана",
  shymkent: "Шымкент",
  karaganda: "Караганда",
  aktobe: "Актобе",
  taraz: "Тараз",
  pavlodar: "Павлодар",
  "ust-kamenogorsk": "Усть-Каменогорск",
  semey: "Семей",
  atyrau: "Атырау",
  kostanay: "Костанай",
  kyzylorda: "Кызылорда",
  aktau: "Актау",
  kokshetau: "Кокшетау",
  petropavlovsk: "Петропавловск",
  uralsk: "Уральск",
  turkestan: "Туркестан",
};

const geocodeCache = new Map();

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeCity(city = "") {
  const key = String(city).toLowerCase().trim();

  return cityMap[key] || key;
}

function normalizeMedicine(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[.,!?;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function priceToNumber(price = "") {
  const num = String(price).replace(/[^\d]/g, "");

  return num ? Number(num) : null;
}

function getLines($, selector = "body") {
  return $(selector)
    .text()
    .split("\n")
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  return response.data;
}

function getQueryWords(medicine) {
  return normalizeMedicine(medicine)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean)
    .filter(
      (word) =>
        ![
          "купить",
          "хочу",
          "нужно",
          "надо",
          "лекарство",
          "препарат",
          "для",
          "в",
          "город",
        ].includes(word)
    );
}

function getMedicineScore(title, queryWords) {
  const titleLower = normalizeMedicine(title);

  const synonyms = {
    сироп: ["сироп", "суспензия"],
    суспензия: ["суспензия", "сироп"],
    детский: ["детский", "детей", "для детей"],
    детей: ["детей", "детский", "для детей"],
    таблетки: ["таблетки", "табл"],
    таблетка: ["таблетки", "табл"],
    капсулы: ["капсулы", "капс"],
    капсула: ["капсулы", "капс"],
  };

  const mainWord = queryWords[0];

  if (mainWord && !titleLower.includes(mainWord)) {
    return 0;
  }

  let score = 0;

  if (mainWord && titleLower.includes(mainWord)) {
    score += 10;
  }

  for (const word of queryWords) {
    if (titleLower.includes(word)) {
      score += 3;
      continue;
    }

    const wordSynonyms = synonyms[word] || [];

    const hasSynonym = wordSynonyms.some((synonym) =>
      titleLower.includes(synonym)
    );

    if (hasSynonym) {
      score += 2;
    }
  }

  return score;
}

async function findMedicinePage(medicine, citySlug) {
  const url = `${BASE_URL}/${citySlug}/medicamentsalphabetically`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const queryWords = getQueryWords(medicine);
  const links = [];

  $("a").each((_, element) => {
    const title = normalizeText($(element).text());
    const href = $(element).attr("href");

    if (!title || !href) return;
    if (!href.includes(`/${citySlug}/medicaments/`)) return;

    const score = getMedicineScore(title, queryWords);

    if (score > 0) {
      links.push({
        title,
        href: href.startsWith("http") ? href : `${BASE_URL}${href}`,
        score,
      });
    }
  });

  const uniqueLinks = Array.from(
    new Map(links.map((item) => [item.href, item])).values()
  );

  uniqueLinks.sort((a, b) => b.score - a.score);

  return {
    searchUrl: url,
    products: uniqueLinks.slice(0, 10),
    selectedProduct: uniqueLinks[0] || null,
  };
}

function looksLikeAddress(line, cityRu) {
  const lower = line.toLowerCase();

  if (lower.includes("тг")) return false;
  if (lower.includes("обновлено")) return false;
  if (lower.includes("открыто")) return false;

  return (
    lower.includes(cityRu.toLowerCase()) ||
    lower.includes("ул.") ||
    lower.includes("улица") ||
    lower.includes("пр.") ||
    lower.includes("проспект") ||
    lower.includes("мкр") ||
    lower.includes("микрорайон") ||
    /\d+/.test(lower)
  );
}

function parseProductPage(html, productUrl, citySlug, priority = "price") {
  const $ = cheerio.load(html);
  const lines = getLines($);
  const cityRu = cityRuBySlug[citySlug] || "";

  const title =
    normalizeText($("h1").first().text()) ||
    lines.find((line) => line.toLowerCase().includes("цена в")) ||
    "Лекарство";

  const summary = {
    minPrice: "",
    avgPrice: "",
    maxPrice: "",
    pharmaciesCount: "",
  };

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] === "Самая низкая цена") {
      summary.minPrice = lines[i + 1] || "";
    }

    if (lines[i] === "Средняя цена") {
      summary.avgPrice = lines[i + 1] || "";
    }

    if (lines[i] === "Самая высокая цена") {
      summary.maxPrice = lines[i + 1] || "";
    }

    if (lines[i] === "Продают аптек") {
      summary.pharmaciesCount = lines[i + 1] || "";
    }
  }

  const pharmacies = [];

  const startIndex = lines.findIndex((line) =>
    line.toLowerCase().startsWith("найдено")
  );

  const endIndex = lines.findIndex((line) =>
    line.toLowerCase().startsWith("показано с")
  );

  const workLines =
    startIndex >= 0 && endIndex > startIndex
      ? lines.slice(startIndex, endIndex)
      : lines;

  for (let i = 0; i < workLines.length; i += 1) {
    const current = workLines[i];
    const lower = current.toLowerCase();

    const looksLikePharmacy =
      lower.includes("аптека") ||
      lower.includes("pharm") ||
      lower.includes("farm");

    if (!looksLikePharmacy) continue;

    const nextChunk = workLines.slice(i, i + 14);

    const price = nextChunk.find((line) => /\d+\s*тг/.test(line));
    if (!price) continue;

    const address =
      nextChunk.find((line) => looksLikeAddress(line, cityRu)) || "";

    const openStatus =
      nextChunk.find((line) => line.toLowerCase().includes("открыто")) || "";

    const updated =
      nextChunk.find((line) => line.toLowerCase().includes("обновлено")) || "";

    pharmacies.push({
      pharmacy: current,
      address,
      status: openStatus,
      updated,
      price,
      priceNumber: priceToNumber(price),
      distanceKm: null,
      url: productUrl,
    });
  }

  const uniquePharmacies = Array.from(
    new Map(
      pharmacies.map((item) => [
        `${item.pharmacy}-${item.address}-${item.price}`,
        item,
      ])
    ).values()
  );

  if (priority === "price") {
    uniquePharmacies.sort(
      (a, b) => (a.priceNumber || 999999999) - (b.priceNumber || 999999999)
    );
  }

  return {
    title,
    url: productUrl,
    summary,
    pharmacies: uniquePharmacies.slice(0, 20),
  };
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((R * c).toFixed(2));
}

async function geocodeAddress(address, cityRu) {
  try {
    const cleanAddress = normalizeText(address);

    if (!cleanAddress) return null;

    const query = `${cleanAddress}, ${cityRu}, Казахстан`;
    const cacheKey = query.toLowerCase();

    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey);
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kz&q=${encodeURIComponent(
      query
    )}`;

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "HealthCardProject/1.0",
        "Accept-Language": "ru",
      },
    });

    const item = response.data?.[0];

    if (!item) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const coords = {
      lat: Number(item.lat),
      lng: Number(item.lon),
    };

    geocodeCache.set(cacheKey, coords);

    return coords;
  } catch (error) {
    console.error("GEOCODE ERROR:", error.message);
    return null;
  }
}

async function sortByDistance(pharmacies, citySlug, options) {
  const cityRu = cityRuBySlug[citySlug] || "";

  let userCoords = null;

  if (options.lat && options.lng) {
    userCoords = {
      lat: Number(options.lat),
      lng: Number(options.lng),
    };
  }

  if (!userCoords && options.address) {
    userCoords = await geocodeAddress(options.address, cityRu);
  }

  if (!userCoords) {
    return pharmacies;
  }

  const result = [];

  for (const pharmacy of pharmacies.slice(0, 12)) {
    let pharmacyCoords = null;

    if (pharmacy.address) {
      pharmacyCoords = await geocodeAddress(pharmacy.address, cityRu);
      await sleep(250);
    }

    if (pharmacyCoords) {
      result.push({
        ...pharmacy,
        distanceKm: getDistanceKm(
          userCoords.lat,
          userCoords.lng,
          pharmacyCoords.lat,
          pharmacyCoords.lng
        ),
      });
    } else {
      result.push({
        ...pharmacy,
        distanceKm: null,
      });
    }
  }

  if (options.priority === "nearby_price") {
    result.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) {
        return (a.priceNumber || 999999999) - (b.priceNumber || 999999999);
      }

      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;

      const distanceDiff = Math.abs(a.distanceKm - b.distanceKm);

      if (distanceDiff <= 2) {
        return (a.priceNumber || 999999999) - (b.priceNumber || 999999999);
      }

      return a.distanceKm - b.distanceKm;
    });

    return result;
  }

  result.sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm === null) {
      return (a.priceNumber || 999999999) - (b.priceNumber || 999999999);
    }

    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;

    return a.distanceKm - b.distanceKm;
  });

  return result;
}

export async function searchMedicine(medicine, city, options = {}) {
  try {
    const citySlug = normalizeCity(city);
    const priority = options.priority || "price";

    if (!medicine || !citySlug) {
      return {
        success: false,
        message: "Не указано название лекарства или город.",
        products: [],
        pharmacies: [],
      };
    }

    const found = await findMedicinePage(medicine, citySlug);

    if (!found.selectedProduct) {
      return {
        success: false,
        message:
          "Не удалось найти лекарство на i-teka. Попробуйте написать название точнее.",
        searchUrl: found.searchUrl,
        products: [],
        pharmacies: [],
      };
    }

    const productHtml = await fetchHtml(found.selectedProduct.href);

    const parsed = parseProductPage(
      productHtml,
      found.selectedProduct.href,
      citySlug,
      priority
    );

    let pharmacies = parsed.pharmacies;

    if (priority === "nearby" || priority === "nearby_price") {
      pharmacies = await sortByDistance(pharmacies, citySlug, {
        ...options,
        priority,
      });
    }

    return {
      success: true,
      medicine,
      city,
      priority,
      locationUsed:
        priority === "nearby" || priority === "nearby_price"
          ? options.lat && options.lng
            ? "geolocation"
            : options.address
            ? "address"
            : ""
          : "",
      selectedProduct: found.selectedProduct,
      products: found.products,
      title: parsed.title,
      url: parsed.url,
      summary: parsed.summary,
      pharmacies: pharmacies.slice(0, 8),
    };
  } catch (error) {
    console.error("i-teka parser error:", error.message);

    return {
      success: false,
      message: "Ошибка поиска на i-teka.",
      products: [],
      pharmacies: [],
    };
  }
}