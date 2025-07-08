import { Page, expect } from '@playwright/test';

// Test printer configurations
export const TEST_PRINTERS = {
  X1C: {
    name: 'Test X1C Printer',
    model: 'X1C',
    ip: '192.168.1.100',
    access_code: 'test123456',
    serial: 'TEST001X1C',
  },
  A1: {
    name: 'Test A1 Printer',
    model: 'A1',
    ip: '192.168.1.101',
    access_code: 'test123457',
    serial: 'TEST002A1',
  },
  P1P: {
    name: 'Test P1P Printer',
    model: 'P1P',
    ip: '192.168.1.102',
    access_code: 'test123458',
    serial: 'TEST003P1P',
  },
  X1E: {
    name: 'Test X1E Printer',
    model: 'X1E',
    ip: '192.168.1.103',
    access_code: 'test123459',
    serial: 'TEST004X1E',
  },
  A1_MINI: {
    name: 'Test A1 Mini Printer',
    model: 'A1 Mini',
    ip: '192.168.1.104',
    access_code: 'test123460',
    serial: 'TEST005A1MINI',
  },
};

/**
 * Initialize Tauri API mock for a test page
 */
export async function initializeTauriMock(page: Page): Promise<void> {
  console.log('🔧 Initializing Tauri API mock for test page...');

  try {
    // Wait for the page to load and the mock to be available
    await page.waitForFunction(
      () => {
        return typeof window.__TAURI_MOCK__ !== 'undefined';
      },
      { timeout: 20000 }
    );

    console.log('✅ Tauri API mock initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Tauri mock:', error);

    // Check if the mock script is loaded but not initialized
    const mockScriptLoaded = await page.evaluate(() => {
      const scripts = Array.from(document.scripts);
      return scripts.some(script => script.src.includes('tauri-mock.js'));
    });

    console.log('Mock script loaded:', mockScriptLoaded);

    if (mockScriptLoaded) {
      // Try to manually initialize the mock
      await page.evaluate(() => {
        // Mock script is loaded but may not have created the global yet
        if (typeof window.__TAURI_MOCK__ === 'undefined') {
          console.warn(
            'Mock script loaded but global not created - this may indicate a script error'
          );
        }
      });
    }

    throw error;
  }
}

/**
 * Add a test printer using the mock API
 */
