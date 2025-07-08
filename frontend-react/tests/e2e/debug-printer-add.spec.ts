import { test, expect } from '@playwright/test';
import { waitForAppReady, addTestPrinter } from './test-helpers';

test.describe('Debug Printer Addition', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
  });

  test('should debug printer addition process', async ({ page }) => {
    console.log('🔍 Starting debug test...');

    // Add debugging to the browser console
    await page.addInitScript(() => {
      console.log('🔧 Browser init script running');

      // Override console methods to capture logs
      const originalLog = console.log;
      console.log = function (...args) {
        originalLog.apply(console, ['[DEBUG]', ...args]);
      };
    });

    // Check if mock is available
    const mockAvailable = await page.evaluate(() => {
      return typeof window.__TAURI_MOCK__ !== 'undefined';
    });
    console.log('Mock available:', mockAvailable);

    // Check current printers before adding
    const printersBefore = await page.evaluate(() => {
      return window.__TAURI_MOCK__?.testPrinters?.size || 0;
    });
    console.log('Printers before:', printersBefore);

    // Add printer
    console.log('🔍 Adding test printer...');
    const printerAdded = await addTestPrinter(
      page,
      'Debug Printer',
      'X1C',
      '192.168.1.100'
    );
    console.log('Printer added result:', printerAdded);

    // Check printers after adding
    const printersAfter = await page.evaluate(() => {
      return window.__TAURI_MOCK__?.testPrinters?.size || 0;
    });
    console.log('Printers after:', printersAfter);

    // Check if printer appears in UI
    const printerCardExists = await page
      .locator('.printer-card:has-text("Debug Printer")')
      .count();
    console.log('Printer card exists:', printerCardExists);

    // Check export button state
    const exportButtonDisabled = await page
      .locator('button:has-text("Export")')
      .isDisabled();
    console.log('Export button disabled:', exportButtonDisabled);

    // Log all printer cards that exist
    const allPrinterCards = await page.locator('.printer-card').count();
    console.log('Total printer cards:', allPrinterCards);

    // Check if the dashboard has the "No Printers Added" message
    const noPrintersMessage = await page
      .locator('text=No Printers Added')
      .count();
    console.log('No printers message visible:', noPrintersMessage);

    // Screenshot removed - debug tests should not generate files
  });
});
