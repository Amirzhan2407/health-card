import axios from "axios";
import * as cheerio from "cheerio";

export async function searchMedicine(medicine, city) {
  try {
    const url = `https://i-teka.kz/${city}/search?query=${encodeURIComponent(
      medicine
    )}`;

    const response = await axios.get(url);

    const html = response.data;

    const $ = cheerio.load(html);

    const results = [];

    $(".search-product-card").each((index, element) => {
      const title = $(element)
        .find(".search-product-card__title")
        .text()
        .trim();

      const price = $(element)
        .find(".search-product-card__price")
        .text()
        .trim();

      const pharmacy = $(element)
        .find(".search-product-card__vendor")
        .text()
        .trim();

      if (title) {
        results.push({
          title,
          price,
          pharmacy,
        });
      }
    });

    return results;
  } catch (error) {
    console.error("i-teka parser error:", error);

    return [];
  }
}