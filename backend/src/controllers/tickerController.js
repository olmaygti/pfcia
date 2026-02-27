import { Op } from 'sequelize';
import { HttpMethod, Controller, Secured } from '@/ioc';
import { Ticker, EodPrice, Exchange } from '@/models';

@Controller('/api/tickers')
@Secured()
export default class TickerController {
	@HttpMethod('GET', '/search')
	async searchTickers(req, res) {
		const { q } = req.query;
		if (!q || q.length < 2) {
			res.status(400).json({ error: 'Query must be at least 2 characters' });
			return;
		}

		return Ticker.findAll({
			where: {
				[Op.or]: [
					{ symbol: { [Op.iLike]: `%${q}%` } },
					{ name: { [Op.iLike]: `%${q}%` } },
				],
			},
			include: [{ model: Exchange, as: 'exchange', attributes: ['id', 'code', 'name'] }],
			order: [['symbol', 'ASC']],
			limit: 15,
			attributes: ['id', 'symbol', 'name', 'currency'],
		});
	}

	@HttpMethod('GET', '/:id/eod')
	async getEod(req, res) {
		return EodPrice.findAll({
			where: { tickerId: req.params.id },
			order: [['date', 'ASC']],
			attributes: ['date', 'open', 'high', 'low', 'close', 'adjustedClose', 'volume'],
		});
	}
}
