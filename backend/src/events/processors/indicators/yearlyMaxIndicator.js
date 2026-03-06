import { Listen } from '@/broker';
import { Inject } from '@/ioc';
import { logger } from '@/utils';
import { EVENTS } from '@/events';
import { EodPrice, Indicator, Signal } from '@/models/index.js';
import { Op } from 'sequelize';

@Listen(EVENTS.NEW_DATAPOINT)
export default class YearlyMaxIndicator {
	@Inject('producer')
	async process(msg) {
		const { ticker, date } = msg.payload;

		const yearStart = `${date.slice(0, 4)}-01-01`;

		const [todayPrice, historicalMax] = await Promise.all([
			EodPrice.findOne({ where: { tickerId: ticker.id, date } }),
			EodPrice.max('close', {
				where: {
					tickerId: ticker.id,
					date: { [Op.lt]: date, [Op.gte]: yearStart },
				},
			}),
		]);

		if (!todayPrice) return;
		if (historicalMax !== null && +todayPrice.close <= +historicalMax) return;

		logger.info({ ticker: ticker.symbol, date }, `YearlyMax signal triggered for ${ticker.symbol} on ${date}`);

		try {
			const indicator = await Indicator.findOne({ where: { name: 'YearlyMax' } });
			await Signal.findOrCreate({
				where: { indicatorId: indicator.id, tickerId: ticker.id, date },
			});
		} catch (err) {
			logger.error({ err, ticker: ticker.symbol, date }, 'YearlyMaxIndicator failed to save signal');
		}
	}
}
