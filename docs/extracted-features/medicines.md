# Legacy Feature Documentation: Medicine & Pharmacy Scraper

This document describes the scraper logic for fetching medicine availability and prices in Kazakhstani pharmacies.

---

## 1. Target Website & Mapping

- **Base URL**: `https://i-teka.kz`
- **City Slugs Mapping**:
  - `алматы` -> `almaty`
  - `астана` -> `astana`
  - `шымкент` -> `shymkent`
  - `караганда` -> `karaganda`
  - (and other city mappings defined in `itekaParser.js`)

---

## 2. Scraping Flow

1. **Find Medicine Page**:
   - Query `${BASE_URL}/${citySlug}/medicamentsalphabetically`
   - Retrieve all matching drug names and URLs using cheerio selector `a`.
   - Calculate score of match using query words and choose the best URL.
2. **Retrieve Pharmacy listings**:
   - Query the specific medicine product URL.
   - Crawl the listings table to extract:
     - Pharmacy name
     - Price (converted to integer)
     - Address
     - Availability status
3. **Caching**:
   - Save parsed results in a database cache table with a timestamp.
   - If subsequent search matches exactly, retrieve from cache if within expiry (e.g. 1 hour).
   - If scraping fails and cache is empty, throw a clear connection error.
