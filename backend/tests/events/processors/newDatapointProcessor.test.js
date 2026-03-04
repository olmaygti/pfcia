// The processor calls ApplicationContext.getCurrentCtx().getBean() directly,
// so we mock @/ioc to control getBean's return value.
// This is correct: the processor is NOT IoC-managed and does NOT use @Inject.
//
// We also mock @/broker so its module-level side effects (registerBeanConstructor)
// never run against the mocked @/ioc, which would otherwise fail.
const mockGetBean = jest.fn();
jest.mock('@/ioc', () => ({
	ApplicationContext: {
		getCurrentCtx: jest.fn(() => ({ getBean: mockGetBean })),
	},
}));

jest.mock('@/broker', () => ({
	Listen: () => () => {},
}));

jest.mock('@/utils', () => ({
	logger: {
		trace: jest.fn(), debug: jest.fn(), info: jest.fn(),
		warn: jest.fn(),  error: jest.fn(), fatal: jest.fn(),
	},
}));

// @/events is mocked to prevent its processors re-importing @/broker etc.
jest.mock('@/events', () => ({
	EVENTS: { NEW_DATAPOINT: 'NEW_DATAPOINT' },
}));

// Side-effect import — triggers @Listen decoration (no-op in test context)
import NewDatapointProcessor from '@/events/processors/newDatapointProcessor.js';
import { logger } from '@/utils';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('NewDatapointProcessor', () => {
	let processor;
	let mockStatisticsCalculatorService;

	beforeEach(() => {
		jest.clearAllMocks();

		mockStatisticsCalculatorService = {
			calculateForTicker: jest.fn().mockResolvedValue(undefined),
		};

		mockGetBean.mockResolvedValue(mockStatisticsCalculatorService);

		processor = new NewDatapointProcessor();
	});

	// ---------------------------------------------------------------------------
	// Happy path
	// ---------------------------------------------------------------------------
	it('resolves statisticsCalculatorService from ApplicationContext', async () => {
		const msg = {
			event: 'NEW_DATAPOINT',
			payload: { ticker: { id: 42, symbol: 'AAPL' }, date: '2026-03-04' },
		};

		await processor.process(msg);

		expect(mockGetBean).toHaveBeenCalledWith('statisticsCalculatorService');
	});

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

	it('catches and logs errors from getBean without rethrowing', async () => {
		const err = new Error('bean not found');
		mockGetBean.mockRejectedValue(err);

		const msg = {
			event: 'NEW_DATAPOINT',
			payload: { ticker: { id: 7, symbol: 'MSFT' }, date: '2026-03-04' },
		};

		await expect(processor.process(msg)).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ err, tickerId: 7 }),
			expect.any(String),
		);
	});
});
