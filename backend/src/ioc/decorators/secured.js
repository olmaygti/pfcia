export default function Secured() {
	return (target, key, descriptor) => {
		const metaRoot = descriptor ? descriptor.value : target;
		metaRoot.__META__ = metaRoot.__META__ || {}
		metaRoot.__META__.isSecured = true;
	}
}