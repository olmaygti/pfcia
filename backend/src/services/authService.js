import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { Bean } from '@/ioc';
import { User } from '@/models/index.js';

@Bean()
export default class AuthService {
	/**
	 * Verify a Google ID token and return the decoded payload.
	 * @param {string} credential - Google ID token from the frontend
	 */
	async verifyGoogleToken(credential) {
		const clientId = process.env.GOOGLE_CLIENT_ID;
		if (!clientId) throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
		const client = new OAuth2Client(clientId);
		const ticket = await client.verifyIdToken({
			idToken: credential,
			audience: clientId,
		});
		return ticket.getPayload();
	}

	/**
	 * Find or create a User by Google ID.
	 * @param {object} payload - Verified Google token payload
	 * @returns {Promise<[User, boolean]>} Sequelize findOrCreate tuple [user, created]
	 */
	async findOrCreateUser(payload) {
		return User.findOrCreate({
			where: { googleId: payload.sub },
			defaults: {
				email: payload.email,
				role: 'USER',
			},
		});
	}

	/**
	 * Sign a 7-day JWT for the given user.
	 * @param {object} user - Sequelize User instance
	 * @returns {string} Signed JWT
	 */
	issueJwt(user) {
		const secret = process.env.JWT_SECRET;
		if (!secret) throw new Error('JWT_SECRET environment variable is not set');
		return jwt.sign(
			{ sub: user.id, email: user.email, role: user.role },
			secret,
			{ expiresIn: '7d' },
		);
	}
}
