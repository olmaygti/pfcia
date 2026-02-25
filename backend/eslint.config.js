import globals from 'globals';
import babelParser from '@babel/eslint-parser';

export default [
	{
		files: ['**/*.js'],
		languageOptions: {
			parser: babelParser,
			parserOptions: {
				requireConfigFile: false,
				babelOptions: {
					plugins: [
						['@babel/plugin-proposal-decorators', { legacy: true }],
					],
				},
			},
			globals: {
				...globals.node,
			},
		},
		rules: {
			'no-unused-vars': 'warn',
			'no-console': 'off',
		},
	},
];
