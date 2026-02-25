export default function HttpMethod(method, path, middleware) {
	if (!path || !method) {
		throw new Error('Path and HTTP method must be provided');
	}
	return (target, key, descriptor) => {
		if (!descriptor) {
			throw new Error('Decorator can only be applied to instance methods')
		}
		descriptor.value.__META__ = descriptor.value.__META__ || {}
		descriptor.value.__META__.method = method;
		descriptor.value.__META__.path = path;
		descriptor.value.__META__.middleware = middleware;
	}
}