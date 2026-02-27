jest.mock('@/models/index.js', () => ({
	Exchange: { findOne: jest.fn() },
	Ticker: { findOrCreate: jest.fn() },
	EodPrice: { bulkCreate: jest.fn() },
}));

// Side-effect import so @Bean() registers ImportExchangeService in ApplicationContext
import '@/services/importExchangeService.js';
import ApplicationContext from '@/ioc/applicationContext.js';
import { Exchange, Ticker, EodPrice } from '@/models/index.js';

// ---------------------------------------------------------------------------
// Mock eodhdService — registered in the DI container so @Inject resolves it
// ---------------------------------------------------------------------------
const mockEodhdService = {
	fetchBulkLastDay: jest.fn(),
	fetchTickerEod: jest.fn(),
	listExchangeTickers: jest.fn(),
};

ApplicationContext.constructors = {
	...ApplicationContext.constructors,
	eodhdService: async () => mockEodhdService,
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_EXCHANGE = { id: 7, code: 'US' };

const MOCK_TICKER = { id: 42 };

const MOCK_EOD_PRICES = [
	{ date: '2024-01-02', open: 185.5, high: 186.1, low: 184.0, close: 185.2, adjusted_close: 185.2, volume: 55000000 },
	{ date: '2024-01-03', open: 184.0, high: 185.0, low: 183.0, close: 184.5, adjusted_close: 184.5, volume: 48000000 },
];

/** Build N bulk ticker objects with descending volume so slicing is deterministic. */
function makeBulkData(n) {
	return Array.from({ length: n }, (_, i) => ({
		code: `T${String(i).padStart(3, '0')}`,
		name: `Ticker ${i}`,
		currency: 'USD',
		volume: (n - i) * 1000,   // T000 has highest volume
		close: 100,
	}));
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('ImportExchangeService', () => {
	let service;

	beforeEach(async () => {
		jest.clearAllMocks();

		// Default happy-path mocks
		mockEodhdService.fetchBulkLastDay.mockResolvedValue(makeBulkData(3));
		mockEodhdService.fetchTickerEod.mockResolvedValue(MOCK_EOD_PRICES);
		mockEodhdService.listExchangeTickers.mockResolvedValue([]);
		Exchange.findOne.mockResolvedValue(MOCK_EXCHANGE);
		Ticker.findOrCreate.mockResolvedValue([MOCK_TICKER, true]);
		EodPrice.bulkCreate.mockResolvedValue([]);

		// Obtain service from IoC — same path as production, @Inject wiring is real
		service = await ApplicationContext.getCurrentCtx().getBean('importExchangeService');
	});

	afterEach(async () => {
		// Reset singleton so each test gets a fresh ApplicationContext instance
		await ApplicationContext.flushCurrentCtx();
	});

	// ---------------------------------------------------------------------------
	// importExchange
	// ---------------------------------------------------------------------------
	describe('importExchange', () => {
		it('throws when the exchange is not found in the database', async () => {
			Exchange.findOne.mockResolvedValue(null);

			await expect(service.importExchange('XX')).rejects.toThrow('Exchange not found: XX');
		});

		it('calls fetchBulkLastDay with the exchange code', async () => {
			await service.importExchange('US');

			expect(mockEodhdService.fetchBulkLastDay).toHaveBeenCalledWith('US');
		});

		it('sorts tickers by volume descending before taking the top 100', async () => {
			const unsorted = [
				{ code: 'C', volume: 300, name: null, currency: null },
				{ code: 'A', volume: 100, name: null, currency: null },
				{ code: 'E', volume: 500, name: null, currency: null },
				{ code: 'B', volume: 200, name: null, currency: null },
				{ code: 'D', volume: 400, name: null, currency: null },
			];
			mockEodhdService.fetchBulkLastDay.mockResolvedValue(unsorted);
			mockEodhdService.fetchTickerEod.mockResolvedValue([]);

			await service.importExchange('US');

			const importedSymbols = Ticker.findOrCreate.mock.calls.map(([{ where }]) => where.symbol);
			expect(importedSymbols).toEqual(['E', 'D', 'C', 'B', 'A']);
		});

		it('caps import at 100 tickers even when more are returned', async () => {
			mockEodhdService.fetchBulkLastDay.mockResolvedValue(makeBulkData(150));
			mockEodhdService.fetchTickerEod.mockResolvedValue([]);

			await service.importExchange('US');

			expect(Ticker.findOrCreate).toHaveBeenCalledTimes(100);
		});

		it('fetches bulk data and symbol list for the exchange', async () => {
			await service.importExchange('US');

			expect(mockEodhdService.fetchBulkLastDay).toHaveBeenCalledWith('US');
			expect(mockEodhdService.listExchangeTickers).toHaveBeenCalledWith('US');
		});

		it('enriches tickers with name and currency from the symbol list', async () => {
			mockEodhdService.fetchBulkLastDay.mockResolvedValue([
				{ code: 'AAPL', volume: 1000 },
			]);
			mockEodhdService.listExchangeTickers.mockResolvedValue([
				{ Code: 'AAPL', Name: 'Apple Inc.', Currency: 'USD' },
			]);
			mockEodhdService.fetchTickerEod.mockResolvedValue([]);

			await service.importExchange('US');

			expect(Ticker.findOrCreate).toHaveBeenCalledWith({
				where: { symbol: 'AAPL', exchangeId: MOCK_EXCHANGE.id },
				defaults: { name: 'Apple Inc.', currency: 'USD', isTracked: true },
			});
		});

		it('falls back to null name and currency when ticker is absent from the symbol list', async () => {
			mockEodhdService.fetchBulkLastDay.mockResolvedValue([
				{ code: 'UNKNOWN', volume: 1000 },
			]);
			mockEodhdService.listExchangeTickers.mockResolvedValue([]);
			mockEodhdService.fetchTickerEod.mockResolvedValue([]);

			await service.importExchange('US');

			expect(Ticker.findOrCreate).toHaveBeenCalledWith({
				where: { symbol: 'UNKNOWN', exchangeId: MOCK_EXCHANGE.id },
				defaults: { name: null, currency: null, isTracked: true },
			});
		});

		it('continues importing remaining tickers when one fails', async () => {
			mockEodhdService.fetchTickerEod
				.mockRejectedValueOnce(new Error('API error'))
				.mockResolvedValue(MOCK_EOD_PRICES);

			await service.importExchange('US');

			// All 3 tickers attempted, 2 succeeded
			expect(Ticker.findOrCreate).toHaveBeenCalledTimes(3);
			expect(EodPrice.bulkCreate).toHaveBeenCalledTimes(2);
		});
	});

	// ---------------------------------------------------------------------------
	// importTicker
	// ---------------------------------------------------------------------------
	describe('importTicker', () => {
		it('calls Ticker.findOrCreate with the correct where and defaults', async () => {
			const item = { code: 'AAPL', name: 'Apple Inc.', currency: 'USD', volume: 1000 };
			mockEodhdService.fetchTickerEod.mockResolvedValue([]);

			await service.importTicker(item, MOCK_EXCHANGE);

			expect(Ticker.findOrCreate).toHaveBeenCalledWith({
				where: { symbol: 'AAPL', exchangeId: MOCK_EXCHANGE.id },
				defaults: { name: 'Apple Inc.', currency: 'USD', isTracked: true },
			});
		});

		it('calls fetchTickerEod with the ticker symbol and exchange code', async () => {
			const item = { code: 'AAPL', name: null, currency: null, volume: 1000 };
			mockEodhdService.fetchTickerEod.mockResolvedValue([]);

			await service.importTicker(item, MOCK_EXCHANGE);

			expect(mockEodhdService.fetchTickerEod).toHaveBeenCalledWith('AAPL', MOCK_EXCHANGE.code);
		});

		it('bulk-creates EOD prices mapped to the correct schema', async () => {
			const item = { code: 'AAPL', name: null, currency: null };

			await service.importTicker(item, MOCK_EXCHANGE);

			expect(EodPrice.bulkCreate).toHaveBeenCalledWith(
				[
					{ tickerId: MOCK_TICKER.id, date: '2024-01-02', open: 185.5, high: 186.1, low: 184.0, close: 185.2, adjustedClose: 185.2, volume: 55000000 },
					{ tickerId: MOCK_TICKER.id, date: '2024-01-03', open: 184.0, high: 185.0, low: 183.0, close: 184.5, adjustedClose: 184.5, volume: 48000000 },
				],
				{ updateOnDuplicate: ['open', 'high', 'low', 'close', 'adjustedClose', 'volume'] },
			);
		});

		it('skips bulkCreate when the EOD response is empty', async () => {
			const item = { code: 'AAPL', name: null, currency: null };
			mockEodhdService.fetchTickerEod.mockResolvedValue([]);

			await service.importTicker(item, MOCK_EXCHANGE);

			expect(EodPrice.bulkCreate).not.toHaveBeenCalled();
		});
	});
});
