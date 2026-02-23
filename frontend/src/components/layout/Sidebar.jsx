import { NavLink } from 'react-router-dom';
import { Home, TrendingUp, Landmark } from 'lucide-react';

const NAV_ITEMS = [
	{ to: '/', label: 'Home', icon: Home, end: true },
	{ to: '/tickers', label: 'Tickers', icon: TrendingUp },
	{ to: '/exchanges', label: 'Exchanges', icon: Landmark },
];

function navClass({ isActive }) {
	return [
		'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
		isActive
			? 'bg-gray-700 text-white'
			: 'text-gray-400 hover:bg-gray-800 hover:text-white',
	].join(' ');
}

export default function Sidebar() {
	return (
		<aside className="fixed top-16 left-0 bottom-0 w-56 bg-gray-900 border-r border-gray-800 flex flex-col px-3 py-4 gap-1">
			{NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
				<NavLink key={to} to={to} end={end} className={navClass}>
					<Icon size={17} />
					{label}
				</NavLink>
			))}
		</aside>
	);
}
