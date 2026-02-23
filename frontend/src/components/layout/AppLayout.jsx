import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function AppLayout() {
	return (
		<div className="min-h-screen bg-gray-950 text-white">
			<Header />
			<Sidebar />
			<main className="ml-56 mt-16 p-6">
				<Outlet />
			</main>
		</div>
	);
}
