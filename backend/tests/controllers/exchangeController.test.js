jest.mock('@/models', () => ({
	Exchange: { findAll: jest.fn(), update: jest.fn() },
}));

import ApplicationContext from '@/ioc/applicationContext.js';
import ExchangeController from '../../src/controllers/exchangeController.js';
import { Exchange } from '@/models';

// ---------------------------------------------------------------------------
// Mock importExchangeService in DI container so @Inject resolves it
// ---------------------------------------------------------------------------
const mockImportExchangeService = {
	importExchange: jest.fn(),
};

ApplicationContext.constructors = {
	...ApplicationContext.constructors,
	importExchangeService: async () => mockImportExchangeService,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MOCK_EXCHANGES = [
	{ id: 1, code: 'LSE', name: 'London Stock Exchange' },
	{ id: 2, code: 'US',  name: 'NYSE' },
];

function makeReq({ params = {}, body = {} } = {}) {
	return { params, body };
}

function makeRes() {
	const res = { status: jest.fn(), json: jest.fn() };
	res.status.mockReturnValue(res);
	return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ExchangeController', () => {
	let controller, req, res;

	beforeEach(() => {
		jest.clearAllMocks();
		controller = new ExchangeController();
		req = makeReq();
		res = makeRes();
	});

	afterEach(async () => {
		await ApplicationContext.flushCurrentCtx();
	});

	// ---------------------------------------------------------------------------
	// GET /api/exchanges
	// ---------------------------------------------------------------------------
	describe('list', () => {
		it('queries exchanges ordered by code ASC', async () => {
			Exchange.findAll.mockResolvedValue(MOCK_EXCHANGES);

			await controller.list(req, res);

			expect(Exchange.findAll).toHaveBeenCalledWith({ order: [['code', 'ASC']] });
		});

		it('returns the result of Exchange.findAll', async () => {
			Exchange.findAll.mockResolvedValue(MOCK_EXCHANGES);

			const result = await controller.list(req, res);

			expect(result).toBe(MOCK_EXCHANGES);
		});
	});

	// ---------------------------------------------------------------------------
	// POST /api/exchanges/import/:code
	// ---------------------------------------------------------------------------
	describe('import', () => {
		beforeEach(() => {
			req = makeReq({ params: { code: 'US' } });
			mockImportExchangeService.importExchange.mockResolvedValue(undefined);
			Exchange.update.mockResolvedValue([1]);
		});

		it('calls importExchangeService.importExchange with the exchange code', async () => {
			await controller.import(req, res);

			expect(mockImportExchangeService.importExchange).toHaveBeenCalledWith('US');
		});

		it('marks the exchange as imported in the database', async () => {
			await controller.import(req, res);

			expect(Exchange.update).toHaveBeenCalledWith(
				{ imported: true },
				{ where: { code: 'US' } },
			);
		});

		it('returns { success: true } on success', async () => {
			const result = await controller.import(req, res);

			expect(result).toEqual({ success: true });
		});

		it('responds with 500 and the error message when importExchange throws', async () => {
			mockImportExchangeService.importExchange.mockRejectedValue(new Error('API down'));

			await controller.import(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: 'API down' });
		});

		it('does not call Exchange.update when importExchange throws', async () => {
			mockImportExchangeService.importExchange.mockRejectedValue(new Error('API down'));

			await controller.import(req, res);

			expect(Exchange.update).not.toHaveBeenCalled();
		});
	});
});
