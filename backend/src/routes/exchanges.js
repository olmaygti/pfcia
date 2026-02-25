import { Router } from 'express';
import { Exchange } from '@/models/index.js';

const router = Router();

/**
 * GET /api/exchanges
 * Returns all exchanges ordered by code.
 * Requires a valid JWT.
 */
router.get('/', async (req, res) => {
	const exchanges = await Exchange.findAll({ order: [['code', 'ASC']] });
	return res.json(exchanges);
});

export default router;
