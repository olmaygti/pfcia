jest.mock('@/models/index.js', () => ({
	User: { findOrCreate: jest.fn() },
	Exchange: { findAll: jest.fn() },
}));
jest.mock('google-auth-library');

import request from 'supertest';
import app, { ready } from '../src/app.js';

beforeAll(() => ready);

describe('Health check', () => {
	it('GET /health returns ok', async () => {
		const res = await request(app).get('/health');
		expect(res.statusCode).toBe(200);
		expect(res.body.status).toBe('ok');
	});
});
