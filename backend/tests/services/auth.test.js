'use strict';

jest.mock('google-auth-library');
jest.mock('../../src/models', () => ({
	User: { findOrCreate: jest.fn() },
}));

const { OAuth2Client } = require('google-auth-library');
const { User } = require('../../src/models');
const { verifyGoogleToken, findOrCreateUser, issueJwt } = require('../../src/services/auth');
const jwt = require('jsonwebtoken');

const MOCK_PAYLOAD = {
	sub: 'google-user-123',
	email: 'test@example.com',
};

describe('auth service', () => {
	beforeEach(() => {
		process.env.GOOGLE_CLIENT_ID = 'test-client-id';
		process.env.JWT_SECRET = 'test-secret';
		jest.clearAllMocks();
	});

	afterEach(() => {
		delete process.env.GOOGLE_CLIENT_ID;
		delete process.env.JWT_SECRET;
	});

	// ---------------------------------------------------------------------------
	// verifyGoogleToken
	// ---------------------------------------------------------------------------
	describe('verifyGoogleToken', () => {
		it('passes the correct audience (GOOGLE_CLIENT_ID) to verifyIdToken', async () => {
			const mockGetPayload = jest.fn().mockReturnValue(MOCK_PAYLOAD);
			const mockVerifyIdToken = jest.fn().mockResolvedValue({ getPayload: mockGetPayload });
			OAuth2Client.mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));

			await verifyGoogleToken('fake-credential');

			expect(mockVerifyIdToken).toHaveBeenCalledWith({
				idToken: 'fake-credential',
				audience: 'test-client-id',
			});
		});

		it('returns the token payload', async () => {
			const mockGetPayload = jest.fn().mockReturnValue(MOCK_PAYLOAD);
			const mockVerifyIdToken = jest.fn().mockResolvedValue({ getPayload: mockGetPayload });
			OAuth2Client.mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));

			const result = await verifyGoogleToken('fake-credential');

			expect(result).toEqual(MOCK_PAYLOAD);
		});

		it('throws if GOOGLE_CLIENT_ID is not set', async () => {
			delete process.env.GOOGLE_CLIENT_ID;

			await expect(verifyGoogleToken('fake-credential')).rejects.toThrow('GOOGLE_CLIENT_ID');
		});

		it('propagates errors from verifyIdToken', async () => {
			const mockVerifyIdToken = jest.fn().mockRejectedValue(new Error('Token invalid'));
			OAuth2Client.mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }));

			await expect(verifyGoogleToken('bad-credential')).rejects.toThrow('Token invalid');
		});
	});

	// ---------------------------------------------------------------------------
	// findOrCreateUser
	// ---------------------------------------------------------------------------
	describe('findOrCreateUser', () => {
		it('calls User.findOrCreate with googleId as the where condition', async () => {
			const mockUser = { id: 1, email: MOCK_PAYLOAD.email, role: 'USER' };
			User.findOrCreate = jest.fn().mockResolvedValue([mockUser, true]);

			await findOrCreateUser(MOCK_PAYLOAD);

			expect(User.findOrCreate).toHaveBeenCalledWith({
				where: { googleId: MOCK_PAYLOAD.sub },
				defaults: {
					email: MOCK_PAYLOAD.email,
					role: 'USER',
				},
			});
		});

		it('returns the user and created flag', async () => {
			const mockUser = { id: 1, email: MOCK_PAYLOAD.email, role: 'USER' };
			User.findOrCreate = jest.fn().mockResolvedValue([mockUser, false]);

			const [user, created] = await findOrCreateUser(MOCK_PAYLOAD);

			expect(user).toEqual(mockUser);
			expect(created).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// issueJwt
	// ---------------------------------------------------------------------------
	describe('issueJwt', () => {
		it('returns a token that decodes to the correct payload', () => {
			const mockUser = { id: 42, email: 'user@example.com', role: 'USER' };

			const token = issueJwt(mockUser);
			const decoded = jwt.verify(token, 'test-secret');

			expect(decoded.sub).toBe(42);
			expect(decoded.email).toBe('user@example.com');
			expect(decoded.role).toBe('USER');
		});

		it('uses JWT_SECRET from environment', () => {
			process.env.JWT_SECRET = 'another-secret';
			const mockUser = { id: 1, email: 'a@b.com', role: 'ADMIN' };

			const token = issueJwt(mockUser);

			expect(() => jwt.verify(token, 'another-secret')).not.toThrow();
			expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
		});

		it('throws if JWT_SECRET is not set', () => {
			delete process.env.JWT_SECRET;
			const mockUser = { id: 1, email: 'a@b.com', role: 'USER' };

			expect(() => issueJwt(mockUser)).toThrow('JWT_SECRET');
		});
	});
});
