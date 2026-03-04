jest.mock('@/broker', () => ({
	Listen: () => () => {},
}));

jest.mock('@/utils', () => ({
	logger: {
		trace: jest.fn(), debug: jest.fn(), info: jest.fn(),
		warn: jest.fn(),  error: jest.fn(), fatal: jest.fn(),
	},
}));

jest.mock('@/events', () => ({
	EVENTS: { NEW_DATAPOINT: 'NEW_DATAPOINT' },
}));

import NewDatapointProcessor from '@/events/processors/newDatapointProcessor.js';
import ApplicationContext from '@/ioc/applicationContext.js';
import { logger } from '@/utils';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------
const mockStatisticsCalculatorService = {
	calculateForTicker: jest.fn(),
};

ApplicationContext.constructors = {
	...ApplicationContext.constructors,
	statisticsCalculatorService: async () => mockStatisticsCalculatorService,
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('NewDatapointProcessor', () => {
	let processor;

	beforeEach(() => {
		jest.clearAllMocks();
		mockStatisticsCalculatorService.calculateForTicker.mockResolvedValue(undefined);
		processor = new NewDatapointProcessor();
	});

	afterEach(async () => {
		await ApplicationContext.flushCurrentCtx();
	});

	// ---------------------------------------------------------------------------
	// Happy path
	// ---------------------------------------------------------------------------
	it('calls calculateForTicker with (ticker, 1, false)', async () => {
		const ticker = { id: 42, symbol: 'AAPL' };
		const msg = {
			event: 'NEW_DATAPOINT',
			payload: { ticker, date: '2026-03-04' },
		};

		await processor.process(msg);

		expect(mockStatisticsCalculatorService.calculateForTicker).toHaveBeenCalledWith(
			ticker, 1, false,
		);
	});

	// ---------------------------------------------------------------------------
	// Error handling
	// ---------------------------------------------------------------------------
	it('catches and logs errors from calculateForTicker without rethrowing', async () => {
		const err = new Error('stats failed');
		mockStatisticsCalculatorService.calculateForTicker.mockRejectedValue(err);

		const msg = {
			event: 'NEW_DATAPOINT',
			payload: { ticker: { id: 42, symbol: 'AAPL' }, date: '2026-03-04' },
		};

		await expect(processor.process(msg)).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ err, tickerId: 42, date: '2026-03-04' }),
			expect.any(String),
		);
	});
});
