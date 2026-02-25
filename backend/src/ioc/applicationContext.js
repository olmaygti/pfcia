import { v1 as uuid } from 'uuid';
import Bean from './decorators/bean';

let application;

export default class ApplicationContext {
    constructor() {
        // Allowing more than one running context should be safe but could also be tricky
        // Disallowing it until we really see the need for it
        if (application) {
            return application;
        }
        this.context = {};
        this.uuid = uuid();
        console.debug(`ApplicationContext created with ${this.uuid}`);
        application = this;
        this.readyPromise = new Promise((resolve) => this.setReady = resolve)
    }

    static constructors = {
    }

    static getCurrentCtx() {
        return new ApplicationContext();
    }

    static async flushCurrentCtx() {
        // Cleaning resources
        await ApplicationContext.getCurrentCtx().executionFinished();
        application = null;
    }

    static registerBeanConstructor(beanName, constructorFunction, ...dependencies) {
        if (this.constructors[beanName]) {
            throw new Error('Bean already exists');
        }
        this.constructors[beanName] = constructorFunction;
        constructorFunction.inject = dependencies;
    }

    static getControllers() {
        return Object.entries(this.constructors).filter(([, { target }]) => 
            target?.__META__?.type === 'Controller'
        ).reduce((acc, [key, { target }]) => {
            acc[key] = target;
            return acc;
        }, {})
    }

    cleanContext() {
        this.context = {};
    }

    injectBean(resource, event, target) {
        this.attachBean(this.getBean(resource, event), resource, target);
    }

    attachBean(promise, beanName, target) {
        if (promise) {
            target.initTasks = target.initTasks || [];
            target.initTasks.push(promise.then((obj) => {
                target[beanName] = obj;
            }));
        }
    }

    async whenReady(callback) {
        return this.readyPromise.then(() => callback(this));
    }

    async executionStarted() {
        for (const beanName of Object.keys(this.context)) {
            if (this.context[beanName].initResources) {
                await this.context[beanName].initResources();
            }
        }
        this.setReady(this);
    }

    async executionFinished() {
        for (const beanName of Object.keys(this.context)) {
            if (this.context[beanName].cleanResources) {
                await this.context[beanName].cleanResources();
            }
        }
    }

    get constructors() {
        return ApplicationContext.constructors;
    }

    async getBean(resource, event) {
        console.debug(`getBean call for ${resource} with context${this.uuid}: ${Object.keys(this.context)}`);
        if (this.context[resource] || this.context[`${resource}Promise`]) {
            console.debug(`Getting ${resource} from context ${this.context[resource] && this.context[resource].beanUuid}`);
            return this.context[resource] || this.context[`${resource}Promise`];
        }

        const beanConstructor = ApplicationContext.constructors[resource];
        if (beanConstructor) {
            let deferred;
            this.context[`${resource}Promise`] = new Promise((resolve, reject) => {
                deferred = { resolve, reject };
            });
            console.debug(`Constructing ${resource}`);
            let beanDependencies;
            if (beanConstructor.inject) {
                beanDependencies = await Promise.all(beanConstructor.inject.map((dependency) => {
                    return this.getBean(dependency, event);
                }));
            }
            beanDependencies = beanDependencies || [];
            beanConstructor(this, event, beanDependencies).then((obj) => {
                delete this.context[`${resource}Promise`];
                if (beanConstructor.scope !== Bean.SCOPES.PROTOTYPE) {
                    this.context[resource] = obj;
                }
                obj.beanUuid = uuid();
                console.debug(`${resource} created with ${obj.beanUuid}`);
                deferred.resolve(obj);
            }).catch((err) => {
                console.error(`Error while constructing ${resource}`, err);
                deferred.resolve();
                delete this.context[`${resource}Promise`];
            });

            return this.context[`${resource}Promise`];
        }

        return null;
    }
}
