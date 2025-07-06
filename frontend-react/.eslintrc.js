module.exports = {
	env: {
		browser: true,
		es2021: true,
		node: true,
		jest: true,
	},
	extends: ['react-app', 'react-app/jest', 'plugin:prettier/recommended'],
	plugins: ['prettier'],
	rules: {
		'prettier/prettier': 'error',
		'no-console': 'warn',
		'no-debugger': 'error',
	},
	settings: {
		react: {
			version: 'detect',
		},
	},
}
