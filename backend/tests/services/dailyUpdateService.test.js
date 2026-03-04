jest.mock('@/models/index.js', () => ({
	Exchange: { findAll: jest.fn() },
	Ticker: { findAll: jest.fn() },
	EodPrice: { upsert: jest.fn() },
}));

jest.mock('@/utils', () => ({
	logger: {
		trace: jest.fn(), debug: jest.fn(), info: jest.fn(),
		warn: jest.fn(),  error: jest.fn(), fatal: jest.fn(),
	},
}));

// Side-effect import so @Bean() registers DailyUpdateService in ApplicationContext
import '@/services/dailyUpdateService.js';
import ApplicationContext from '@/ioc/applicationContext.js';
import { Exchange, Ticker, EodPrice } from '@/models/index.js';
import { logger } from '@/utils';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------
const mockEodhdService = {
	fetchBulkLastDay: jest.fn(),
};

const mockProducer = {
	send: jest.fn(),
};

ApplicationContext.constructors = {
	...ApplicationContext.constructors,
	eodhdService: async () => mockEodhdService,
	producer: async () => mockProducer,
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function makeExchange(overrides = {}) {
	return {
		id: 1,
		code: 'US',
		imported: true,
		closeUtcWinter: '21:00',
		closeUtcSummer: '20:00',
		lastDailyUpdateAt: null,
		update: jest.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

function makeTicker(overrides = {}) {
	return {
		id: 42,
		symbol: 'AAPL',
		exchangeId: 1,
		isTracked: true,
		...overrides,
	};
}

function makeBulkItem(overrides = {}) {
	return {
		code: 'AAPL',
		date: '2026-03-04',
		open: 170.0,
		high: 172.0,
		low: 169.0,
		close: 171.0,
		adjusted_close: 171.0,
		volume: 50000000,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('DailyUpdateService', () => {
	let service;

	beforeEach(async () => {
		jest.clearAllMocks();
		jest.useRealTimers();

		// Default happy-path mocks
		Exchange.findAll.mockResolvedValue([]);
		Ticker.findAll.mockResolvedValue([]);
		EodPrice.upsert.mockResolvedValue([{}, false]);
		mockEodhdService.fetchBulkLastDay.mockResolvedValue([]);

		service = await ApplicationContext.getCurrentCtx().getBean('dailyUpdateService');
	});

	afterEach(async () => {
		await ApplicationContext.flushCurrentCtx();
	});

	// ---------------------------------------------------------------------------
	// runDailyUpdate — weekend guard
	// ---------------------------------------------------------------------------
	describe('runDailyUpdate — weekend guard', () => {
		it('skips all processing on Saturday', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-07T15:00:00Z')); // Saturday

			await service.runDailyUpdate();

			expect(Exchange.findAll).not.toHaveBeenCalled();
		});

		it('skips all processing on Sunday', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-08T15:00:00Z')); // Sunday

			await service.runDailyUpdate();

			expect(Exchange.findAll).not.toHaveBeenCalled();
		});

		it('proceeds on a weekday', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T15:00:00Z')); // Wednesday

			await service.runDailyUpdate();

			expect(Exchange.findAll).toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------------------
	// runDailyUpdate — exchange query
	// ---------------------------------------------------------------------------
	describe('runDailyUpdate — exchange query', () => {
		it('only queries imported exchanges with a non-null closeUtcWinter', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T15:00:00Z'));
			const { Op } = await import('sequelize');

			await service.runDailyUpdate();

			expect(Exchange.findAll).toHaveBeenCalledWith({
				where: { imported: true, closeUtcWinter: { [Op.not]: null } },
			});
		});
	});

	// ---------------------------------------------------------------------------
	// _processExchange — already updated today
	// ---------------------------------------------------------------------------
	describe('_processExchange — already updated today guard', () => {
		it('skips the exchange when lastDailyUpdateAt is today', async () => {
			jest.useFakeTimers();
			const now = new Date('2026-03-04T22:00:00Z');
			jest.setSystemTime(now);

			const exchange = makeExchange({ lastDailyUpdateAt: '2026-03-04T15:00:00Z' });
			Exchange.findAll.mockResolvedValue([exchange]);

			await service.runDailyUpdate();

			expect(mockEodhdService.fetchBulkLastDay).not.toHaveBeenCalled();
		});

		it('processes the exchange when lastDailyUpdateAt is yesterday', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T22:00:00Z'));

			const exchange = makeExchange({ lastDailyUpdateAt: '2026-03-03T21:00:00Z' });
			Exchange.findAll.mockResolvedValue([exchange]);

			await service.runDailyUpdate();

			expect(mockEodhdService.fetchBulkLastDay).toHaveBeenCalledWith('US');
		});

		it('processes the exchange when lastDailyUpdateAt is null', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T22:00:00Z'));

			const exchange = makeExchange({ lastDailyUpdateAt: null });
			Exchange.findAll.mockResolvedValue([exchange]);

			await service.runDailyUpdate();

			expect(mockEodhdService.fetchBulkLastDay).toHaveBeenCalledWith('US');
		});
	});

	// ---------------------------------------------------------------------------
	// _processExchange — market not yet closed
	// ---------------------------------------------------------------------------
	describe('_processExchange — market close check', () => {
		it('skips when market has not yet closed', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T20:59:00Z')); // 1 minute before winter close

			const exchange = makeExchange({ closeUtcWinter: '21:00', lastDailyUpdateAt: null });
			Exchange.findAll.mockResolvedValue([exchange]);

			await service.runDailyUpdate();

			expect(mockEodhdService.fetchBulkLastDay).not.toHaveBeenCalled();
		});

		it('processes when market has just closed (exactly at close time)', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T21:00:00Z')); // exactly at winter close

			const exchange = makeExchange({ closeUtcWinter: '21:00', lastDailyUpdateAt: null });
			Exchange.findAll.mockResolvedValue([exchange]);

			await service.runDailyUpdate();

			expect(mockEodhdService.fetchBulkLastDay).toHaveBeenCalledWith('US');
		});

		it('processes when market closed some time ago', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T23:00:00Z'));

			const exchange = makeExchange({ closeUtcWinter: '21:00', lastDailyUpdateAt: null });
			Exchange.findAll.mockResolvedValue([exchange]);

			await service.runDailyUpdate();

			expect(mockEodhdService.fetchBulkLastDay).toHaveBeenCalledWith('US');
		});
	});

	// ---------------------------------------------------------------------------
	// _processExchange — DST selection
	// ---------------------------------------------------------------------------
	describe('_processExchange — DST vs winter close time', () => {
		it('uses closeUtcSummer during DST (July)', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-07-01T20:30:00Z')); // July = DST, past summer close (20:00)

			const exchange = makeExchange({
				closeUtcWinter: '21:00',
				closeUtcSummer: '20:00',
				lastDailyUpdateAt: null,
			});
			Exchange.findAll.mockResolvedValue([exchange]);

			await service.runDailyUpdate();

			expect(mockEodhdService.fetchBulkLastDay).toHaveBeenCalledWith('US');
		});

		it('does not process during DST when only winter time has passed', async () => {
			jest.useFakeTimers();
			// July at 20:30 — past winter close (21:00 - 1h) but summer close is 20:00, so just passed
			// Let's test: 19:30 in July — before summer close (20:00), so should NOT process
			jest.setSystemTime(new Date('2026-07-01T19:30:00Z'));

			const exchange = makeExchange({
				closeUtcWinter: '21:00',
				closeUtcSummer: '20:00',
				lastDailyUpdateAt: null,
			});
			Exchange.findAll.mockResolvedValue([exchange]);

			await service.runDailyUpdate();

			expect(mockEodhdService.fetchBulkLastDay).not.toHaveBeenCalled();
		});

		it('uses closeUtcWinter outside DST (January)', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-01-15T21:30:00Z')); // January = winter, past winter close

			const exchange = makeExchange({
				closeUtcWinter: '21:00',
				closeUtcSummer: '20:00',
				lastDailyUpdateAt: null,
			});
			Exchange.findAll.mockResolvedValue([exchange]);

			await service.runDailyUpdate();

			expect(mockEodhdService.fetchBulkLastDay).toHaveBeenCalledWith('US');
		});

		it('does not process during winter when only summer time has passed', async () => {
			jest.useFakeTimers();
			// January at 20:30 — past summer close but before winter close (21:00)
			jest.setSystemTime(new Date('2026-01-15T20:30:00Z'));

			const exchange = makeExchange({
				closeUtcWinter: '21:00',
				closeUtcSummer: '20:00',
				lastDailyUpdateAt: null,
			});
			Exchange.findAll.mockResolvedValue([exchange]);

			await service.runDailyUpdate();

			expect(mockEodhdService.fetchBulkLastDay).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------------------
	// _updateExchange — upsert shape
	// ---------------------------------------------------------------------------
	describe('_updateExchange — upsert shape', () => {
		it('upserts EOD price with the correct fields', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T22:00:00Z'));

			const exchange = makeExchange();
			const ticker = makeTicker();
			const item = makeBulkItem();

			Exchange.findAll.mockResolvedValue([exchange]);
			Ticker.findAll.mockResolvedValue([ticker]);
			mockEodhdService.fetchBulkLastDay.mockResolvedValue([item]);

			await service.runDailyUpdate();

			expect(EodPrice.upsert).toHaveBeenCalledWith({
				tickerId: ticker.id,
				date: item.date,
				open: item.open,
				high: item.high,
				low: item.low,
				close: item.close,
				adjustedClose: item.adjusted_close,
				volume: item.volume,
			});
		});
	});

	// ---------------------------------------------------------------------------
	// _updateExchange — event emission
	// ---------------------------------------------------------------------------
	describe('_updateExchange — event emission', () => {
		it('sends NEW_DATAPOINT event after a successful upsert', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T22:00:00Z'));

			const exchange = makeExchange();
			const ticker = makeTicker();
			const item = makeBulkItem();

			Exchange.findAll.mockResolvedValue([exchange]);
			Ticker.findAll.mockResolvedValue([ticker]);
			mockEodhdService.fetchBulkLastDay.mockResolvedValue([item]);

			await service.runDailyUpdate();

			expect(mockProducer.send).toHaveBeenCalledWith('NEW_DATAPOINT', {
				ticker: { id: ticker.id, symbol: ticker.symbol },
				date: item.date,
			});
		});

		it('sends one event per successfully upserted ticker', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T22:00:00Z'));

			const exchange = makeExchange();
			const ticker1 = makeTicker({ id: 1, symbol: 'AAPL' });
			const ticker2 = makeTicker({ id: 2, symbol: 'MSFT' });
			const item1 = makeBulkItem({ code: 'AAPL' });
			const item2 = makeBulkItem({ code: 'MSFT', date: '2026-03-04' });

			Exchange.findAll.mockResolvedValue([exchange]);
			Ticker.findAll.mockResolvedValue([ticker1, ticker2]);
			mockEodhdService.fetchBulkLastDay.mockResolvedValue([item1, item2]);

			await service.runDailyUpdate();

			expect(mockProducer.send).toHaveBeenCalledTimes(2);
		});
	});

	// ---------------------------------------------------------------------------
	// _updateExchange — unknown tickers skipped
	// ---------------------------------------------------------------------------
	describe('_updateExchange — unknown tickers', () => {
		it('skips bulk items with no matching tracked ticker', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T22:00:00Z'));

			const exchange = makeExchange();
			const item = makeBulkItem({ code: 'UNKNOWN' });

			Exchange.findAll.mockResolvedValue([exchange]);
			Ticker.findAll.mockResolvedValue([]); // no tracked tickers
			mockEodhdService.fetchBulkLastDay.mockResolvedValue([item]);

			await service.runDailyUpdate();

			expect(EodPrice.upsert).not.toHaveBeenCalled();
			expect(mockProducer.send).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------------------
	// _updateExchange — stamps lastDailyUpdateAt
	// ---------------------------------------------------------------------------
	describe('_updateExchange — stamps lastDailyUpdateAt', () => {
		it('calls exchange.update with lastDailyUpdateAt after processing', async () => {
			jest.useFakeTimers();
			const now = new Date('2026-03-04T22:00:00Z');
			jest.setSystemTime(now);

			const exchange = makeExchange();
			Exchange.findAll.mockResolvedValue([exchange]);
			mockEodhdService.fetchBulkLastDay.mockResolvedValue([]);

			await service.runDailyUpdate();

			expect(exchange.update).toHaveBeenCalledWith({
				lastDailyUpdateAt: expect.any(Date),
			});
		});

		it('stamps exchange even when all tickers fail', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T22:00:00Z'));

			const exchange = makeExchange();
			const ticker = makeTicker();
			const item = makeBulkItem();

			Exchange.findAll.mockResolvedValue([exchange]);
			Ticker.findAll.mockResolvedValue([ticker]);
			mockEodhdService.fetchBulkLastDay.mockResolvedValue([item]);
			EodPrice.upsert.mockRejectedValue(new Error('DB error'));

			await service.runDailyUpdate();

			expect(exchange.update).toHaveBeenCalledWith({
				lastDailyUpdateAt: expect.any(Date),
			});
		});
	});

	// ---------------------------------------------------------------------------
	// _updateExchange — per-ticker error isolation
	// ---------------------------------------------------------------------------
	describe('_updateExchange — per-ticker error isolation', () => {
		it('continues processing remaining tickers when one upsert fails', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T22:00:00Z'));

			const exchange = makeExchange();
			const ticker1 = makeTicker({ id: 1, symbol: 'AAPL' });
			const ticker2 = makeTicker({ id: 2, symbol: 'MSFT' });
			const item1 = makeBulkItem({ code: 'AAPL' });
			const item2 = makeBulkItem({ code: 'MSFT' });

			Exchange.findAll.mockResolvedValue([exchange]);
			Ticker.findAll.mockResolvedValue([ticker1, ticker2]);
			mockEodhdService.fetchBulkLastDay.mockResolvedValue([item1, item2]);
			EodPrice.upsert
				.mockRejectedValueOnce(new Error('DB error'))
				.mockResolvedValue([{}, false]);

			await service.runDailyUpdate();

			expect(EodPrice.upsert).toHaveBeenCalledTimes(2);
			expect(mockProducer.send).toHaveBeenCalledTimes(1); // only the successful one
			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({ ticker: 'AAPL' }),
				expect.any(String),
			);
		});

		it('does not throw when an exchange-level error occurs', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T22:00:00Z'));

			const exchange = makeExchange();
			Exchange.findAll.mockResolvedValue([exchange]);
			mockEodhdService.fetchBulkLastDay.mockRejectedValue(new Error('API down'));

			await expect(service.runDailyUpdate()).resolves.toBeUndefined();
			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({ exchange: 'US' }),
				expect.any(String),
			);
		});
	});

	// ---------------------------------------------------------------------------
	// Ticker query
	// ---------------------------------------------------------------------------
	describe('_updateExchange — ticker query', () => {
		it('queries only tracked tickers for the exchange', async () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2026-03-04T22:00:00Z'));

			const exchange = makeExchange({ id: 7 });
			Exchange.findAll.mockResolvedValue([exchange]);
			mockEodhdService.fetchBulkLastDay.mockResolvedValue([]);

			await service.runDailyUpdate();

			expect(Ticker.findAll).toHaveBeenCalledWith({
				where: { exchangeId: 7, isTracked: true },
			});
		});
	});
});
