'use strict';

const jwt = require('jsonwebtoken');
const authenticate = require('../../src/middleware/authenticate');

function makeReq(authHeader) {
	return { headers: { authorization: authHeader } };
}

function makeRes() {
	const res = {};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
}

describe('authenticate middleware', () => {
	const SECRET = 'test-jwt-secret';

	beforeEach(() => {
		process.env.JWT_SECRET = SECRET;
	});

	afterEach(() => {
		delete process.env.JWT_SECRET;
	});

	it('calls next() and populates req.user for a valid token', () => {
		const token = jwt.sign({ sub: 1, email: 'a@b.com', role: 'USER' }, SECRET);
		const req = makeReq(`Bearer ${token}`);
		const res = makeRes();
		const next = jest.fn();

		authenticate(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(req.user).toMatchObject({ sub: 1, email: 'a@b.com', role: 'USER' });
	});

	it('returns 401 when Authorization header is missing', () => {
		const req = makeReq(undefined);
		const res = makeRes();
		const next = jest.fn();

		authenticate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 401 when Authorization header does not start with Bearer', () => {
		const req = makeReq('Basic sometoken');
		const res = makeRes();
		const next = jest.fn();

		authenticate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 401 for an invalid (garbage) token string', () => {
		const req = makeReq('Bearer not.a.real.token');
		const res = makeRes();
		const next = jest.fn();

		authenticate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 401 for a token signed with a different secret', () => {
		const token = jwt.sign({ sub: 99 }, 'wrong-secret');
		const req = makeReq(`Bearer ${token}`);
		const res = makeRes();
		const next = jest.fn();

		authenticate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});
});
