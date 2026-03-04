jest.mock('@/models', () => ({}));

import ApplicationContext from '@/ioc/applicationContext.js';
import AuthController from '../../src/controllers/authController.js';

// ---------------------------------------------------------------------------
// Mock authService in the DI container so @Inject('authService') resolves it
// ---------------------------------------------------------------------------
const mockAuthService = {
	verifyGoogleToken: jest.fn(),
	findOrCreateUser: jest.fn(),
	issueJwt: jest.fn(),
};

ApplicationContext.constructors = {
	...ApplicationContext.constructors,
	authService: async () => mockAuthService,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MOCK_USER = { id: 1, email: 'user@example.com', role: 'USER' };
const MOCK_TOKEN = 'jwt.token.here';

function makeReq(body = {}) {
	return { body };
}

function makeRes() {
	const res = { status: jest.fn(), json: jest.fn() };
	res.status.mockReturnValue(res);
	return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AuthController', () => {
	let controller, req, res;

	beforeEach(() => {
		jest.clearAllMocks();
		controller = new AuthController();
		req = makeReq();
		res = makeRes();

		mockAuthService.verifyGoogleToken.mockResolvedValue({ sub: '123', email: MOCK_USER.email });
		mockAuthService.findOrCreateUser.mockResolvedValue([MOCK_USER, true]);
		mockAuthService.issueJwt.mockReturnValue(MOCK_TOKEN);
	});

	afterEach(async () => {
		await ApplicationContext.flushCurrentCtx();
	});

	// ---------------------------------------------------------------------------
	// POST /api/auth/google
	// ---------------------------------------------------------------------------
	describe('google', () => {
		it('returns 400 when credential is missing from the body', async () => {
			await controller.google(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: 'credential is required' });
		});

		it('returns 401 when verifyGoogleToken rejects', async () => {
			req.body.credential = 'bad-token';
			mockAuthService.verifyGoogleToken.mockRejectedValue(new Error('Token expired'));

			await controller.google(req, res);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({ error: 'Invalid Google token' });
		});

		it('calls findOrCreateUser with the verified payload', async () => {
			req.body.credential = 'valid-token';
			const payload = { sub: '123', email: MOCK_USER.email };
			mockAuthService.verifyGoogleToken.mockResolvedValue(payload);

			await controller.google(req, res);

			expect(mockAuthService.findOrCreateUser).toHaveBeenCalledWith(payload);
		});

		it('calls issueJwt with the user returned by findOrCreateUser', async () => {
			req.body.credential = 'valid-token';

			await controller.google(req, res);

			expect(mockAuthService.issueJwt).toHaveBeenCalledWith(MOCK_USER);
		});

		it('returns token and user shape on success', async () => {
			req.body.credential = 'valid-token';

			const result = await controller.google(req, res);

			expect(result).toEqual({
				token: MOCK_TOKEN,
				user: { id: MOCK_USER.id, email: MOCK_USER.email, role: MOCK_USER.role },
			});
		});

		it('does not expose extra user fields', async () => {
			req.body.credential = 'valid-token';
			mockAuthService.findOrCreateUser.mockResolvedValue([
				{ id: 1, email: 'user@example.com', role: 'USER', passwordHash: 'secret' },
				true,
			]);

			const result = await controller.google(req, res);

			expect(result.user).not.toHaveProperty('passwordHash');
		});
	});
});
