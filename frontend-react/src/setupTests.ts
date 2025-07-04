// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Tauri APIs for testing
Object.defineProperty(window, '__TAURI_INTERNALS__', {
	value: {
		transformCallback: () => {},
		invoke: () => Promise.resolve(),
	},
	writable: true,
})

// Mock console methods to reduce noise in tests
global.console = {
	...console,
	warn: jest.fn(),
	error: jest.fn(),
}
