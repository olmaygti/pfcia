'use strict';

const jwt = require('jsonwebtoken');

/**
 * Express middleware that verifies a JWT Bearer token.
 * Attaches the decoded payload to req.user on success.
 * Returns 401 if the header is missing, malformed, or the token is invalid/expired.
 */
function authenticate(req, res, next) {
	const authHeader = req.headers['authorization'];

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Missing or malformed Authorization header' });
	}

	const token = authHeader.slice(7);
	const secret = process.env.JWT_SECRET;

	try {
		req.user = jwt.verify(token, secret);
		next();
	} catch {
		return res.status(401).json({ error: 'Invalid or expired token' });
	}
}

module.exports = authenticate;
