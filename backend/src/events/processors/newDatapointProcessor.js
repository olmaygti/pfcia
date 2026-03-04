import { Listen } from '@/broker';
import { ApplicationContext } from '@/ioc';
import { logger } from '@/utils';
import { EVENTS } from '@/events';

@Listen(EVENTS.NEW_DATAPOINT)
export default class NewDatapointProcessor {
	async process(msg) {
		const { ticker, date } = msg.payload;
		logger.info({ ticker: ticker.symbol, date }, `Calculating stats for ${ticker.symbol} on ${date}`);
		try {
			const svc = await ApplicationContext.getCurrentCtx().getBean('statisticsCalculatorService');
			await svc.calculateForTicker(ticker, 1, false);
		} catch (err) {
			logger.error({ err, tickerId: ticker.id, date }, 'NewDatapointProcessor failed');
		}
	}
}