export async function addTestPrinter(
  page: Page,
  printerName: string,
  printerModel: keyof typeof TEST_PRINTERS = 'X1C'
): Promise<boolean> {
  console.log(`🖨️ Adding test printer: ${printerName} (${printerModel})`);

  try {
    // Get printer config
    const config = {
      ...TEST_PRINTERS[printerModel],
      name: printerName,
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      serial: `TEST${Math.random().toString().substr(2, 6)}`,
    };

    // Add printer via mock API
    const result = await page.evaluate(async printerConfig => {
      if (typeof window.__TAURI_MOCK__ === 'undefined') {
        console.error('Tauri mock not available');
        return false;
      }

      try {
        const response = await window.__TAURI_MOCK__.invoke('add_printer', {
          config: printerConfig,
        });
        console.log('Add printer response:', response);
        return response.success === true;
      } catch (error) {
        console.error('Error adding printer:', error);
        return false;
      }
    }, config);

    if (result) {
      console.log(`✅ Successfully added test printer: ${printerName}`);

      // Wait for the mock system to trigger events and React to re-render
      await page.waitForTimeout(2000);

      // Try to wait for the printer card to appear in the UI
      try {
        await page.waitForSelector(
          `[data-testid="printer-card-${config.id}"]`,
          {
            timeout: 5000,
            state: 'visible',
          }
        );
        console.log(`✅ Printer card for ${printerName} is now visible`);
      } catch (error) {
        console.warn(`⚠️ Printer card not visible yet for ${printerName}`);
        // Continue anyway - the printer might still be added to the service
      }

      // Debug: Check what React sees
      await debugCheckReactPrinters(page);

      return true;
    } else {
      console.warn(`⚠️ Failed to add test printer: ${printerName}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error adding test printer ${printerName}:`, error);
    return false;
  }
}

/**
 * Remove a test printer using the mock API
 */
export async function removeTestPrinter(
  page: Page,
  printerId: string
): Promise<boolean> {
  console.log(`🗑️ Removing test printer: ${printerId}`);

  try {
    const result = await page.evaluate(async id => {
      if (typeof window.__TAURI_MOCK__ === 'undefined') {
        console.error('Tauri mock not available');
        return false;
      }

      try {
        const response = await window.__TAURI_MOCK__.invoke('remove_printer', {
          printer_id: id,
        });
        return response.success === true;
      } catch (error) {
        console.error('Error removing printer:', error);
        return false;
      }
    }, printerId);

    if (result) {
      console.log(`✅ Successfully removed test printer: ${printerId}`);
      return true;
    } else {
      console.warn(`⚠️ Failed to remove test printer: ${printerId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error removing test printer ${printerId}:`, error);
    return false;
  }
}

/**
 * Get all test printers from the mock API
 */
export async function getAllTestPrinters(page: Page): Promise<any[]> {
  try {
    const printers = await page.evaluate(async () => {
      if (typeof window.__TAURI_MOCK__ === 'undefined') {
        console.error('Tauri mock not available');
        return [];
      }

      try {
        return await window.__TAURI_MOCK__.invoke('get_all_printers');
      } catch (error) {
        console.error('Error getting printers:', error);
        return [];
      }
    });

    console.log(`📋 Retrieved ${printers.length} test printers`);
    return printers;
  } catch (error) {
    console.error('❌ Error getting test printers:', error);
    return [];
  }
}

/**
 * Reset the mock state (clear all printers)
 */
export async function resetMockState(page: Page): Promise<void> {
  console.log('🔄 Resetting mock state...');

  try {
    await page.evaluate(() => {
      if (typeof window.__TAURI_MOCK__ !== 'undefined') {
        window.__TAURI_MOCK__.reset();
      }
    });

    console.log('✅ Mock state reset successfully');
  } catch (error) {
    console.error('❌ Error resetting mock state:', error);
  }
}

/**
 * Wait for printer cards to be visible
 */
export async function waitForPrinterCards(
  page: Page,
  expectedCount: number = 1
): Promise<void> {
  console.log(
    `⏳ Waiting for ${expectedCount} printer card(s) to be visible...`
  );

  try {
    // Wait for at least one printer card
    await page.waitForSelector('[data-testid*="printer-card"]', {
      timeout: 15000,
      state: 'visible',
    });

    // Wait for the expected count
    await page.waitForFunction(
      count => {
        const cards = document.querySelectorAll(
          '[data-testid*="printer-card"]'
        );
        return cards.length >= count;
      },
      expectedCount,
      { timeout: 10000 }
    );

    console.log(`✅ ${expectedCount} printer card(s) are now visible`);
  } catch (error) {
    console.warn(`⚠️ Timeout waiting for printer cards: ${error}`);
    // Don't throw - let the test continue and handle the missing cards
  }
}

/**
 * Add multiple test printers for comprehensive testing
 */
export async function addMultipleTestPrinters(
  page: Page,
  count: number = 3
): Promise<boolean> {
  console.log(`🖨️ Adding ${count} test printers...`);

  const printerModels = Object.keys(TEST_PRINTERS) as Array<
    keyof typeof TEST_PRINTERS
  >;
  let successCount = 0;

  for (let i = 0; i < count; i++) {
    const model = printerModels[i % printerModels.length];
    const name = `Test Printer ${i + 1}`;

    const success = await addTestPrinter(page, name, model);
    if (success) {
      successCount++;
    }

    // Small delay between additions
    await page.waitForTimeout(1000);
  }

  console.log(`✅ Successfully added ${successCount}/${count} test printers`);
  return successCount === count;
}

/**
 * Navigate to a specific page and wait for it to load
 */
export async function navigateAndWait(page: Page, path: string): Promise<void> {
  console.log(`🧭 Navigating to: ${path}`);

  await page.goto(path);
  await page.waitForLoadState('networkidle');

  // Wait for React to render
  await page.waitForTimeout(1000);

  console.log(`✅ Navigation complete: ${path}`);
}

/**
 * Check if the backend service is working
 */
export async function checkBackendService(page: Page): Promise<boolean> {
  try {
    const isWorking = await page.evaluate(async () => {
      if (typeof window.__TAURI_MOCK__ === 'undefined') {
        return false;
      }

      try {
        const response = await window.__TAURI_MOCK__.invoke('get_all_printers');
        return Array.isArray(response);
      } catch (error) {
        return false;
      }
    });

    console.log(
      `🔍 Backend service check: ${isWorking ? 'WORKING' : 'NOT WORKING'}`
    );
    return isWorking;
  } catch (error) {
    console.error('❌ Error checking backend service:', error);
    return false;
  }
}

/**
 * Debug helper: Check if React service sees the printers
 */
export async function debugCheckReactPrinters(page: Page): Promise<void> {
  try {
    const debugInfo = await page.evaluate(async () => {
      // Check mock state
      const mockPrinters =
        typeof window.__TAURI_MOCK__ !== 'undefined'
          ? Array.from(window.__TAURI_MOCK__.testPrinters.values())
          : [];

      // Check React state by looking at DOM
      const printerCards = document.querySelectorAll(
        '[data-testid*="printer-card"]'
      );
      const printerNames = Array.from(printerCards).map(
        card => card.querySelector('h3')?.textContent || 'Unknown'
      );

      // Check if dashboard component is mounted (look for Dashboard-specific elements)
      const dashboard =
        document.querySelector('.dashboard') ||
        document.querySelector('[data-testid="dashboard"]') ||
        document.querySelector('h1') || // PulsePrint Desktop title
        document.querySelector('button:has-text("Add Printer")') ||
        document.body.innerHTML.includes('PulsePrint Desktop');

      return {
        mockPrinterCount: mockPrinters.length,
        mockPrinterNames: mockPrinters.map(p => p.name),
        reactPrinterCardCount: printerCards.length,
        reactPrinterNames: printerNames,
        dashboardMounted: !!dashboard,
        bodyContent: document.body.innerHTML.substring(0, 500), // First 500 chars
      };
    });

    console.log('🔍 Debug info:', debugInfo);
  } catch (error) {
    console.error('❌ Error debugging React printers:', error);
  }
}
