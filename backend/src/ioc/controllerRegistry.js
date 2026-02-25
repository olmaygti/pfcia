import express from 'express';

import Bean from './decorators/bean'
import ApplicationContext from './applicationContext'
import authenticate from '@/middleware/authenticate.js';


@Bean()
export default class ControllerRegistry {
	static CLEAN_MIDDLEWARE = (req, res, next) => next();

	registerControllers(app) {
		Object.entries(ApplicationContext.getControllers()).forEach(([key, clazz]) => {
			const router = express.Router();
			const baseMeta = clazz.__META__;
			let { isSecured } = baseMeta;

			Object.getOwnPropertyNames(clazz.prototype).forEach(propName => {
				const propDescriptor = Object.getOwnPropertyDescriptor(clazz.prototype, propName)
				if (propDescriptor.value.__META__ && propDescriptor.value.__META__.method) {
					const methodMeta = propDescriptor.value.__META__
					const url = `${baseMeta.basePath}${methodMeta.path}`
					isSecured = isSecured || methodMeta.isSecured;

					const middleware = isSecured ? authenticate : ControllerRegistry.CLEAN_MIDDLEWARE;

					router[`${methodMeta.method.toLowerCase()}`](url, middleware, async (req, res) => {
						const controllerInstance = await ApplicationContext.getCurrentCtx().getBean(key);
						const result = await controllerInstance[propName](req, res)
						if (result) {
							res.json(result)
						}
					});
					app.use(router)
				}
			});
		});
	}
}
