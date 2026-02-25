import { Bean, Inject } from '@/ioc';
import { logger } from '@/utils';
import { Exchange, Ticker, EodPrice } from '@/models/index.js';

const TOP_N = 100;

@Bean()
export default class ImportExchangeService {
	/**
	 * Imports the top 100 most-traded tickers for a given exchange.
	 * For each ticker, fetches and stores the last 3 years of EOD prices.
	 *
	 * @param {string} exchangeCode - EODHD exchange code, e.g. 'US'
	 */
	@Inject('eodhdService')
	async importExchange(exchangeCode) {
		const exchange = await Exchange.findOne({ where: { code: exchangeCode } });
		if (!exchange) {
			throw new Error(`Exchange not found: ${exchangeCode}`);
		}

		const [bulkData, symbolList] = await Promise.all([
			this.eodhdService.fetchBulkLastDay(exchangeCode),
			this.eodhdService.listExchangeTickers(exchangeCode),
		]);

		const nameMap = Object.fromEntries(
			symbolList.map(s => [s.Code, { name: s.Name ?? null, currency: s.Currency ?? null }]),
		);

		const top100 = [...bulkData]
			.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
			.slice(0, TOP_N);

		for (const item of top100) {
			try {
				await this.importTicker({ ...item, ...(nameMap[item.code] ?? {}) }, exchange);
			} catch (err) {
				logger.error({ err, ticker: item.code }, 'Failed to import ticker');
			}
		}
	}

	@Inject('eodhdService')
	async importTicker(item, exchange) {
		const [ticker] = await Ticker.findOrCreate({
			where: { symbol: item.code, exchangeId: exchange.id },
			defaults: {
				name: item.name ?? null,
				currency: item.currency ?? null,
				isTracked: true,
			},
		});

		const prices = await this.eodhdService.fetchTickerEod(item.code, exchange.code);

		if (!prices.length) return;

		await EodPrice.bulkCreate(
			prices.map(p => ({
				tickerId: ticker.id,
				date: p.date,
				open: p.open,
				high: p.high,
				low: p.low,
				close: p.close,
				adjustedClose: p.adjusted_close,
				volume: p.volume,
			})),
			{
				updateOnDuplicate: ['open', 'high', 'low', 'close', 'adjustedClose', 'volume'],
			},
		);
	}
}
