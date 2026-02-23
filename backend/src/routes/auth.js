'use strict';

const { Router } = require('express');
const { verifyGoogleToken, findOrCreateUser, issueJwt } = require('../services/auth');

const router = Router();

/**
 * POST /api/auth/google
 * body: { credential: "<google-id-token>" }
 * Returns: { token, user: { id, email, role } }
 */
router.post('/google', async (req, res) => {
	const { credential } = req.body;

	if (!credential) {
		return res.status(400).json({ error: 'credential is required' });
	}

	let payload;
	try {
		payload = await verifyGoogleToken(credential);
	} catch {
		return res.status(401).json({ error: 'Invalid Google token' });
	}

	const [user] = await findOrCreateUser(payload);
	const token = issueJwt(user);

	return res.json({
		token,
		user: { id: user.id, email: user.email, role: user.role },
	});
});

module.exports = router;
