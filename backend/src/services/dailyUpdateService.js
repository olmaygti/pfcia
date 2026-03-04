import { Bean, Inject } from '@/ioc';
import { logger } from '@/utils';
import { Exchange, Ticker, EodPrice } from '@/models/index.js';
import { Op } from 'sequelize';
import { EVENTS } from '@/events';

@Bean()
export default class DailyUpdateService {

	async runDailyUpdate() {
		const now = new Date();
		if (this.#isWeekend(now)) {
			logger.info('Daily update skipped: weekend');
			return;
		}

		const exchanges = await Exchange.findAll({
			where: { imported: true, closeUtcWinter: { [Op.not]: null } },
		});

		logger.info(`Running daily update for ${exchanges.length} exchange(s)`);

		for (const exchange of exchanges) {
			try {
				await this._processExchange(exchange, now);
			} catch (err) {
				logger.error({ err, exchange: exchange.code }, 'Failed to process exchange during daily update');
			}
		}
	}

	@Inject('eodhdService', 'producer')
	async _processExchange(exchange, now) {
		if (this.#isAlreadyUpdatedToday(exchange, now)) {
			logger.debug({ exchange: exchange.code }, 'Exchange already updated today, skipping');
			return;
		}
		const closeTime = this.#isDst(now) ? exchange.closeUtcSummer : exchange.closeUtcWinter;
		if (!this.#hasMarketClosed(closeTime, now)) {
			logger.debug({ exchange: exchange.code, closeTime }, 'Market not yet closed, skipping');
			return;
		}
		logger.info({ exchange: exchange.code }, `Running daily update for ${exchange.code}`);
		await this._updateExchange(exchange);
	}

	@Inject('eodhdService', 'producer')
	async _updateExchange(exchange) {
		const bulkData = await this.eodhdService.fetchBulkLastDay(exchange.code);
		const tickers = await Ticker.findAll({ where: { exchangeId: exchange.id, isTracked: true } });
		const tickerMap = Object.fromEntries(tickers.map(t => [t.symbol, t]));

		logger.info({ exchange: exchange.code }, `Fetched ${bulkData.length} items from API, ${tickers.length} tracked ticker(s)`);

		let updated = 0;
		for (const item of bulkData) {
			const ticker = tickerMap[item.code];
			if (!ticker) continue;
			try {
				await EodPrice.upsert({
					tickerId: ticker.id,
					date: item.date,
					open: item.open,
					high: item.high,
					low: item.low,
					close: item.close,
					adjustedClose: item.adjusted_close,
					volume: item.volume,
				});
				logger.debug({ exchange: exchange.code, ticker: ticker.symbol, date: item.date }, `${ticker.symbol} updated`);
				this.producer.send(EVENTS.NEW_DATAPOINT, {
					ticker: { id: ticker.id, symbol: ticker.symbol },
					date: item.date,
				});
				updated++;
			} catch (err) {
				logger.error({ err, ticker: ticker.symbol }, 'Failed to upsert EOD price for ticker');
			}
		}

		await exchange.update({ lastDailyUpdateAt: new Date() });
		logger.info({ exchange: exchange.code }, `Daily update complete: ${updated} ticker(s) updated`);
	}

	// Northern Hemisphere DST: April (month 3) through October (month 9) inclusive
	#isDst(now) {
		const m = now.getUTCMonth();
		return m >= 3 && m <= 9;
	}

	#hasMarketClosed(closeTime, now) {
		const [h, m] = closeTime.split(':').map(Number);
		return now.getUTCHours() * 60 + now.getUTCMinutes() >= h * 60 + m;
	}

	#isAlreadyUpdatedToday(exchange, now) {
		if (!exchange.lastDailyUpdateAt) return false;
		return new Date(exchange.lastDailyUpdateAt).toISOString().slice(0, 10)
			=== now.toISOString().slice(0, 10);
	}

	#isWeekend(now) {
		return now.getUTCDay() % 6 === 0;
	}
}
