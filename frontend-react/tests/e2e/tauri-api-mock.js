// Comprehensive Tauri API Mock for E2E Tests
// This script mocks the Tauri API to make the backend service work in Playwright tests

(function () {
  'use strict';

  // In-memory storage for test printers
  let testPrinters = new Map();
  let eventListeners = new Map();

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

  // Simulate real-time printer updates
  function simulateRealTimeUpdates() {
    setInterval(() => {
      testPrinters.forEach((printer, id) => {
        // Randomly update printer status
        if (Math.random() < 0.1) {
          // 10% chance of update
          const updatedPrinter = generateMockPrinterData({
            id: printer.id,
            name: printer.name,
            model: printer.model,
            ip: printer.ip,
            access_code: printer.access_code,
            serial: printer.serial,
          });
          testPrinters.set(id, updatedPrinter);

          // Trigger update events
          const updateListeners = eventListeners.get('printer-update') || [];
          updateListeners.forEach(callback => {
            try {
              callback({ payload: updatedPrinter });
            } catch (error) {
              console.warn('Error in printer update listener:', error);
            }
          });
        }
      });
    }, 2000); // Update every 2 seconds
  }

  // Mock Tauri invoke function
  const mockTauriInvoke = async (command, args) => {
    console.log(`🔧 Mock Tauri invoke: ${command}`, args);

    // Add small delay to simulate real backend
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    switch (command) {
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

          // Trigger update event (for compatibility with TauriMqttService)
          setTimeout(() => {
            const updateListeners = eventListeners.get('printer-update') || [];
            console.log(
              `🔔 Triggering printer-update event for ${printerData.name}, ${updateListeners.length} listeners`
            );
            updateListeners.forEach(callback => {
              try {
                callback({ payload: printerData });
                console.log(`✅ Successfully called printer-update listener`);
              } catch (error) {
                console.warn('Error in printer update listener:', error);
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

          if (removed && printer) {
            // Trigger remove event
            setTimeout(() => {
              const removeListeners =
                eventListeners.get('printer-removed') || [];
              removeListeners.forEach(callback => {
                try {
                  callback({ payload: args.printer_id });
                } catch (error) {
                  console.warn('Error in printer remove listener:', error);
                }
              });
            }, 100);
          }

          return { success: removed };
        }
        throw new Error('Invalid printer ID');

      case 'get_all_printers':
        const printers = Array.from(testPrinters.values());
        console.log(`📋 Retrieved ${printers.length} mock printers`);
        return printers;

      case 'pause_printer':
        if (args?.printer_id && testPrinters.has(args.printer_id)) {
          const printer = testPrinters.get(args.printer_id);
          printer.status = 'paused';
          testPrinters.set(args.printer_id, printer);
          console.log(`⏸️ Paused printer: ${args.printer_id}`);
          return { success: true };
        }
        throw new Error('Printer not found');

      case 'resume_printer':
        if (args?.printer_id && testPrinters.has(args.printer_id)) {
          const printer = testPrinters.get(args.printer_id);
          printer.status = 'printing';
          testPrinters.set(args.printer_id, printer);
          console.log(`▶️ Resumed printer: ${args.printer_id}`);
          return { success: true };
        }
        throw new Error('Printer not found');

      case 'stop_printer':
        if (args?.printer_id && testPrinters.has(args.printer_id)) {
          const printer = testPrinters.get(args.printer_id);
          printer.status = 'idle';
          printer.print = null;
          testPrinters.set(args.printer_id, printer);
          console.log(`⏹️ Stopped printer: ${args.printer_id}`);
          return { success: true };
        }
        throw new Error('Printer not found');

      case 'send_printer_command':
        if (args?.printer_id && testPrinters.has(args.printer_id)) {
          console.log(
            `📤 Sending command to printer ${args.printer_id}:`,
            args.command
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

    // Log current listener count
    console.log(
      `📝 Now have ${eventListeners.get(event).length} listeners for ${event}`
    );

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

  // Mock the module system by intercepting dynamic imports
  const originalImport =
    window.__originalImport ||
    window.eval('import') ||
    (() => Promise.reject(new Error('Import not supported')));
  window.__originalImport = originalImport;

  // Create a custom import function
  window.eval = new Proxy(window.eval, {
    apply: function (target, thisArg, argumentsList) {
      const code = argumentsList[0];

      if (typeof code === 'string') {
        // Intercept Tauri API imports
        if (code.includes('@tauri-apps/api/core')) {
          console.log('🎯 Intercepted @tauri-apps/api/core import');
          return Promise.resolve({
            invoke: mockTauriInvoke,
          });
        }

        if (code.includes('@tauri-apps/api/event')) {
          console.log('🎯 Intercepted @tauri-apps/api/event import');
          return Promise.resolve({
            listen: mockTauriListen,
          });
        }
      }

      return target.apply(thisArg, argumentsList);
    },
  });

  // Also mock via global objects for different import patterns
  window.__TAURI__ = {
    core: { invoke: mockTauriInvoke },
    event: { listen: mockTauriListen },
  };

  // Mock for ES6 dynamic imports
  if (window.importShim) {
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

  // Start real-time updates simulation
  simulateRealTimeUpdates();

  // Expose utilities for debugging
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

  console.log('🚀 Tauri API mocking initialized successfully');
})();
