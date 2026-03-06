import { Listen } from '@/broker';
import { Inject } from '@/ioc';
import { logger } from '@/utils';
import { EVENTS } from '@/events';
import { EodPrice, TickerStatistic, Indicator, Signal } from '@/models/index.js';

@Listen({ eventName: EVENTS.STAT_CREATED, filter: (msg) => msg.payload.statName === '50MA' && !msg.payload.fromImport })
export default class FiftyMMIndicator {
	@Inject('producer')
	async process(msg) {
		const { statisticId, tickerId, date } = msg.payload;

		const [price, stat] = await Promise.all([
			EodPrice.findOne({ where: { tickerId, date } }),
			TickerStatistic.findByPk(statisticId),
		]);

		if (!price || !stat) return;
		if (+price.close >= +stat.value) return;

		logger.info({ tickerId, date }, `50MM signal triggered for ticker ${tickerId} on ${date}`);

		try {
			const indicator = await Indicator.findOne({ where: { name: '50MM' } });
			await Signal.findOrCreate({
				where: { indicatorId: indicator.id, tickerId, date },
			});
		} catch (err) {
			logger.error({ err, tickerId, date }, '50MMIndicator failed to save signal');
		}
	}
}
