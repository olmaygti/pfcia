import { HttpMethod, Controller, Secured, Inject } from '@/ioc';
import { Exchange } from '@/models';

@Controller('/api/exchanges')
@Secured()
export default class ExchangeController {
	@HttpMethod('GET', '/')
	async list() {
		return Exchange.findAll({ order: [['code', 'ASC']] });
	}

	@HttpMethod('POST', '/import/:code')
	@Inject('importExchangeService')
	async import(req, res) {
		const { code } = req.params;
		try {
			await this.importExchangeService.importExchange(code);
			await Exchange.update({ imported: true }, { where: { code } });
			return { success: true };
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}
}
