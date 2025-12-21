const axios = require('axios');
const { logger } = require('@librechat/data-schemas');

let cachedRate = 0.85; // Fallback rate (1 USD = 0.92 EUR approx)
let lastFetch = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

async function getExchangeRate() {
  const now = Date.now();
  if (now - lastFetch < CACHE_DURATION) {
    return cachedRate;
  }

  try {
    // Using a reliable free public API for EUR/USD
    const response = await axios.get('https://open.er-api.com/v6/latest/USD');
    if (response.data && response.data.rates && response.data.rates.EUR) {
      cachedRate = response.data.rates.EUR;
      lastFetch = now;
      logger.debug(`[ExchangeRate] Updated EUR/USD rate to ${cachedRate}`);
    }
  } catch (error) {
    logger.error('[ExchangeRate] Failed to fetch exchange rate, using fallback', error.message);
  }

  return cachedRate;
}

module.exports = { getExchangeRate };
