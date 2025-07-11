// Simple Tauri API Mock for E2E Testing
// This script provides a mock implementation of Tauri APIs for browser testing

(function () {
  'use strict';

  // Only initialize if we're in a test environment
  if (
    typeof window === 'undefined' ||
    (!window.location.search.includes('e2e-test') &&
      !window.navigator.webdriver)
  ) {
    console.log('🚫 Tauri mock not loaded - not in test environment');
    return;
  }

  console.log('🔧 Initializing Tauri API mock for e2e tests...');

  // Set up Tauri internals IMMEDIATELY before anything else
  window.__TAURI_INTERNALS__ = {
    transformCallback: (callback, once = false) => {
      return callback;
    },
    invoke: null, // Will be set later
  };

  // In-memory storage for test printers and settings
  let testPrinters = new Map();
  let eventListeners = new Map();
  let testSettings = {
    darkMode: false,
    showTemperatures: true,
    idleNotifications: false,
    errorNotifications: true,
    soundNotifications: false,
    showProgress: true,
    compactView: false,
    viewMode: 'card',
  };

  // Mock printer data generator
  function generateMockPrinterData(config) {
    const statuses = ['idle', 'printing', 'paused', 'offline'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      id: config.id || config.serial,
      name: config.name,
      model: config.model,
      ip: config.ip,
      access_code: config.access_code,
      serial: config.serial,
      status: randomStatus,
      temperatures: {
        nozzle: Math.round(25 + Math.random() * 200),
        bed: Math.round(20 + Math.random() * 80),
        chamber: Math.round(18 + Math.random() * 50),
      },
      print:
        randomStatus === 'printing'
          ? {
              progress: Math.round(Math.random() * 100),
              file_name: 'test_model.3mf',
              layer_current: Math.round(Math.random() * 200),
              layer_total: 250,
              time_remaining: Math.round(Math.random() * 7200),
              estimated_total_time: 7200,
            }
          : null,
      filament: {
        type: 'PLA',
        color: 'Black',
        remaining: Math.round(Math.random() * 100),
      },
      error:
        randomStatus === 'error'
          ? {
              print_error: 1,
              error_code: 12345,
              stage: 1,
              lifecycle: 'error',
              gcode_state: 'error',
              message: 'Test error message',
            }
          : null,
      last_update: new Date().toISOString(),
    };
  }

  // Mock Tauri invoke function
  const mockTauriInvoke = async (command, args) => {
    console.log(`🔧 Mock Tauri invoke: ${command}`, args);

    // Update the internals reference
    window.__TAURI_INTERNALS__.invoke = mockTauriInvoke;

    // Add small delay to simulate real backend
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    switch (command) {
      // SQL Plugin Commands - Essential for settings
      case 'plugin:sql|load':
        console.log('📊 Mock SQL load');
        return { success: true };

      case 'plugin:sql|select':
        console.log('📊 Mock SQL select:', args?.query);
        // Mock settings queries
        if (
          args?.query?.includes('user_preferences') &&
          args?.values?.[0] === 'app_settings'
        ) {
          return [{ value: JSON.stringify(testSettings) }];
        }
        return [];

      case 'plugin:sql|execute':
        console.log('📊 Mock SQL execute:', args?.query);
        // Handle settings save
        if (
          args?.query?.includes('INSERT OR REPLACE INTO user_preferences') &&
          args?.values?.[0] === 'app_settings'
        ) {
          const settingsJson = args.values[1];
          try {
            testSettings = JSON.parse(settingsJson);
            console.log('💾 Saved settings:', testSettings);
          } catch (error) {
            console.warn('Failed to parse settings JSON:', error);
          }
        }
        return { success: true };

      case 'add_printer':
        if (args?.config) {
          const config = args.config;

          // Check for duplicates
          const existingPrinter = Array.from(testPrinters.values()).find(
            p => p.serial === config.serial
          );

          if (existingPrinter) {
            console.log(
              `⚠️ Printer with serial ${config.serial} already exists`
            );
            return { success: true }; // Don't add duplicate
          }

          const printerData = generateMockPrinterData(config);
          testPrinters.set(printerData.id, printerData);
          console.log(
            `✅ Added mock printer: ${printerData.name} (${printerData.id})`
          );

          // Trigger multiple events to ensure React service sees the printer
          setTimeout(() => {
            // First trigger printer-added event (new event listener we added)
            const addedListeners = eventListeners.get('printer-added') || [];
            console.log(
              `🔔 Triggering printer-added event for ${printerData.name}, ${addedListeners.length} listeners`
            );
            addedListeners.forEach(callback => {
              try {
                callback({ payload: printerData });
                console.log(`✅ Successfully called printer-added listener`);
              } catch (error) {
                console.warn('Error in printer-added listener:', error);
              }
            });

            // Also trigger printer-update event (for compatibility)
            const updateListeners = eventListeners.get('printer-update') || [];
            console.log(
              `🔔 Triggering printer-update event for ${printerData.name}, ${updateListeners.length} listeners`
            );
            updateListeners.forEach(callback => {
              try {
                callback({ payload: printerData });
                console.log(`✅ Successfully called printer-update listener`);
              } catch (error) {
                console.warn('Error in printer-update listener:', error);
              }
            });
          }, 100);

          return { success: true };
        }
        throw new Error('Invalid printer config');

      case 'remove_printer':
        if (args?.printer_id) {
          const printer = testPrinters.get(args.printer_id);
          const removed = testPrinters.delete(args.printer_id);
          console.log(
            `🗑️ Removed mock printer: ${args.printer_id}, success: ${removed}`
          );
          return { success: removed };
        }
        throw new Error('Invalid printer ID');

      case 'get_all_printers':
        const printers = Array.from(testPrinters.values());
        console.log(`📋 Retrieved ${printers.length} mock printers`);
        return printers;

      case 'pause_printer':
      case 'resume_printer':
      case 'stop_printer':
      case 'send_printer_command':
        if (args?.printer_id && testPrinters.has(args.printer_id)) {
          console.log(
            `🎮 Mock printer command: ${command} for ${args.printer_id}`
          );
          return { success: true };
        }
        throw new Error('Printer not found');

      default:
        console.warn(`❓ Unhandled Tauri command: ${command}`);
        return { success: false, error: `Unknown command: ${command}` };
    }
  };

  // Mock event listener
  const mockTauriListen = async (event, callback) => {
    console.log(`👂 Mock Tauri listen: ${event}`);

    if (!eventListeners.has(event)) {
      eventListeners.set(event, []);
    }
    eventListeners.get(event).push(callback);

    // Return cleanup function
    return () => {
      console.log(`👋 Mock Tauri unlisten: ${event}`);
      const listeners = eventListeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  };

  // Create mock Tauri object
  window.__TAURI__ = {
    core: { invoke: mockTauriInvoke },
    event: { listen: mockTauriListen },
  };

  // Update the internals reference now that we have the functions
  window.__TAURI_INTERNALS__.invoke = mockTauriInvoke;

  // Mock for ES6 module imports
  const originalFetch = window.fetch;

  // Intercept webpack module loading
  if (typeof window.webpackChunkName !== 'undefined') {
    console.log('🎯 Webpack detected, setting up module interception');
  }

  // Mock require for CommonJS-style imports
  if (typeof window.require === 'undefined') {
    window.require = function (module) {
      if (module === '@tauri-apps/api/core') {
        return { invoke: mockTauriInvoke };
      }
      if (module === '@tauri-apps/api/event') {
        return { listen: mockTauriListen };
      }
      throw new Error(`Module not found: ${module}`);
    };
  }

  // Override module resolution for dynamic imports
  if (typeof window.importShim === 'function') {
    const originalImportShim = window.importShim;
    window.importShim = function (specifier) {
      if (specifier === '@tauri-apps/api/core') {
        return Promise.resolve({ invoke: mockTauriInvoke });
      }
      if (specifier === '@tauri-apps/api/event') {
        return Promise.resolve({ listen: mockTauriListen });
      }
      return originalImportShim.apply(this, arguments);
    };
  }

  // Expose utilities for testing
  window.__TAURI_MOCK__ = {
    invoke: mockTauriInvoke,
    listen: mockTauriListen,
    testPrinters: testPrinters,
    eventListeners: eventListeners,
    reset: () => {
      testPrinters.clear();
      eventListeners.clear();
      console.log('🔄 Reset mock Tauri state');
    },
    addTestPrinter: (name, model = 'X1C', ip = '192.168.1.100') => {
      const config = {
        id: `test-${Date.now()}`,
        name: name,
        model: model,
        ip: ip,
        access_code: 'test123456',
        serial: `TEST${Math.random().toString().substr(2, 6)}`,
      };
      return mockTauriInvoke('add_printer', { config });
    },
  };

  console.log('🚀 Tauri API mock initialized successfully');
})();
