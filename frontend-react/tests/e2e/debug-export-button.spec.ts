import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  addTestPrinter,
  navigateToSettings,
} from './test-helpers';

test.describe('Debug Export Button', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
  });

  test('should debug export button behavior between dashboard and settings', async ({
    page,
  }) => {
    console.log('🔍 Starting export button debug test...');

    // Check export button state on dashboard initially
    let exportButtonDashboard = page.locator('button:has-text("Export")');
    let exportDisabledDashboard = await exportButtonDashboard.isDisabled();
    console.log(
      'Export button disabled on dashboard (initially):',
      exportDisabledDashboard
    );

    // Check printer count on dashboard initially
    let printerCards = await page.locator('.printer-card').count();
    console.log('Printer cards on dashboard (initially):', printerCards);

    // Add a printer
    console.log('🔍 Adding test printer...');
    const printerAdded = await addTestPrinter(
      page,
      'Export Button Test',
      'X1C',
      '192.168.1.100'
    );
    console.log('Printer added result:', printerAdded);

    // Check mock state after adding printer
    const mockPrinters = await page.evaluate(() => {
      return window.__TAURI_MOCK__?.testPrinters?.size || 0;
    });
    console.log('Mock printers count:', mockPrinters);

    // Check printer count on dashboard after adding
    printerCards = await page.locator('.printer-card').count();
    console.log('Printer cards on dashboard (after adding):', printerCards);

    // Check export button state on dashboard after adding
    exportButtonDashboard = page.locator('button:has-text("Export")');
    exportDisabledDashboard = await exportButtonDashboard.isDisabled();
    console.log(
      'Export button disabled on dashboard (after adding):',
      exportDisabledDashboard
    );

    // Take screenshot of dashboard
    // Screenshot removed - debug tests should not generate files

    // Now navigate to settings
    console.log('🔍 Navigating to settings...');
    await navigateToSettings(page);

    // Check export button state in settings
    const exportButtonSettings = page.locator(
      'button:has-text("Export Printers")'
    );
    const exportDisabledSettings = await exportButtonSettings.isDisabled();
    console.log('Export button disabled in settings:', exportDisabledSettings);

    // Check if the settings page can see the printers
    const settingsPrinterService = await page.evaluate(() => {
      // Try to access the printer service from the React component
      return (
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers || 'not available'
      );
    });
    console.log('React dev tools available:', typeof settingsPrinterService);

    // Check the HTML of both buttons for comparison
    const dashboardButtonHTML = await exportButtonDashboard
      .innerHTML()
      .catch(() => 'not found');
    const settingsButtonHTML = await exportButtonSettings
      .innerHTML()
      .catch(() => 'not found');
    console.log('Dashboard button HTML:', dashboardButtonHTML);
    console.log('Settings button HTML:', settingsButtonHTML);

    // Take screenshot of settings
    // Screenshot removed - debug tests should not generate files

    // Go back to dashboard to see if export button works there
    console.log('🔍 Going back to dashboard...');
    await page.click('button:has-text("Back to Dashboard")');

    // Check export button on dashboard again
    exportButtonDashboard = page.locator('button:has-text("Export")');
    exportDisabledDashboard = await exportButtonDashboard.isDisabled();
    console.log(
      'Export button disabled on dashboard (after returning):',
      exportDisabledDashboard
    );

    // Check if we can click the export button on dashboard
    if (!exportDisabledDashboard) {
      console.log('🔍 Testing export button click on dashboard...');
      await exportButtonDashboard.click();

      // Check if export dialog opens
      const exportDialogVisible = await page
        .locator('h2:has-text("Export Printer Settings")')
        .isVisible();
      console.log('Export dialog opened:', exportDialogVisible);

      if (exportDialogVisible) {
        await page.keyboard.press('Escape'); // Close dialog
      }
    }

    // Final screenshot
    // Screenshot removed - debug tests should not generate files
  });
});
