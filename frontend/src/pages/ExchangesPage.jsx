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
	{ key: 'status', label: 'Status' },
];

export default function ExchangesPage() {
	const [exchanges, setExchanges] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [importing, setImporting] = useState(new Set());

	useEffect(() => {
		api.listExchanges()
			.then((data) => setExchanges(data ?? []))
			.catch(() => setError('Failed to load exchanges.'))
			.finally(() => setLoading(false));
	}, []);

	async function handleImport(code) {
		setImporting((prev) => new Set(prev).add(code));
		try {
			const result = await api.importExchange(code);
			if (result?.success) {
				setExchanges((prev) =>
					prev.map((ex) => (ex.code === code ? { ...ex, imported: true } : ex)),
				);
			}
		} finally {
			setImporting((prev) => {
				const next = new Set(prev);
				next.delete(code);
				return next;
			});
		}
	}

	function renderCell(exchange, key) {
		if (key === 'status') {
			if (exchange.imported) {
				return (
					<span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
						Imported
					</span>
				);
			}
			const busy = importing.has(exchange.code);
			return (
				<button
					disabled={busy}
					onClick={() => handleImport(exchange.code)}
					className="px-3 py-1 rounded text-xs font-medium bg-blue-700 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{busy ? 'Importing…' : 'Import'}
				</button>
			);
		}
		return exchange[key] ?? <span className="text-gray-600">—</span>;
	}

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
										{renderCell(exchange, key)}
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
