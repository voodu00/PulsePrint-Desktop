import '@testing-library/jest-dom';

// Extended timeout for integration tests
jest.setTimeout(30000);

// Extend Window interface to include Tauri APIs
declare global {
  interface Window {
    __TAURI__?: {
      tauri: {
        invoke: jest.MockedFunction<any>;
      };
      event: {
        listen: jest.MockedFunction<any>;
        emit: jest.MockedFunction<any>;
      };
    };
  }
}

// Mock Tauri APIs globally for integration tests
global.window = Object.create(window);
(global.window as any).__TAURI__ = {
  tauri: {
    invoke: jest.fn(),
  },
  event: {
    listen: jest.fn(),
    emit: jest.fn(),
  },
};

// Mock IntersectionObserver with proper typing
(global as any).IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: ReadonlyArray<number> = [];

  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

// Mock ResizeObserver
(global as any).ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Tauri APIs
const mockInvoke = jest.fn();
const mockListen = jest.fn();
const mockEmit = jest.fn();

// Mock @tauri-apps/api/core
jest.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

// Mock @tauri-apps/api/event - ensure it works with dynamic imports
const eventMock = {
  listen: mockListen,
  emit: mockEmit,
};

jest.mock('@tauri-apps/api/event', () => eventMock);

// Ensure dynamic imports also get the mock
jest.doMock('@tauri-apps/api/event', () => eventMock);

// Mock @tauri-apps/plugin-sql for database operations
jest.mock('@tauri-apps/plugin-sql', () => ({
  Database: {
    load: jest.fn().mockResolvedValue({
      select: jest.fn(),
      execute: jest.fn(),
      close: jest.fn(),
    }),
  },
}));

// Mock @tauri-apps/api/dialog (only mock if it exists)
jest.mock(
  '@tauri-apps/api/dialog',
  () => ({
    open: jest.fn(),
    save: jest.fn(),
    message: jest.fn(),
    ask: jest.fn(),
    confirm: jest.fn(),
  }),
  { virtual: true }
);

// Mock @tauri-apps/api/fs (only mock if it exists)
jest.mock(
  '@tauri-apps/api/fs',
  () => ({
    readTextFile: jest.fn(),
    writeTextFile: jest.fn(),
    exists: jest.fn(),
    readDir: jest.fn(),
  }),
  { virtual: true }
);

// Mock @tauri-apps/api/path (only mock if it exists)
jest.mock(
  '@tauri-apps/api/path',
  () => ({
    downloadDir: jest.fn().mockResolvedValue('/mock/downloads'),
    homeDir: jest.fn().mockResolvedValue('/mock/home'),
    appDataDir: jest.fn().mockResolvedValue('/mock/appdata'),
  }),
  { virtual: true }
);

// Mock console methods to reduce noise during tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Reset Tauri mocks
  mockInvoke.mockClear();
  mockListen.mockClear();
  mockEmit.mockClear();

  // Default mock implementations
  mockInvoke.mockResolvedValue([]);
  mockListen.mockResolvedValue(() => {});
  mockEmit.mockResolvedValue(undefined);

  // Default database mock behavior - return default settings
  mockInvoke.mockImplementation((command: string, args?: any) => {
    if (command === 'get_user_preference' && args?.key === 'app_settings') {
      return Promise.resolve(
        JSON.stringify({
          idleNotifications: false,
          errorNotifications: true,
          darkMode: false,
          showTemperatures: true,
          showProgress: true,
          viewMode: 'card',
        })
      );
    }
    if (command === 'set_user_preference') {
      return Promise.resolve();
    }
    return Promise.resolve([]);
  });
});

// Cleanup after each test
afterEach(() => {
  // Clean up any DOM changes
  document.body.innerHTML = '';
});

// Export mocks for use in tests
export { mockInvoke, mockListen, mockEmit };
