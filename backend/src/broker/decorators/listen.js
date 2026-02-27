import { ApplicationContext } from '@/ioc';

export default function Listen(...events) {
	return function (target, ...rest) {
		ApplicationContext.getCurrentCtx()
			.whenReady(async appContext => {
				const consumer = await appContext.getBean('consumer')
				const processor = new target();
				events.forEach(eventConfig => {
					const eventName = typeof eventConfig === 'string'
						? eventConfig : eventConfig.eventName;
					consumer.subscribe(eventName, processor, eventConfig.filter)
				})
			});
	}
}
