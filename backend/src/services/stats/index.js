import average from './average.js';

export const calculators = {
	seven_ma: average.bind(null, '7MA', 7),
	fourteen_ma: average.bind(null, '14MA', 14),
	twentyone_ma: average.bind(null, '21MA', 21),
	fifty_ma: average.bind(null, '50MA', 50),
};

export default {
	...calculators,
	average,
};
