jest.mock('@/models/index.js', () => ({
	User: { findOrCreate: jest.fn() },
	Exchange: { findAll: jest.fn() },
}));
jest.mock('google-auth-library');

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app, { ready } from '../../src/app.js';
import { Exchange } from '@/models/index.js';

const SECRET = 'test-secret';

function makeToken(payload = { sub: 1, email: 'a@b.com', role: 'USER' }) {
	return jwt.sign(payload, SECRET);
}

const MOCK_EXCHANGES = [
	{ id: 1, code: 'LSE', name: 'London Stock Exchange', country: 'UK', currency: 'GBP' },
	{ id: 2, code: 'US', name: 'NYSE', country: 'USA', currency: 'USD' },
];

beforeAll(() => ready);

describe('GET /api/exchanges', () => {
	beforeEach(() => {
		process.env.JWT_SECRET = SECRET;
		jest.clearAllMocks();
	});

	afterEach(() => {
		delete process.env.JWT_SECRET;
	});

	it('returns 401 when no Authorization header is provided', async () => {
		const res = await request(app).get('/api/exchanges');
		expect(res.statusCode).toBe(401);
	});

	it('returns 401 when the token is invalid', async () => {
		const res = await request(app)
			.get('/api/exchanges')
			.set('Authorization', 'Bearer bad.token.here');
		expect(res.statusCode).toBe(401);
	});

	it('returns 200 with the list of exchanges for a valid token', async () => {
		Exchange.findAll.mockResolvedValue(MOCK_EXCHANGES);

		const res = await request(app)
			.get('/api/exchanges')
			.set('Authorization', `Bearer ${makeToken()}`);

		expect(res.statusCode).toBe(200);
		expect(res.body).toEqual(MOCK_EXCHANGES);
	});

	it('calls Exchange.findAll ordered by code ASC', async () => {
		Exchange.findAll.mockResolvedValue([]);

		await request(app)
			.get('/api/exchanges')
			.set('Authorization', `Bearer ${makeToken()}`);

		expect(Exchange.findAll).toHaveBeenCalledWith({ order: [['code', 'ASC']] });
	});
});
