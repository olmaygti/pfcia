import cron from 'node-cron';
import { ApplicationContext } from '@/ioc';
import { logger } from '@/utils';

cron.schedule('0 * * * *', async () => {
	logger.info('Cron triggered: running daily update');
	try {
		const svc = await ApplicationContext.getCurrentCtx().getBean('dailyUpdateService');
		await svc.runDailyUpdate();
		logger.info('Cron completed: daily update finished');
	} catch (err) {
		logger.error({ err }, 'Cron job failed: dailyUpdateService.runDailyUpdate');
	}
});
