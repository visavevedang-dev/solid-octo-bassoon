// currency-display.js
// Converts Slancio's INR base prices to the visitor's likely local
// currency, using their browser locale (no geolocation API needed) and
// a free, no-key-required exchange rate from Frankfurter (ECB-sourced).

const BASE_PRICES_INR = {
  pro: 599,
  studio: 999,
};

// Maps common browser locale regions to currency codes. Extend this list
// if you want to support more regions explicitly — anything not listed
// falls back to showing INR only (no conversion attempted).
const LOCALE_TO_CURRENCY = {
  US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", DE: "EUR", FR: "EUR",
  ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", AE: "AED", SG: "SGD",
  JP: "JPY", NZ: "NZD", ZA: "ZAR", BR: "BRL", MX: "MXN",
};

function detectLikelyCurrency() {
  try {
    const locale = navigator.language || "en-IN";
    const region = new Intl.Locale(locale).region;
    return LOCALE_TO_CURRENCY[region] || null;
  } catch {
    return null;
  }
}

async function fetchRate(targetCurrency) {
  const cacheKey = `slancio_rate_${targetCurrency}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const { rate, fetchedAt } = JSON.parse(cached);
    // Cache for 1 hour — respects Frankfurter's fair-use guidance and
    // avoids refetching on every page load.
    if (Date.now() - fetchedAt < 60 * 60 * 1000) return rate;
  }

  const res = await fetch(
    `https://api.frankfurter.dev/v2/latest?base=INR&symbols=${targetCurrency}`,
  );
  if (!res.ok) throw new Error("Rate fetch failed");
  const data = await res.json();
  const rate = data.rates[targetCurrency];

  localStorage.setItem(cacheKey, JSON.stringify({ rate, fetchedAt: Date.now() }));
  return rate;
}

function formatPrice(amount, currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

async function displayLocalPricing() {
  const currency = detectLikelyCurrency();
  if (!currency || currency === "INR") return; // Indian visitors just see ₹, no conversion needed

  try {
    const rate = await fetchRate(currency);

    const proEl = document.querySelector("[data-price='pro']");
    const studioEl = document.querySelector("[data-price='studio']");

    if (proEl) {
      const converted = formatPrice(BASE_PRICES_INR.pro * rate, currency);
      proEl.insertAdjacentHTML(
        "beforeend",
        `<span class="local-price"> (approx. ${converted})</span>`,
      );
    }
    if (studioEl) {
      const converted = formatPrice(BASE_PRICES_INR.studio * rate, currency);
      studioEl.insertAdjacentHTML(
        "beforeend",
        `<span class="local-price"> (approx. ${converted})</span>`,
      );
    }
  } catch {
    // Fails silently — visitor just sees the ₹ price with no conversion,
    // which is a perfectly fine fallback, not a broken experience.
  }
}

document.addEventListener("DOMContentLoaded", displayLocalPricing);
