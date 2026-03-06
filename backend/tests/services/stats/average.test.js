jest.mock('@/models', () => ({
	EodPrice: { findAll: jest.fn() },
	TickerStatistic: { upsert: jest.fn() },
}));

import { Op } from 'sequelize';
import average from '../../../src/services/stats/average.js';
import stats from '../../../src/services/stats/index.js';
import { EodPrice, TickerStatistic } from '@/models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sequelize returns DECIMAL columns as strings — mirror that here. */
function makeDatapoints(...closes) {
	return closes.map((close) => ({ close: String(close) }));
}

const TICKER_ID = 42;
const DATE = '2024-06-01';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('average', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		TickerStatistic.upsert.mockResolvedValue([{ id: 1 }, false]);
	});

	// ---------------------------------------------------------------------------
	// EodPrice query
	// ---------------------------------------------------------------------------
	describe('EodPrice query', () => {
		it('queries by tickerId and date <= given date', async () => {
			EodPrice.findAll.mockResolvedValue(makeDatapoints(100));

			await average('sma_1', 1, TICKER_ID, DATE);

			expect(EodPrice.findAll).toHaveBeenCalledWith(expect.objectContaining({
				where: expect.objectContaining({
					tickerId: TICKER_ID,
					date: expect.objectContaining({ [Op.lte]: DATE }),
				}),
			}));
		});

		it('orders by date DESC and limits to the requested window', async () => {
			EodPrice.findAll.mockResolvedValue(makeDatapoints(100));

			await average('sma_7', 7, TICKER_ID, DATE);

			expect(EodPrice.findAll).toHaveBeenCalledWith(expect.objectContaining({
				order: [['date', 'DESC']],
				limit: 7,
			}));
		});
	});

	// ---------------------------------------------------------------------------
	// Average calculation
	// ---------------------------------------------------------------------------
	describe('average calculation', () => {
		it('correctly averages the datapoints', async () => {
			EodPrice.findAll.mockResolvedValue(makeDatapoints(100, 200, 300));

			await average('sma_3', 3, TICKER_ID, DATE);

			expect(TickerStatistic.upsert).toHaveBeenCalledWith(expect.objectContaining({
				value: 200,
			}));
		});

		it('casts DECIMAL strings to numbers before summing', async () => {
			EodPrice.findAll.mockResolvedValue(makeDatapoints('10.5', '20.5'));

			await average('sma_2', 2, TICKER_ID, DATE);

			expect(TickerStatistic.upsert).toHaveBeenCalledWith(expect.objectContaining({
				value: 15.5,
			}));
		});

		it('returns null and skips saving when fewer datapoints than the requested window', async () => {
			// Only 2 datapoints available for a 7-day window (new ticker, sparse history)
			EodPrice.findAll.mockResolvedValue(makeDatapoints(100, 200));

			const result = await average('sma_7', 7, TICKER_ID, DATE);

			expect(result).toBeNull();
			expect(TickerStatistic.upsert).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------------------
	// Empty datapoints
	// ---------------------------------------------------------------------------
	describe('when no EOD data is available', () => {
		it('returns null without saving a statistic', async () => {
			EodPrice.findAll.mockResolvedValue([]);

			const result = await average('sma_7', 7, TICKER_ID, DATE);

			expect(result).toBeNull();
			expect(TickerStatistic.upsert).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------------------
	// TickerStatistic persistence
	// ---------------------------------------------------------------------------
	describe('TickerStatistic persistence', () => {
		it('saves with the correct tickerId, date, and name', async () => {
			EodPrice.findAll.mockResolvedValue(makeDatapoints(100, 200, 300));

			await average('sma_3', 3, TICKER_ID, DATE);

			expect(TickerStatistic.upsert).toHaveBeenCalledWith(expect.objectContaining({
				tickerId: TICKER_ID,
				date: DATE,
				name: 'sma_3',
			}));
		});

		it('returns the upserted statistic', async () => {
			EodPrice.findAll.mockResolvedValue(makeDatapoints(100, 200, 300));
			const mockStat = { id: 99, value: 200 };
			TickerStatistic.upsert.mockResolvedValue([mockStat, false]);

			const result = await average('sma_3', 3, TICKER_ID, DATE);

			expect(result).toBe(mockStat);
		});

		it('returns undefined and does not throw when upsert fails', async () => {
			EodPrice.findAll.mockResolvedValue(makeDatapoints(150));
			TickerStatistic.upsert.mockRejectedValue(new Error('DB error'));

			await expect(average('sma_50', 50, TICKER_ID, DATE)).resolves.not.toThrow();
		});
	});

	// ---------------------------------------------------------------------------
	// Pre-bound convenience functions
	// ---------------------------------------------------------------------------
	describe('pre-bound stat functions', () => {
		it.each([
			['seven_ma',    '7MA',  7],
			['fourteen_ma', '14MA', 14],
			['twentyone_ma','21MA', 21],
			['fifty_ma',    '50MA', 50],
		])('%s passes name=%s and days=%i', async (fn, name, days) => {
			const enoughData = makeDatapoints(...Array.from({ length: days }, () => 100));
			EodPrice.findAll.mockResolvedValue(enoughData);

			await stats[fn](TICKER_ID, DATE);

			expect(EodPrice.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: days }));
			expect(TickerStatistic.upsert).toHaveBeenCalledWith(expect.objectContaining({ name }));
		});
	});
});
