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

function normalizeText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
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

async function findMedicinePage(medicine, citySlug) {
  const url = `${BASE_URL}/${citySlug}/medicamentsalphabetically`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const query = normalizeMedicine(medicine);

  const links = [];

  $("a").each((_, element) => {
    const title = normalizeText($(element).text());
    const href = $(element).attr("href");

    if (!title || !href) return;
    if (!href.includes(`/${citySlug}/medicaments/`)) return;

    const titleLower = normalizeMedicine(title);

    if (titleLower.includes(query)) {
      links.push({
        title,
        href: href.startsWith("http") ? href : `${BASE_URL}${href}`,
      });
    }
  });

  const uniqueLinks = Array.from(
    new Map(links.map((item) => [item.href, item])).values()
  );

  return {
    searchUrl: url,
    products: uniqueLinks.slice(0, 10),
    selectedProduct: uniqueLinks[0] || null,
  };
}

function parseProductPage(html, productUrl, citySlug, priority = "price") {
  const $ = cheerio.load(html);
  const lines = getLines($);

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

    const looksLikePharmacy =
      current.toLowerCase().includes("аптека") ||
      current.toLowerCase().includes("pharm") ||
      current.toLowerCase().includes("farm");

    if (!looksLikePharmacy) continue;

    const nextChunk = workLines.slice(i, i + 12);

    const address = nextChunk.find((line) =>
      line.toLowerCase().includes(citySlug === "astana" ? "астана" : "")
    );

    const openStatus = nextChunk.find((line) =>
      line.toLowerCase().includes("открыто")
    );

    const updated = nextChunk.find((line) =>
      line.toLowerCase().includes("обновлено")
    );

    const price = nextChunk.find((line) => /\d+\s*тг/.test(line));

    if (!price) continue;

    pharmacies.push({
      pharmacy: current,
      address: address || "",
      status: openStatus || "",
      updated: updated || "",
      price,
      priceNumber: priceToNumber(price),
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

  const sorted =
    priority === "price"
      ? uniquePharmacies.sort(
          (a, b) => (a.priceNumber || 999999999) - (b.priceNumber || 999999999)
        )
      : uniquePharmacies;

  return {
    title,
    url: productUrl,
    summary,
    pharmacies: sorted.slice(0, 8),
  };
}

export async function searchMedicine(medicine, city, priority = "price") {
  try {
    const citySlug = normalizeCity(city);

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

    return {
      success: true,
      medicine,
      city,
      priority,
      selectedProduct: found.selectedProduct,
      products: found.products,
      ...parsed,
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