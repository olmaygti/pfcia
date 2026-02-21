'use strict';

jest.mock('axios');

const axios = require('axios');
const { fetchTickerEod, fetchBulkLastDay } = require('../../src/services/eodhd');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

describe('eodhd service', () => {
	beforeEach(() => {
		process.env.EODHD_API_KEY = 'test-key';
		jest.clearAllMocks();
	});

	afterEach(() => {
		delete process.env.EODHD_API_KEY;
	});

	// ---------------------------------------------------------------------------
	// fetchTickerEod
	// ---------------------------------------------------------------------------
	describe('fetchTickerEod', () => {
		it('calls the correct URL using symbol and exchange', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await fetchTickerEod('AAPL', 'US');

			expect(axios.get).toHaveBeenCalledWith(
				'https://eodhd.com/api/eod/AAPL.US',
				expect.any(Object),
			);
		});

		it('sends fmt=json and api_token', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await fetchTickerEod('AAPL', 'US');

			expect(axios.get).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					params: expect.objectContaining({
						fmt: 'json',
						api_token: 'test-key',
					}),
				}),
			);
		});

		it('defaults from to 3 years ago and to to today', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await fetchTickerEod('AAPL', 'US');

			const { params } = axios.get.mock.calls[0][1];
			expect(params.from).toMatch(DATE_REGEX);
			expect(params.to).toMatch(DATE_REGEX);

			const fromYear = new Date(params.from).getFullYear();
			const toYear = new Date(params.to).getFullYear();
			expect(toYear - fromYear).toBe(3);
		});

		it('uses provided from and to dates when given', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await fetchTickerEod('MCD', 'US', '2022-01-01', '2022-12-31');

			expect(axios.get).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					params: expect.objectContaining({
						from: '2022-01-01',
						to: '2022-12-31',
					}),
				}),
			);
		});

		it('returns the data from the API response', async () => {
			const mockData = [
				{ date: '2024-01-02', open: 185.5, high: 186.1, low: 184.0, close: 185.2, adjusted_close: 185.2, volume: 55000000 },
			];
			axios.get.mockResolvedValueOnce({ data: mockData });

			const result = await fetchTickerEod('AAPL', 'US');

			expect(result).toEqual(mockData);
		});

		it('throws if EODHD_API_KEY is not set', async () => {
			delete process.env.EODHD_API_KEY;

			await expect(fetchTickerEod('AAPL', 'US')).rejects.toThrow('EODHD_API_KEY');
		});

		it('propagates axios errors', async () => {
			axios.get.mockRejectedValueOnce(new Error('Network error'));

			await expect(fetchTickerEod('AAPL', 'US')).rejects.toThrow('Network error');
		});
	});

	// ---------------------------------------------------------------------------
	// fetchBulkLastDay
	// ---------------------------------------------------------------------------
	describe('fetchBulkLastDay', () => {
		it('calls the correct URL for the given exchange', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await fetchBulkLastDay('US');

			expect(axios.get).toHaveBeenCalledWith(
				'https://eodhd.com/api/eod-bulk-last-day/US',
				expect.any(Object),
			);
		});

		it('sends fmt=json and api_token', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await fetchBulkLastDay('LSE');

			expect(axios.get).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					params: expect.objectContaining({
						fmt: 'json',
						api_token: 'test-key',
					}),
				}),
			);
		});

		it('returns the data from the API response', async () => {
			const mockData = [
				{ code: 'AAPL', close: 185.2, volume: 55000000 },
				{ code: 'MSFT', close: 375.0, volume: 22000000 },
			];
			axios.get.mockResolvedValueOnce({ data: mockData });

			const result = await fetchBulkLastDay('US');

			expect(result).toEqual(mockData);
		});

		it('throws if EODHD_API_KEY is not set', async () => {
			delete process.env.EODHD_API_KEY;

			await expect(fetchBulkLastDay('US')).rejects.toThrow('EODHD_API_KEY');
		});

		it('propagates axios errors', async () => {
			axios.get.mockRejectedValueOnce(new Error('Network error'));

			await expect(fetchBulkLastDay('US')).rejects.toThrow('Network error');
		});
	});
});
