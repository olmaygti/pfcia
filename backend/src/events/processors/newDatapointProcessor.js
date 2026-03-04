import { Listen } from '@/broker';
import { Inject } from '@/ioc';
import { logger } from '@/utils';
import { EVENTS } from '@/events';

@Listen(EVENTS.NEW_DATAPOINT)
export default class NewDatapointProcessor {
	@Inject('statisticsCalculatorService')
	async process(msg) {
		const { ticker, date } = msg.payload;
		logger.info({ ticker: ticker.symbol, date }, `Calculating stats for ${ticker.symbol} on ${date}`);
		try {
			await this.statisticsCalculatorService.calculateForTicker(ticker, 1, false);
		} catch (err) {
			logger.error({ err, tickerId: ticker.id, date }, 'NewDatapointProcessor failed');
		}
	}
}
