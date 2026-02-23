'use strict';

const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

function getGoogleClientId() {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	if (!clientId) throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
	return clientId;
}

function getJwtSecret() {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error('JWT_SECRET environment variable is not set');
	return secret;
}

/**
 * Verify a Google ID token and return the decoded payload.
 *
 * @param {string} credential - Google ID token from the frontend
 * @returns {Promise<import('google-auth-library').TokenPayload>} Decoded token payload
 */
async function verifyGoogleToken(credential) {
	const clientId = getGoogleClientId();
	const client = new OAuth2Client(clientId);
	const ticket = await client.verifyIdToken({
		idToken: credential,
		audience: clientId,
	});
	return ticket.getPayload();
}

/**
 * Find or create a User by Google ID.
 *
 * @param {import('google-auth-library').TokenPayload} payload - Verified Google token payload
 * @returns {Promise<[User, boolean]>} Sequelize findOrCreate tuple [user, created]
 */
async function findOrCreateUser(payload) {
	const [user, created] = await User.findOrCreate({
		where: { googleId: payload.sub },
		defaults: {
			email: payload.email,
			role: 'USER',
		},
	});
	return [user, created];
}

/**
 * Sign a short-lived JWT for the given user.
 *
 * @param {User} user - Sequelize User instance
 * @returns {string} Signed JWT
 */
function issueJwt(user) {
	const secret = getJwtSecret();
	return jwt.sign(
		{ sub: user.id, email: user.email, role: user.role },
		secret,
		{ expiresIn: '7d' },
	);
}

module.exports = { verifyGoogleToken, findOrCreateUser, issueJwt };
