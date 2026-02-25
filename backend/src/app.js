import express from 'express';
import cors from 'cors';
import { ApplicationContext } from '@/ioc';

// Register services with the ApplicationContext
import '@/services/authService.js';
import '@/services/eodhdService.js';
import '@/services/importExchangeService.js';

// Register controllers with the ApplicationContext
import '@/controllers/authController.js';
import '@/controllers/exchangeController.js';
import '@/controllers/tickerController.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

async function init() {
	const bean = await ApplicationContext.getCurrentCtx().getBean('controllerRegistry');
	bean.registerControllers(app);
}

export const ready = init()
	.then(() => ApplicationContext.getCurrentCtx().executionStarted());

export default app;
