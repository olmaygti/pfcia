jest.mock('@/broker', () => ({ Listen: () => () => {} }));
jest.mock('@/ioc', () => ({ Inject: () => () => {} }));
jest.mock('@/utils', () => ({
	logger: {
		trace: jest.fn(), debug: jest.fn(), info: jest.fn(),
		warn: jest.fn(),  error: jest.fn(), fatal: jest.fn(),
	},
}));
jest.mock('@/events', () => ({ EVENTS: { STAT_CREATED: 'STAT_CREATED' } }));
jest.mock('@/models/index.js', () => ({
	EodPrice: { findOne: jest.fn() },
	TickerStatistic: { findByPk: jest.fn() },
	Indicator: { findOne: jest.fn() },
	Signal: { findOrCreate: jest.fn() },
}));

import FiftyMMIndicator from '@/events/processors/indicators/fiftyMMIndicator.js';
import { EodPrice, TickerStatistic, Indicator, Signal } from '@/models/index.js';
import { logger } from '@/utils';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_INDICATOR = { id: 1 };

function makeMsg(overrides = {}) {
	return {
		event: 'STAT_CREATED',
		payload: {
			statisticId: 99,
			statName: '50MA',
			tickerId: 42,
			date: '2026-03-04',
			fromImport: false,
			...overrides,
		},
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('FiftyMMIndicator', () => {
	let processor;

	beforeEach(() => {
		jest.clearAllMocks();
		Indicator.findOne.mockResolvedValue(MOCK_INDICATOR);
		Signal.findOrCreate.mockResolvedValue([{}, true]);
		processor = new FiftyMMIndicator();
	});

	it('creates a signal when close is below the 50MA', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '148.00' });
		TickerStatistic.findByPk.mockResolvedValue({ value: '150.00' });

		await processor.process(makeMsg());

		expect(Signal.findOrCreate).toHaveBeenCalledWith({
			where: { indicatorId: MOCK_INDICATOR.id, tickerId: 42, date: '2026-03-04' },
		});
	});

	it('does not create a signal when close equals the 50MA', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '150.00' });
		TickerStatistic.findByPk.mockResolvedValue({ value: '150.00' });

		await processor.process(makeMsg());

		expect(Signal.findOrCreate).not.toHaveBeenCalled();
	});

	it('does not create a signal when close is above the 50MA', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '155.00' });
		TickerStatistic.findByPk.mockResolvedValue({ value: '150.00' });

		await processor.process(makeMsg());

		expect(Signal.findOrCreate).not.toHaveBeenCalled();
	});

	it('does nothing when there is no price for today', async () => {
		EodPrice.findOne.mockResolvedValue(null);
		TickerStatistic.findByPk.mockResolvedValue({ value: '150.00' });

		await processor.process(makeMsg());

		expect(Signal.findOrCreate).not.toHaveBeenCalled();
	});

	it('does nothing when the stat record is not found', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '148.00' });
		TickerStatistic.findByPk.mockResolvedValue(null);

		await processor.process(makeMsg());

		expect(Signal.findOrCreate).not.toHaveBeenCalled();
	});

	it('fetches the stat by the statisticId from the payload', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '148.00' });
		TickerStatistic.findByPk.mockResolvedValue({ value: '150.00' });

		await processor.process(makeMsg({ statisticId: 77 }));

		expect(TickerStatistic.findByPk).toHaveBeenCalledWith(77);
	});

	it('catches and logs errors from Signal.findOrCreate without rethrowing', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '148.00' });
		TickerStatistic.findByPk.mockResolvedValue({ value: '150.00' });
		Signal.findOrCreate.mockRejectedValue(new Error('DB error'));

		await expect(processor.process(makeMsg())).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ tickerId: 42, date: '2026-03-04' }),
			expect.any(String),
		);
	});
});
