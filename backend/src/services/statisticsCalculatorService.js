import { Bean, Inject } from '@/ioc';
import { EodPrice } from '@/models';
import { calculators } from '@/services/stats';
import { EVENTS } from '@/events';
import { logger } from '@/utils';

@Bean()
export default class StatisticsCalculatorService {
	@Inject('producer')
	async calculateForTicker(ticker, numberOfDays, fromImport) {
		logger.info({ tickerId: ticker.id }, `Calculating stats for ticker ${ticker.id} (${numberOfDays} day(s))`);

		const prices = await EodPrice.findAll({
			where: { tickerId: ticker.id },
			order: [['date', 'DESC']],
			limit: numberOfDays,
		});

		for (const price of prices) {
			try {
				const results = await Promise.all(
					Object.values(calculators).map(statFn => statFn(ticker.id, price.date)),
				);

				const stats = results.filter(Boolean);
				logger.debug({ tickerId: ticker.id, date: price.date }, `${stats.length} stat(s) calculated for ${price.date}`);

				stats.forEach(statistic => {
					this.producer.send(EVENTS.STAT_CREATED, {
						statisticId: statistic.id,
						statName: statistic.name,
						tickerId: ticker.id,
						date: price.date,
						fromImport,
					});
				});
			} catch (err) {
				logger.error({ err, tickerId: ticker.id, date: price.date }, 'Failed calculating stats');
			}
		}
	}
}
