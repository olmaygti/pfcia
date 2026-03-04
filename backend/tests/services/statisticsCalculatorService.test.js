jest.mock('@/models/index.js', () => ({
	EodPrice: { findAll: jest.fn() },
}));

jest.mock('@/services/stats', () => ({
	calculators: {
		seven_ma: jest.fn(),
		fourteen_ma: jest.fn(),
	},
}));

jest.mock('@/utils', () => ({
	logger: {
		trace: jest.fn(),
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		fatal: jest.fn(),
	},
}));

// Side-effect import so @Bean() registers StatisticsCalculatorService in ApplicationContext
import '@/services/statisticsCalculatorService.js';
import ApplicationContext from '@/ioc/applicationContext.js';
import { EodPrice } from '@/models/index.js';
import { calculators } from '@/services/stats';
import { EVENTS } from '@/events';
import { logger } from '@/utils';

// ---------------------------------------------------------------------------
// Mock producer — registered in the DI container so @Inject resolves it
// ---------------------------------------------------------------------------
const mockProducer = { send: jest.fn() };

ApplicationContext.constructors = {
	...ApplicationContext.constructors,
	producer: async () => mockProducer,
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_TICKER = { id: 42 };

const MOCK_PRICES = [
	{ date: '2024-01-03' },
	{ date: '2024-01-02' },
	{ date: '2024-01-01' },
];

const MOCK_STAT_SEVEN  = { id: 10, name: '7MA',  value: 100 };
const MOCK_STAT_FOURTEEN = { id: 11, name: '14MA', value: 200 };

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('StatisticsCalculatorService', () => {
	let service;

	beforeEach(async () => {
		jest.clearAllMocks();

		EodPrice.findAll.mockResolvedValue(MOCK_PRICES);
		calculators.seven_ma.mockResolvedValue(MOCK_STAT_SEVEN);
		calculators.fourteen_ma.mockResolvedValue(MOCK_STAT_FOURTEEN);

		service = await ApplicationContext.getCurrentCtx().getBean('statisticsCalculatorService');
	});

	afterEach(async () => {
		await ApplicationContext.flushCurrentCtx();
	});

	// ---------------------------------------------------------------------------
	// EodPrice query
	// ---------------------------------------------------------------------------
	describe('EodPrice query', () => {
		it('queries by tickerId ordered by date DESC with the given limit', async () => {
			await service.calculateForTicker(MOCK_TICKER, 30, false);

			expect(EodPrice.findAll).toHaveBeenCalledWith({
				where: { tickerId: MOCK_TICKER.id },
				order: [['date', 'DESC']],
				limit: 30,
			});
		});

		it('does not call calculators or producer when there are no prices', async () => {
			EodPrice.findAll.mockResolvedValue([]);

			await service.calculateForTicker(MOCK_TICKER, 30, false);

			expect(calculators.seven_ma).not.toHaveBeenCalled();
			expect(mockProducer.send).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------------------
	// Calculator invocation
	// ---------------------------------------------------------------------------
	describe('calculator invocation', () => {
		it('calls every calculator with tickerId and date for each price row', async () => {
			await service.calculateForTicker(MOCK_TICKER, 3, false);

			for (const price of MOCK_PRICES) {
				expect(calculators.seven_ma).toHaveBeenCalledWith(MOCK_TICKER.id, price.date);
				expect(calculators.fourteen_ma).toHaveBeenCalledWith(MOCK_TICKER.id, price.date);
			}
		});
	});

	// ---------------------------------------------------------------------------
	// Event emission
	// ---------------------------------------------------------------------------
	describe('STAT_CREATED event emission', () => {
		it('emits one event per created statistic across all dates', async () => {
			// 2 calculators × 3 prices = 6 events
			await service.calculateForTicker(MOCK_TICKER, 3, false);

			expect(mockProducer.send).toHaveBeenCalledTimes(6);
		});

		it('emits STAT_CREATED with tickerId, date, statisticId, statName and fromImport=false', async () => {
			EodPrice.findAll.mockResolvedValue([{ date: '2024-01-03' }]);

			await service.calculateForTicker(MOCK_TICKER, 1, false);

			expect(mockProducer.send).toHaveBeenCalledWith(EVENTS.STAT_CREATED, {
				statisticId: MOCK_STAT_SEVEN.id,
				statName: MOCK_STAT_SEVEN.name,
				tickerId: MOCK_TICKER.id,
				date: '2024-01-03',
				fromImport: false,
			});
			expect(mockProducer.send).toHaveBeenCalledWith(EVENTS.STAT_CREATED, {
				statisticId: MOCK_STAT_FOURTEEN.id,
				statName: MOCK_STAT_FOURTEEN.name,
				tickerId: MOCK_TICKER.id,
				date: '2024-01-03',
				fromImport: false,
			});
		});

		it('passes fromImport=true through to the event payload', async () => {
			EodPrice.findAll.mockResolvedValue([{ date: '2024-01-03' }]);

			await service.calculateForTicker(MOCK_TICKER, 1, true);

			expect(mockProducer.send).toHaveBeenCalledWith(
				EVENTS.STAT_CREATED,
				expect.objectContaining({ fromImport: true }),
			);
		});

		it('skips emission for calculators that return null (insufficient data)', async () => {
			calculators.seven_ma.mockResolvedValue(null);
			calculators.fourteen_ma.mockResolvedValue(null);
			EodPrice.findAll.mockResolvedValue([{ date: '2024-01-03' }]);

			await service.calculateForTicker(MOCK_TICKER, 1, false);

			expect(mockProducer.send).not.toHaveBeenCalled();
		});

		it('only emits for non-null results when some calculators return null', async () => {
			calculators.seven_ma.mockResolvedValue(MOCK_STAT_SEVEN);
			calculators.fourteen_ma.mockResolvedValue(null);
			EodPrice.findAll.mockResolvedValue([{ date: '2024-01-03' }]);

			await service.calculateForTicker(MOCK_TICKER, 1, false);

			expect(mockProducer.send).toHaveBeenCalledTimes(1);
			expect(mockProducer.send).toHaveBeenCalledWith(
				EVENTS.STAT_CREATED,
				expect.objectContaining({ statisticId: MOCK_STAT_SEVEN.id }),
			);
		});
	});

	// ---------------------------------------------------------------------------
	// Error handling
	// ---------------------------------------------------------------------------
	describe('error handling', () => {
		it('continues processing remaining dates when one date throws', async () => {
			EodPrice.findAll.mockResolvedValue([
				{ date: '2024-01-03' },
				{ date: '2024-01-02' },
			]);

			// First call for each calculator throws; subsequent calls resolve normally
			calculators.seven_ma
				.mockRejectedValueOnce(new Error('DB failure'))
				.mockResolvedValue(MOCK_STAT_SEVEN);
			calculators.fourteen_ma
				.mockRejectedValueOnce(new Error('DB failure'))
				.mockResolvedValue(MOCK_STAT_FOURTEEN);

			await service.calculateForTicker(MOCK_TICKER, 2, false);

			// Date 1 errored — 0 events; date 2 succeeded — 2 events
			expect(mockProducer.send).toHaveBeenCalledTimes(2);
		});

		it('logs an error with tickerId and date when a date fails', async () => {
			EodPrice.findAll.mockResolvedValue([{ date: '2024-01-03' }]);
			calculators.seven_ma.mockRejectedValue(new Error('DB failure'));

			await service.calculateForTicker(MOCK_TICKER, 1, false);

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({ tickerId: MOCK_TICKER.id, date: '2024-01-03' }),
				'Failed calculating stats',
			);
		});
	});
});
