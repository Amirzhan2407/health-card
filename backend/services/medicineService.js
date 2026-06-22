import axios from "axios";
import * as cheerio from "cheerio";
import { supabase } from "../config/supabaseClient.js";

const BASE_URL = "https://i-teka.kz";
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const CITY_MAPPINGS = {
  almaty: "almaty",
  алматы: "almaty",
  astana: "astana",
  астана: "astana",
  shymkent: "shymkent",
  шымкент: "shymkent",
  karaganda: "karaganda",
  караганда: "karaganda",
};

function getCitySlug(city) {
  if (!city) return "almaty";
  const normalized = city.toLowerCase().trim();
  return CITY_MAPPINGS[normalized] || "almaty";
}

export async function searchMedicine(queryText, city) {
  const citySlug = getCitySlug(city);
  const cacheKey = `${citySlug}:${queryText.toLowerCase().trim()}`;

  // 1. Check cache first
  const { data: cached, error: cacheErr } = await supabase
    .from("medicine_cache")
    .select("*")
    .eq("query", cacheKey)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.created_at).getTime();
    if (age < CACHE_EXPIRY_MS) {
      console.log(`[MEDICINE CACHE HIT] Key: ${cacheKey}`);
      return cached.results;
    }
  }

  // 2. Cache miss or stale: scrape i-teka.kz
  try {
    const searchUrl = `${BASE_URL}/${citySlug}/search?word=${encodeURIComponent(queryText)}`;
    console.log(`[MEDICINE SCRAPING] Fetching search page: ${searchUrl}`);

    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Let's parse typical search items or details table
    // Suppose the page has a table or class lists for pharmacy offers
    // We parse rows containing pharmacy name, address, price, availability
    // Typically: class or elements like '.product-item', '.pharmacy-row', '.table tr'
    // Let's write selector logic:
    $("tr, .item, .product-item").each((idx, elem) => {
      const text = $(elem).text().replace(/\s+/g, " ").trim();
      
      // Look for indicators of pharmacy and price
      if (text.includes("тг") || text.includes("тенге") || text.includes("₸")) {
        const name = $(elem).find(".pharmacy-name, a, td:first-child").first().text().trim();
        const address = $(elem).find(".address, td:nth-child(2)").first().text().trim();
        const priceText = $(elem).find(".price, td:nth-child(3), td:last-child").first().text().trim();
        
        if (name && priceText) {
          const priceMatch = priceText.replace(/\s/g, "").match(/\d+/);
          const price = priceMatch ? parseInt(priceMatch[0], 10) : 0;

          if (price > 0) {
            results.push({
              pharmacyName: name,
              address: address || "Адрес не указан",
              price,
              availability: text.toLowerCase().includes("есть") || text.toLowerCase().includes("в наличии") ? "В наличии" : "Уточняйте",
            });
          }
        }
      }
    });

    // If we couldn't find detailed rows, search for medicine link first and crawl that
    if (results.length === 0) {
      // Find link to medicine detail page
      let detailPageUrl = "";
      $("a").each((idx, elem) => {
        const href = $(elem).attr("href") || "";
        if (href.includes("/product/") || href.includes("/medicament/")) {
          detailPageUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
          return false; // break loop
        }
      });

      if (detailPageUrl) {
        console.log(`[MEDICINE SCRAPING] Crawling detail page: ${detailPageUrl}`);
        const detailResponse = await axios.get(detailPageUrl, { timeout: 8000 });
        const $d = cheerio.load(detailResponse.data);

        $d("tr, .pharmacy-item").each((idx, elem) => {
          const name = $d(elem).find(".pharmacy-name, td:first-child").text().trim();
          const address = $d(elem).find(".address, td:nth-child(2)").text().trim();
          const priceText = $d(elem).find(".price, td:nth-child(3)").text().trim();

          if (name && priceText) {
            const priceMatch = priceText.replace(/\s/g, "").match(/\d+/);
            const price = priceMatch ? parseInt(priceMatch[0], 10) : 0;
            if (price > 0) {
              results.push({
                pharmacyName: name,
                address: address || "Адрес не указан",
                price,
                availability: "В наличии",
              });
            }
          }
        });
      }
    }

    if (results.length === 0) {
      throw new Error("Информация о наличии препарата на сайте не найдена.");
    }

    // Save results to cache
    const { error: upsertErr } = await supabase
      .from("medicine_cache")
      .upsert({
        query: cacheKey,
        results,
        created_at: new Date().toISOString(),
      }, { onConflict: "query" });

    if (upsertErr) {
      console.error("[MEDICINE CACHE SAVE ERROR]:", upsertErr.message);
    }

    return results;
  } catch (error) {
    console.error(`[MEDICINE SCRAPER ERROR] details: ${error.message}`);

    // If scraper fails and we have a stale cache, return that as fallback
    if (cached) {
      console.log(`[MEDICINE CACHE FALLBACK STALE] Key: ${cacheKey}`);
      return cached.results;
    }

    // If cache is empty, throw clear connection error
    throw new Error(`Не удалось получить данные с сайта i-teka.kz и кэш пуст. Ошибка: ${error.message}`);
  }
}
