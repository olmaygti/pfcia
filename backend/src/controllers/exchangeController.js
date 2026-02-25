import { HttpMethod, Controller, Secured } from '@/ioc';
import { Exchange } from '@/models';

@Controller('/api/exchanges')
@Secured()
export default class ExchangeController {
	@HttpMethod('GET', '/')
	async list() {
		return Exchange.findAll({ order: [['code', 'ASC']] });
	}
}
