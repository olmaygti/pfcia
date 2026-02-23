import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '@/lib/api'

export default function LoginPage() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [error, setError] = useState(null);


	async function handleSuccess(credentialResponse) {
		const res = await api.googleLogin({ credential: credentialResponse.credential });

		const { token, user } = res;
		login(token, user);
		navigate('/');
	}

	return (
		<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
			<div className="flex flex-col items-center gap-6">
				<h1 className="text-2xl font-bold">Stock Market Analyzer</h1>
				<p className="text-gray-400">Sign in to continue</p>
				{error && <p className="text-red-400 text-sm">{error}</p>}
				<GoogleLogin onSuccess={handleSuccess} onError={() => setError('Google Sign-In failed. Please try again.')} />
			</div>
		</div>
	);
}
