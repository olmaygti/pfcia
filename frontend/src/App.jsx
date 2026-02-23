import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import TickersPage from './pages/TickersPage';

export default function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route
						element={
							<ProtectedRoute>
								<AppLayout />
							</ProtectedRoute>
						}
					>
						<Route path="/" element={<HomePage />} />
						<Route path="/tickers" element={<TickersPage />} />
					</Route>
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}
