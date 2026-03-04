import express from 'express';
import cors from 'cors';
import { ApplicationContext } from '@/ioc';

// Register services with the ApplicationContext
import '@/services/authService.js';
import '@/services/eodhdService.js';
import '@/services/importExchangeService.js';
import '@/services/statisticsCalculatorService.js';

// Register controllers with the ApplicationContext
import '@/controllers/authController.js';
import '@/controllers/exchangeController.js';
import '@/controllers/tickerController.js';

// Register broker module
import '@/broker';
import '@/events';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

async function init() {
	const bean = await ApplicationContext.getCurrentCtx().getBean('controllerRegistry');
	bean.registerControllers(app);

	// Initializing all beans at startup
	await Promise.all(Object.keys(ApplicationContext.constructors)
		.map(beanName => ApplicationContext.getCurrentCtx().getBean(beanName)))

	await ApplicationContext.getCurrentCtx().executionStarted();
}

process.on('SIGINT', function() {
    console.info("Caught interrupt signal");
	ApplicationContext.getCurrentCtx().executionFinished();
    process.exit();
});


init()

export default app;
