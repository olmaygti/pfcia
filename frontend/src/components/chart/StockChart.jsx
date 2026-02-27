import { useEffect, useRef } from 'react';
import anychart from 'anychart';

export default function StockChart({ data, seriesName, seriesType = 'candlestick', className }) {
	const containerRef = useRef(null);

	useEffect(() => {
		if (!data?.length || !containerRef.current) return;
		containerRef.current.innerHTML = '';

		const table = anychart.data.table('x');
		table.addData(data.map((p) => ({
			x: p.date,
			open: +p.open,
			high: +p.high,
			low: +p.low,
			close: +p.close,
		})));

		const mapping = table.mapAs({ open: 'open', high: 'high', low: 'low', close: 'close' });
		const chart = anychart.stock();
		chart.plot(0)[seriesType](mapping).name(seriesName);
		chart.container(containerRef.current);
		chart.draw();

		return () => chart.dispose();
	}, [data, seriesName, seriesType]);

	return <div ref={containerRef} className={className} />;
}
