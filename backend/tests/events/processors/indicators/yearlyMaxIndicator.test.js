jest.mock('@/broker', () => ({ Listen: () => () => {} }));
jest.mock('@/ioc', () => ({ Inject: () => () => {} }));
jest.mock('@/utils', () => ({
	logger: {
		trace: jest.fn(), debug: jest.fn(), info: jest.fn(),
		warn: jest.fn(),  error: jest.fn(), fatal: jest.fn(),
	},
}));
jest.mock('@/events', () => ({ EVENTS: { NEW_DATAPOINT: 'NEW_DATAPOINT' } }));
jest.mock('@/models/index.js', () => ({
	EodPrice: { findOne: jest.fn(), max: jest.fn() },
	Indicator: { findOne: jest.fn() },
	Signal: { findOrCreate: jest.fn() },
}));

import YearlyMaxIndicator from '@/events/processors/indicators/yearlyMaxIndicator.js';
import { EodPrice, Indicator, Signal } from '@/models/index.js';
import { logger } from '@/utils';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_INDICATOR = { id: 2 };

function makeMsg(overrides = {}) {
	return {
		event: 'NEW_DATAPOINT',
		payload: {
			ticker: { id: 42, symbol: 'AAPL' },
			date: '2026-03-04',
			...overrides,
		},
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('YearlyMaxIndicator', () => {
	let processor;

	beforeEach(() => {
		jest.clearAllMocks();
		Indicator.findOne.mockResolvedValue(MOCK_INDICATOR);
		Signal.findOrCreate.mockResolvedValue([{}, true]);
		processor = new YearlyMaxIndicator();
	});

	it('creates a signal when today exceeds the historical max', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '200.00' });
		EodPrice.max.mockResolvedValue('199.00');

		await processor.process(makeMsg());

		expect(Signal.findOrCreate).toHaveBeenCalledWith({
			where: { indicatorId: MOCK_INDICATOR.id, tickerId: 42, date: '2026-03-04' },
		});
	});

	it('creates a signal when there is no prior data this calendar year (e.g. first trading day of the year)', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '200.00' });
		EodPrice.max.mockResolvedValue(null);

		await processor.process(makeMsg());

		expect(Signal.findOrCreate).toHaveBeenCalled();
	});

	it('does not create a signal when today equals the historical max', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '200.00' });
		EodPrice.max.mockResolvedValue('200.00');

		await processor.process(makeMsg());

		expect(Signal.findOrCreate).not.toHaveBeenCalled();
	});

	it('does not create a signal when today is below the historical max', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '198.00' });
		EodPrice.max.mockResolvedValue('200.00');

		await processor.process(makeMsg());

		expect(Signal.findOrCreate).not.toHaveBeenCalled();
	});

	it('does nothing when there is no price for today', async () => {
		EodPrice.findOne.mockResolvedValue(null);
		EodPrice.max.mockResolvedValue('200.00');

		await processor.process(makeMsg());

		expect(Signal.findOrCreate).not.toHaveBeenCalled();
	});

	it('catches and logs errors from Signal.findOrCreate without rethrowing', async () => {
		EodPrice.findOne.mockResolvedValue({ close: '200.00' });
		EodPrice.max.mockResolvedValue(null);
		Signal.findOrCreate.mockRejectedValue(new Error('DB error'));

		await expect(processor.process(makeMsg())).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ ticker: 'AAPL', date: '2026-03-04' }),
			expect.any(String),
		);
	});
});
