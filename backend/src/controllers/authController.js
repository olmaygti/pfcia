import { Controller, HttpMethod, Inject } from '@/ioc';

@Controller('/api/auth')
export default class AuthController {
	/**
	 * POST /api/auth/google
	 * body: { credential: "<google-id-token>" }
	 * Returns: { token, user: { id, email, role } }
	 */
	@HttpMethod('POST', '/google')
	@Inject('authService')
	async google(req, res) {
		const { credential } = req.body;

		if (!credential) {
			res.status(400).json({ error: 'credential is required' });
			return;
		}

		let payload;
		try {
			payload = await this.authService.verifyGoogleToken(credential);
		} catch {
			res.status(401).json({ error: 'Invalid Google token' });
			return;
		}

		const [user] = await this.authService.findOrCreateUser(payload);
		const token = this.authService.issueJwt(user);

		return {
			token,
			user: { id: user.id, email: user.email, role: user.role },
		};
	}
}
