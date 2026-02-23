'use strict';

const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const { Exchange } = require('../models');

const router = Router();

/**
 * GET /api/exchanges
 * Returns all exchanges ordered by code.
 * Requires a valid JWT.
 */
router.get('/', authenticate, async (req, res) => {
	const exchanges = await Exchange.findAll({ order: [['code', 'ASC']] });
	return res.json(exchanges);
});

module.exports = router;
