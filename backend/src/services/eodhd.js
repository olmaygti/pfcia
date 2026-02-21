'use strict';

const axios = require('axios');

const BASE_URL = 'https://eodhd.com/api';

function getApiKey() {
	const key = process.env.EODHD_API_KEY;
	if (!key) throw new Error('EODHD_API_KEY environment variable is not set');
	return key;
}

function formatDate(date) {
	return date.toISOString().split('T')[0];
}

function threeYearsAgo() {
	const date = new Date();
	date.setFullYear(date.getFullYear() - 3);
	return formatDate(date);
}

function today() {
	return formatDate(new Date());
}

/**
 * Fetch EOD historical data for a single ticker.
 *
 * @param {string} symbol   - Ticker symbol, e.g. 'AAPL'
 * @param {string} exchange - Exchange code, e.g. 'US'
 * @param {string} [from]   - Start date YYYY-MM-DD (defaults to 3 years ago)
 * @param {string} [to]     - End date YYYY-MM-DD (defaults to today)
 * @returns {Promise<Array>} Array of daily OHLCV objects
 */
async function fetchTickerEod(symbol, exchange, from, to) {
	const { data } = await axios.get(`${BASE_URL}/eod/${symbol}.${exchange}`, {
		params: {
			api_token: getApiKey(),
			fmt: 'json',
			from: from ?? threeYearsAgo(),
			to: to ?? today(),
		},
	});
	return data;
}

/**
 * Fetch bulk last-day EOD data for all tickers in a given market.
 *
 * @param {string} exchange - Exchange code, e.g. 'US'
 * @returns {Promise<Array>} Array of last-day OHLCV objects for every ticker in the market
 */
async function fetchBulkLastDay(exchange) {
	const { data } = await axios.get(`${BASE_URL}/eod-bulk-last-day/${exchange}`, {
		params: {
			api_token: getApiKey(),
			fmt: 'json',
		},
	});
	return data;
}

module.exports = { fetchTickerEod, fetchBulkLastDay };
