jest.mock('axios');

import axios from 'axios';
import EodhdService from '@/services/eodhdService.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

describe('EodhdService', () => {
	let service;

	beforeEach(() => {
		process.env.EODHD_API_KEY = 'test-key';
		jest.clearAllMocks();
		service = new EodhdService();
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

			await service.fetchTickerEod('AAPL', 'US');

			expect(axios.get).toHaveBeenCalledWith(
				'https://eodhd.com/api/eod/AAPL.US',
				expect.any(Object),
			);
		});

		it('sends fmt=json and api_token', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await service.fetchTickerEod('AAPL', 'US');

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

			await service.fetchTickerEod('AAPL', 'US');

			const { params } = axios.get.mock.calls[0][1];
			expect(params.from).toMatch(DATE_REGEX);
			expect(params.to).toMatch(DATE_REGEX);

			const fromYear = new Date(params.from).getFullYear();
			const toYear = new Date(params.to).getFullYear();
			expect(toYear - fromYear).toBe(3);
		});

		it('uses provided from and to dates when given', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await service.fetchTickerEod('MCD', 'US', '2022-01-01', '2022-12-31');

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

			const result = await service.fetchTickerEod('AAPL', 'US');

			expect(result).toEqual(mockData);
		});

		it('throws if EODHD_API_KEY is not set', async () => {
			delete process.env.EODHD_API_KEY;

			await expect(service.fetchTickerEod('AAPL', 'US')).rejects.toThrow('EODHD_API_KEY');
		});

		it('propagates axios errors', async () => {
			axios.get.mockRejectedValueOnce(new Error('Network error'));

			await expect(service.fetchTickerEod('AAPL', 'US')).rejects.toThrow('Network error');
		});
	});

	// ---------------------------------------------------------------------------
	// listExchangeTickers
	// ---------------------------------------------------------------------------
	describe('listExchangeTickers', () => {
		it('calls the correct URL for the given exchange', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await service.listExchangeTickers('US');

			expect(axios.get).toHaveBeenCalledWith(
				'https://eodhd.com/api/exchange-symbol-list/US',
				expect.any(Object),
			);
		});

		it('sends fmt=json and api_token', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await service.listExchangeTickers('LSE');

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
				{ Code: 'AAPL', Name: 'Apple Inc', Currency: 'USD', Type: 'Common Stock' },
				{ Code: 'MSFT', Name: 'Microsoft Corp', Currency: 'USD', Type: 'Common Stock' },
			];
			axios.get.mockResolvedValueOnce({ data: mockData });

			const result = await service.listExchangeTickers('US');

			expect(result).toEqual(mockData);
		});

		it('throws if EODHD_API_KEY is not set', async () => {
			delete process.env.EODHD_API_KEY;

			await expect(service.listExchangeTickers('US')).rejects.toThrow('EODHD_API_KEY');
		});

		it('propagates axios errors', async () => {
			axios.get.mockRejectedValueOnce(new Error('Network error'));

			await expect(service.listExchangeTickers('US')).rejects.toThrow('Network error');
		});
	});

	// ---------------------------------------------------------------------------
	// fetchBulkLastDay
	// ---------------------------------------------------------------------------
	describe('fetchBulkLastDay', () => {
		it('calls the correct URL for the given exchange', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await service.fetchBulkLastDay('US');

			expect(axios.get).toHaveBeenCalledWith(
				'https://eodhd.com/api/eod-bulk-last-day/US',
				expect.any(Object),
			);
		});

		it('sends fmt=json and api_token', async () => {
			axios.get.mockResolvedValueOnce({ data: [] });

			await service.fetchBulkLastDay('LSE');

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

			const result = await service.fetchBulkLastDay('US');

			expect(result).toEqual(mockData);
		});

		it('throws if EODHD_API_KEY is not set', async () => {
			delete process.env.EODHD_API_KEY;

			await expect(service.fetchBulkLastDay('US')).rejects.toThrow('EODHD_API_KEY');
		});

		it('propagates axios errors', async () => {
			axios.get.mockRejectedValueOnce(new Error('Network error'));

			await expect(service.fetchBulkLastDay('US')).rejects.toThrow('Network error');
		});
	});
});
