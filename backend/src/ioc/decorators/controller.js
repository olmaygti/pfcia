import Bean from './bean'
export default function Controller(basePath) {
	return (target) => {
		target.__META__ = target.__META__ || {}
		target.__META__.type = 'Controller';
		target.__META__.basePath = basePath;
		Bean({ scope: Bean.SCOPES.PROTOTYPE })(target)
		return target;
	}
}