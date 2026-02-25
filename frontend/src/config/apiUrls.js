// import {SET_NOTIFICATIONS } from 'root/actions'

const createRestConfig = (domainName, baseConfig = {}) => {
	const namespace = `/${domainName[0].toLowerCase()}${domainName.slice(1)}`;
	return {
		[`get${domainName}`]: { uri: `${namespace}/{id}`, method: 'GET' },
		[`update${domainName}`]: { uri: `${namespace}/{id}`, method: 'PUT' },
		[`delete${domainName}`]: { uri: `${namespace}/{id}`, method: 'DELETE' },
		[`save${domainName}`]: { uri: namespace, method: 'POST' },
		[`list${domainName}s`]: { uri: namespace, method: 'GET' },
		...baseConfig,
	};
};

const createDomainConfig = (domain, domainName, baseConfig = {}) => {
	return Object.entries(createRestConfig(domainName, baseConfig))
		.reduce((acc, [method, config]) => (
			{ ...acc, [method] : { ...config, domain }}
		), {})
};

export default {
	// ...createDomainConfig(Exchange, 'Exchange', {
	// 	importExchange: { uri: '/exchange/{exchange}/import', method: 'POST'}
	// }),
	// ...createRestConfig('Profile'),
	// 	// Overriding list to automatically dispatch app wide SET_NOTIFICATIONS event
	// 	listNotifications: { uri: '/notification', method: 'GET', dispatch: SET_NOTIFICATIONS },
	// }),

	// auth
	googleLogin: { uri: '/api/auth/google', method: 'POST'},

	// exchanges
	listExchanges: { uri: '/api/exchanges', method: 'GET' },
	importExchange: { uri: '/api/exchanges/import/{code}', method: 'POST' },

	// tickerSearch: { uri: '/ticker/search/{ticker}?exchange={exchange}', method: 'GET' },
}
