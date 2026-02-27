import { ApplicationContext } from '@/ioc'
import RabbitChannel from './rabbitChannel'

export { default as Listen }from './decorators/listen'


ApplicationContext.registerBeanConstructor('producer', async () => {
    return new RabbitChannel(true);
});

ApplicationContext.registerBeanConstructor('consumer', async () => {
    return new RabbitChannel(false);
});
