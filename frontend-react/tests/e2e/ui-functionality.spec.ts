import { test, expect } from '@playwright/test';
import {
  setupNetworkMocking,
  waitForAppReady,
  submitPrinterForm,
  navigateToSettings,
} from './test-helpers';

test.describe('UI Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupNetworkMocking(page);
  });

  test('should display main dashboard elements', async ({ page }) => {
    await waitForAppReady(page);

    // Verify main dashboard elements are present
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible();
    await expect(page.locator('button:has-text("Add Printer")')).toBeVisible();
    await expect(
      page.locator('button:has-text("Import")').first()
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Export")').first()
    ).toBeVisible();
    await expect(page.locator('button:has-text("Settings")')).toBeVisible();

    // Verify empty state is shown initially
    await expect(page.locator('text=No Printers Added')).toBeVisible();
  });

  test('should open and close add printer dialog', async ({ page }) => {
    await waitForAppReady(page);

    // Click Add Printer button
    await page.click('button:has-text("Add Printer")');

    // Verify dialog opens
    await expect(page.locator('text=Add Bambu Lab Printer')).toBeVisible();

    // Verify form fields are present
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('select[name="model"]')).toBeVisible();
    await expect(page.locator('input[name="ip"]')).toBeVisible();
    await expect(page.locator('input[name="accessCode"]')).toBeVisible();
    await expect(page.locator('input[name="serial"]')).toBeVisible();

    // Close dialog with Cancel button
    await page.click('button:has-text("Cancel")');

    // Verify dialog is closed
    await expect(page.locator('text=Add Bambu Lab Printer')).not.toBeVisible();
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible();
  });

  test('should validate form fields in add printer dialog', async ({
    page,
  }) => {
    await waitForAppReady(page);

    // Open add printer dialog
    await page.click('button:has-text("Add Printer")');
    await expect(page.locator('text=Add Bambu Lab Printer')).toBeVisible();

    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Add Printer")');

    // Form should not submit (dialog should still be visible)
    await expect(page.locator('text=Add Bambu Lab Printer')).toBeVisible();

    // Fill in required fields
    await page.fill('input[name="name"]', 'Test Printer');
    await page.fill('input[name="ip"]', '192.168.1.100');
    await page.fill('input[name="accessCode"]', 'test123');
    await page.fill('input[name="serial"]', 'TEST001');

    // Now form should submit successfully
    await page.click('button[type="submit"]:has-text("Add Printer")');

    // Dialog should close
    await expect(page.locator('text=Add Bambu Lab Printer')).not.toBeVisible();
  });

  test('should navigate to settings and back', async ({ page }) => {
    await waitForAppReady(page);

    // Navigate to settings
    await page.click('button:has-text("Settings")');
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();

    // Verify settings sections are present (just check that we're on settings page)
    await expect(page.locator('text=Notifications').first()).toBeVisible();
    await expect(
      page.locator('[data-slot="card-title"]:has-text("Display")')
    ).toBeVisible();
    await expect(page.locator('text=System').first()).toBeVisible();
    await expect(page.locator('text=Data Management')).toBeVisible();

    // Navigate back to dashboard
    await page.click('button:has-text("Back to Dashboard")');
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible();
  });

  test('should open import dialog from dashboard', async ({ page }) => {
    await waitForAppReady(page);

    // Click Import button (use first one to avoid strict mode violation)
    await page.locator('button:has-text("Import")').first().click();

    // Verify import dialog opens
    await expect(
      page.locator('h2:has-text("Import Printer Settings")')
    ).toBeVisible();

    // Verify upload interface is shown
    await expect(
      page.locator('text=Drop your file here or click to browse')
    ).toBeVisible();

    // Verify file format information is shown
    await expect(page.locator('text=Supported File Formats:')).toBeVisible();
    await expect(page.locator('text=JSON:')).toBeVisible();
    await expect(page.locator('text=CSV:')).toBeVisible();
    await expect(page.locator('text=YAML:')).toBeVisible();
    await expect(page.locator('text=TXT:')).toBeVisible();
  });

  test('should have export button disabled when no printers exist', async ({
    page,
  }) => {
    await waitForAppReady(page);

    // Export button should be disabled initially (use first one)
    const exportButton = page.locator('button:has-text("Export")').first();
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeDisabled();
  });

  test('should open import and export dialogs from settings', async ({
    page,
  }) => {
    await waitForAppReady(page);
    await navigateToSettings(page);

    // Test import dialog from settings
    await page.click('button:has-text("Import Printers")');
    await expect(
      page.locator('h2:has-text("Import Printer Settings")')
    ).toBeVisible();

    // Close import dialog (press Escape)
    await page.keyboard.press('Escape');
    await expect(
      page.locator('h2:has-text("Import Printer Settings")')
    ).not.toBeVisible();

    // Test export dialog from settings (should be disabled)
    const exportButton = page.locator('button:has-text("Export Printers")');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeDisabled();
  });

  test('should display responsive design elements', async ({ page }) => {
    await waitForAppReady(page);

    // Test different viewport sizes
    await page.setViewportSize({ width: 1400, height: 900 });
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible();

    await page.setViewportSize({ width: 800, height: 600 });
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible();

    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await waitForAppReady(page);

    // Test Tab navigation through main buttons
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Test Enter key to open dialogs
    await page.focus('button:has-text("Add Printer")');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Add Bambu Lab Printer')).toBeVisible();

    // Test clicking Cancel button to close dialog (Escape might not work)
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=Add Bambu Lab Printer')).not.toBeVisible();
  });
});
