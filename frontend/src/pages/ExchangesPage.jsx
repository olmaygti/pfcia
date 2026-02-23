import { useEffect, useState } from 'react';
import api from '@/lib/api';

const COLUMNS = [
	{ key: 'code', label: 'Code' },
	{ key: 'name', label: 'Name' },
	{ key: 'country', label: 'Country' },
	{ key: 'currency', label: 'Currency' },
	{ key: 'operatingMic', label: 'Operating MIC' },
	{ key: 'closeUtcWinter', label: 'Close UTC (Winter)' },
	{ key: 'closeUtcSummer', label: 'Close UTC (Summer)' },
];

export default function ExchangesPage() {
	const [exchanges, setExchanges] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		api.listExchanges()
			.then((data) => setExchanges(data ?? []))
			.catch(() => setError('Failed to load exchanges.'))
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return <p className="text-gray-400 text-sm">Loading…</p>;
	}

	if (error) {
		return <p className="text-red-400 text-sm">{error}</p>;
	}

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Exchanges</h1>
			<div className="overflow-x-auto rounded-lg border border-gray-800">
				<table className="w-full text-sm text-left">
					<thead className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wider">
						<tr>
							{COLUMNS.map(({ key, label }) => (
								<th key={key} className="px-4 py-3 font-medium whitespace-nowrap">
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-800">
						{exchanges.map((exchange) => (
							<tr key={exchange.id} className="hover:bg-gray-900 transition-colors">
								{COLUMNS.map(({ key }) => (
									<td key={key} className="px-4 py-3 text-gray-300 whitespace-nowrap">
										{exchange[key] ?? <span className="text-gray-600">—</span>}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
