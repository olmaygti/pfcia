import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { StockChart } from '@/components/chart';

export default function TickersPage() {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [searching, setSearching] = useState(false);
	const [selectedTicker, setSelectedTicker] = useState(null);
	const [eodData, setEodData] = useState(null);
	const [loadingChart, setLoadingChart] = useState(false);

	// Debounced search
	useEffect(() => {
		if (query.length < 2) {
			setResults([]);
			setShowDropdown(false);
			return;
		}

		const timer = setTimeout(async () => {
			setSearching(true);
			const data = await api.searchTickers(query);
			setResults(data ?? []);
			setShowDropdown(true);
			setSearching(false);
		}, 300);

		return () => clearTimeout(timer);
	}, [query]);

	// Fetch EOD when ticker is selected
	useEffect(() => {
		if (!selectedTicker) return;
		setLoadingChart(true);
		api.getTickerEod(selectedTicker.id).then((data) => {
			setEodData(data ?? []);
			setLoadingChart(false);
		});
	}, [selectedTicker]);

	function selectTicker(ticker) {
		setSelectedTicker(ticker);
		setQuery(ticker.symbol);
		setShowDropdown(false);
		setResults([]);
	}

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">Tickers</h1>

			{/* Search */}
			<div className="relative mb-8">
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
					onFocus={() => results.length > 0 && setShowDropdown(true)}
					placeholder="Search by symbol or name..."
					className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
				/>
				{searching && (
					<span className="absolute right-3 top-2.5 text-xs text-gray-500">Searching...</span>
				)}
				{showDropdown && results.length > 0 && (
					<ul className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded shadow-lg mt-1 max-h-64 overflow-y-auto">
						{results.map((t) => (
							<li
								key={t.id}
								onMouseDown={() => selectTicker(t)}
								className="px-4 py-2 cursor-pointer hover:bg-gray-700 text-sm flex justify-between"
							>
								<span>
									<span className="font-semibold text-white">{t.symbol}</span>
									{t.name && <span className="text-gray-400 ml-2">{t.name}</span>}
								</span>
								{t.exchange && (
									<span className="text-xs text-gray-500">{t.exchange.code}</span>
								)}
							</li>
						))}
					</ul>
				)}
			</div>

			{/* Chart area */}
			{selectedTicker && (
				<>
					<div className="mb-4">
						<span className="text-xl font-bold">{selectedTicker.symbol}</span>
						{selectedTicker.name && (
							<span className="text-gray-600 ml-2">— {selectedTicker.name}</span>
						)}
						{selectedTicker.exchange && (
							<span className="text-sm text-gray-400 ml-2">
								({selectedTicker.exchange.code}
								{selectedTicker.currency && ` · ${selectedTicker.currency}`})
							</span>
						)}
					</div>

					{loadingChart ? (
						<div className="h-[500px] flex items-center justify-center text-gray-400">
							Loading chart...
						</div>
					) : eodData?.length === 0 ? (
						<div className="h-[500px] flex items-center justify-center text-gray-400">
							No EOD data available for this ticker.
						</div>
					) : (
						<StockChart
							data={eodData}
							seriesName={selectedTicker.symbol}
							className="h-[500px] w-full"
						/>
					)}
				</>
			)}
		</div>
	);
}
