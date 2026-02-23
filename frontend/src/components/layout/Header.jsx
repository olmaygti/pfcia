import { useRef, useState, useEffect } from 'react';
import { CircleUser, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
	const { user, logout } = useAuth();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);

	useEffect(() => {
		function handleClickOutside(event) {
			if (menuRef.current && !menuRef.current.contains(event.target)) {
				setMenuOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<header className="fixed top-0 left-0 right-0 h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-10">
			<span className="text-white font-semibold text-lg tracking-tight">
				Stock Market Analyzer
			</span>

			<div className="relative" ref={menuRef}>
				<button
					onClick={() => setMenuOpen((prev) => !prev)}
					className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
					aria-label="User menu"
				>
					<CircleUser size={22} />
				</button>

				{menuOpen && (
					<div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1">
						<div className="px-4 py-2 border-b border-gray-700">
							<p className="text-xs text-gray-400 truncate">{user?.email}</p>
						</div>
						<button
							onClick={logout}
							className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
						>
							<LogOut size={15} />
							Logout
						</button>
					</div>
				)}
			</div>
		</header>
	);
}
