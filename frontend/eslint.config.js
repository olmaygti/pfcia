import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
	{
		files: ['**/*.{js,jsx}'],
		plugins: {
			react: reactPlugin,
			'react-hooks': reactHooksPlugin,
		},
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.browser,
			},
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
		rules: {
			...reactPlugin.configs.recommended.rules,
			...reactHooksPlugin.configs.recommended.rules,
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'no-unused-vars': 'warn',
			'no-console': 'warn',
		},
	},
];
