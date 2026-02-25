import ApplicationContext from '../applicationContext';
import { logger } from '@/utils';

export default function Inject(...resources) {
    return (target, key, descriptor) => {
        const original = descriptor.value;
        descriptor.value = async function decorator(...args) {
            const applicationContext = new ApplicationContext();
            const event = args[0];
            resources.forEach((resource) => {
                logger.debug(`Injecting ${resource} into ${key}`);
                applicationContext.injectBean(resource, event, this);
            });
            await Promise.all(this.initTasks).then(() => delete this.initTasks);
            return original.call(this, ...args);
        };
    };
}
