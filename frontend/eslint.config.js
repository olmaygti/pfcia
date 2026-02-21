import globals from 'globals';

export default [
	{
		files: ['**/*.{js,jsx}'],
		languageOptions: {
			globals: {
				...globals.browser,
			},
		},
		rules: {
			'no-unused-vars': 'warn',
			'no-console': 'warn',
		},
	},
];
