import { test, expect } from '@playwright/test';
import {
  setupNetworkMocking,
  setupMqttMocking,
  waitForAppReady,
  setupTauriMocking,
  addTestPrinter,
  navigateToSettings,
} from './test-helpers';
import {
  resetMockState,
  checkBackendService,
  initializeTauriMock,
} from './test-utils';

test.describe('Debug UI Update', () => {
  test.beforeEach(async ({ page }) => {
    await setupNetworkMocking(page);
    await setupMqttMocking(page);
    await setupTauriMocking(page);
    await waitForAppReady(page);
    await initializeTauriMock(page);
    await resetMockState(page);
  });

  test('should replicate the failing test scenario', async ({ page }) => {
    console.log('🔍 Starting UI update debug test...');

    // Check if mock is available
    const mockAvailable = await page.evaluate(() => {
      return typeof window.__TAURI_MOCK__ !== 'undefined';
    });
    console.log('Mock available:', mockAvailable);

    // Add printer first (same as failing test)
    console.log('🔍 Adding test printer...');
    const printerAdded = await addTestPrinter(
      page,
      'Export Test',
      'X1C',
      '192.168.1.200'
    );
    console.log('Printer added result:', printerAdded);

    // Check printers after adding
    const printersAfter = await page.evaluate(() => {
      return window.__TAURI_MOCK__?.testPrinters?.size || 0;
    });
    console.log('Printers after:', printersAfter);

    // Check printer card exists on dashboard
    const printerCardExists = await page
      .locator('.printer-card:has-text("Export Test")')
      .count();
    console.log('Printer card exists on dashboard:', printerCardExists);

    // Navigate to settings (same as failing test)
    console.log('🔍 Navigating to settings...');
    await navigateToSettings(page);

    // Check export button state in settings
    const exportButton = page.locator('button:has-text("Export Printers")');
    const exportButtonDisabled = await exportButton.isDisabled();
    console.log('Export button disabled in settings:', exportButtonDisabled);

    // Check if the settings page shows printer count
    const printerCountText = await page
      .locator('text=Printers ready to export')
      .count();
    console.log('Printer count text visible:', printerCountText);

    // Log the full HTML of the export button for debugging
    const exportButtonHTML = await exportButton.innerHTML();
    console.log('Export button HTML:', exportButtonHTML);

    // Screenshot removed - debug tests should not generate files

    if (printerAdded) {
      // This is what the failing test expects
      await expect(exportButton).toBeEnabled();
    } else {
      // This is the fallback
      await expect(exportButton).toBeDisabled();
    }
  });
});
