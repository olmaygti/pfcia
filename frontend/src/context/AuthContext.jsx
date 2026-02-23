import { createContext, useContext, useEffect, useState } from 'react';

import api from '@/lib/api'

const AuthContext = createContext(null);

const TOKEN_KEY = 'auth_token';

function decodeJwtPayload(token) {
	try {
		const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
		return JSON.parse(atob(base64));
	} catch {
		return null;
	}
}

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const stored = localStorage.getItem(TOKEN_KEY);
		if (stored) {
			const payload = decodeJwtPayload(stored);
			if (payload && payload.exp * 1000 > Date.now()) {
				setToken(stored);
				setUser({ id: payload.sub, email: payload.email, role: payload.role });
			} else {
				localStorage.removeItem(TOKEN_KEY);
			}
		}
		setLoading(false);
	}, []);

	function login(newToken, userData) {
		localStorage.setItem(TOKEN_KEY, newToken);
		setToken(newToken);
		api.setJwtToken(newToken);
		setUser(userData);
	}

	function logout() {
		localStorage.removeItem(TOKEN_KEY);
		setToken(null);
		setUser(null);
	}

	return (
		<AuthContext.Provider value={{ user, token, loading, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	return useContext(AuthContext);
}
