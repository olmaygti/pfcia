import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
	dotenv.config();
}

// Dynamic import ensures env vars are set before any module reads process.env
const { default: app } = await import('./app.js');
const { logger } = await import('@/utils');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	logger.info(`Backend running on port ${PORT}`);
});
