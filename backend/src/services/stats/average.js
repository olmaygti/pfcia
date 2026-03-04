import { Op } from 'sequelize';
import { logger } from '@/utils';
import { EodPrice, TickerStatistic } from '@/models';

export default async function average(name, days, tickerId, date) {
	const datapoints = await EodPrice.findAll({
		attributes: ['close'],
		where: {
			tickerId,
			date: { [Op.lte]: date },
		},
		order: [['date', 'DESC']],
		limit: days,
	});

	if (datapoints.length < days) return null;

	const avg = datapoints
		.map(({ close }) => +close)
		.reduce((acc, it) => acc + it, 0) / days;

	try {
		return await TickerStatistic.create({
			tickerId,
			date,
			name,
			value: avg,
		});
	} catch (err) {
		logger.error({ err, tickerId, date, name }, 'Failed saving statistic');
	}
}
