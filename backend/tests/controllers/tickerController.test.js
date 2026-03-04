jest.mock('@/models', () => ({
	Ticker: { findAll: jest.fn() },
	EodPrice: { findAll: jest.fn() },
	Exchange: {},
}));

import { Op } from 'sequelize';
import TickerController from '../../src/controllers/tickerController.js';
import { Ticker, EodPrice } from '@/models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeReq({ params = {}, query = {} } = {}) {
	return { params, query };
}

function makeRes() {
	const res = { status: jest.fn(), json: jest.fn() };
	res.status.mockReturnValue(res);
	return res;
}

const MOCK_TICKERS = [
	{ id: 1, symbol: 'AAPL', name: 'Apple Inc.', currency: 'USD' },
	{ id: 2, symbol: 'AMZN', name: 'Amazon.com Inc.', currency: 'USD' },
];

const MOCK_EOD = [
	{ date: '2024-01-02', open: '185.5', high: '186.1', low: '184.0', close: '185.2', volume: 55000000 },
	{ date: '2024-01-03', open: '184.0', high: '185.0', low: '183.0', close: '184.5', volume: 48000000 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TickerController', () => {
	let controller, req, res;

	beforeEach(() => {
		jest.clearAllMocks();
		controller = new TickerController();
		res = makeRes();
	});

	// ---------------------------------------------------------------------------
	// GET /api/tickers/search
	// ---------------------------------------------------------------------------
	describe('searchTickers', () => {
		it('returns 400 when q is absent', async () => {
			req = makeReq();

			await controller.searchTickers(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: 'Query must be at least 2 characters' });
		});

		it('returns 400 when q is a single character', async () => {
			req = makeReq({ query: { q: 'A' } });

			await controller.searchTickers(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
		});

		it('does not call Ticker.findAll for short queries', async () => {
			req = makeReq({ query: { q: 'A' } });

			await controller.searchTickers(req, res);

			expect(Ticker.findAll).not.toHaveBeenCalled();
		});

		it('searches by symbol and name using iLike', async () => {
			req = makeReq({ query: { q: 'APP' } });
			Ticker.findAll.mockResolvedValue(MOCK_TICKERS);

			await controller.searchTickers(req, res);

			expect(Ticker.findAll).toHaveBeenCalledWith(expect.objectContaining({
				where: {
					[Op.or]: [
						{ symbol: { [Op.iLike]: '%APP%' } },
						{ name: { [Op.iLike]: '%APP%' } },
					],
				},
			}));
		});

		it('limits to 15 results ordered by symbol ASC', async () => {
			req = makeReq({ query: { q: 'APP' } });
			Ticker.findAll.mockResolvedValue(MOCK_TICKERS);

			await controller.searchTickers(req, res);

			expect(Ticker.findAll).toHaveBeenCalledWith(expect.objectContaining({
				limit: 15,
				order: [['symbol', 'ASC']],
			}));
		});

		it('returns the list of matching tickers', async () => {
			req = makeReq({ query: { q: 'APP' } });
			Ticker.findAll.mockResolvedValue(MOCK_TICKERS);

			const result = await controller.searchTickers(req, res);

			expect(result).toBe(MOCK_TICKERS);
		});
	});

	// ---------------------------------------------------------------------------
	// GET /api/tickers/:id/eod
	// ---------------------------------------------------------------------------
	describe('getEod', () => {
		it('queries EOD prices for the given ticker id', async () => {
			req = makeReq({ params: { id: '42' } });
			EodPrice.findAll.mockResolvedValue(MOCK_EOD);

			await controller.getEod(req, res);

			expect(EodPrice.findAll).toHaveBeenCalledWith(expect.objectContaining({
				where: { tickerId: '42' },
			}));
		});

		it('orders results by date ASC', async () => {
			req = makeReq({ params: { id: '42' } });
			EodPrice.findAll.mockResolvedValue(MOCK_EOD);

			await controller.getEod(req, res);

			expect(EodPrice.findAll).toHaveBeenCalledWith(expect.objectContaining({
				order: [['date', 'ASC']],
			}));
		});

		it('returns the EOD price records', async () => {
			req = makeReq({ params: { id: '42' } });
			EodPrice.findAll.mockResolvedValue(MOCK_EOD);

			const result = await controller.getEod(req, res);

			expect(result).toBe(MOCK_EOD);
		});
	});
});
