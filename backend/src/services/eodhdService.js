import axios from 'axios';
import { Bean } from '@/ioc';

const BASE_URL = 'https://eodhd.com/api';

@Bean()
export default class EodhdService {
	/**
	 * Fetch EOD historical data for a single ticker.
	 * @param {string} symbol   - Ticker symbol, e.g. 'AAPL'
	 * @param {string} exchange - Exchange code, e.g. 'US'
	 * @param {string} [from]   - Start date YYYY-MM-DD (defaults to 3 years ago)
	 * @param {string} [to]     - End date YYYY-MM-DD (defaults to today)
	 */
	async fetchTickerEod(symbol, exchange, from, to) {
		const { data } = await axios.get(`${BASE_URL}/eod/${symbol}.${exchange}`, {
			params: {
				api_token: this.getApiKey(),
				fmt: 'json',
				from: from ?? this.threeYearsAgo(),
				to: to ?? this.today(),
			},
		});
		return data;
	}

	/**
	 * Fetch bulk last-day EOD data for all tickers in a given market.
	 * @param {string} exchange - Exchange code, e.g. 'US'
	 */
	async fetchBulkLastDay(exchange) {
		const { data } = await axios.get(`${BASE_URL}/eod-bulk-last-day/${exchange}`, {
			params: {
				api_token: this.getApiKey(),
				fmt: 'json',
			},
		});
		return data;
	}

	getApiKey() {
		const key = process.env.EODHD_API_KEY;
		if (!key) throw new Error('EODHD_API_KEY environment variable is not set');
		return key;
	}

	formatDate(date) {
		return date.toISOString().split('T')[0];
	}

	threeYearsAgo() {
		const date = new Date();
		date.setFullYear(date.getFullYear() - 3);
		return this.formatDate(date);
	}

	today() {
		return this.formatDate(new Date());
	}
}
