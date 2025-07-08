import { test, expect } from '@playwright/test';
import { setupNetworkMocking, waitForAppReady } from './test-helpers';

test.describe('Basic App Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupNetworkMocking(page);
  });

  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Check that the main title is visible
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible({
      timeout: 30000,
    });

    // Check that the main navigation elements are present
    await expect(page.locator('button:has-text("Add Printer")')).toBeVisible();
    await expect(page.locator('button:has-text("Settings")')).toBeVisible();
  });

  test('should be able to open and close settings', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Ensure main page is loaded
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible({
      timeout: 30000,
    });

    // Click Settings button
    await page.click('button:has-text("Settings")');

    // Verify settings page loads
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({
      timeout: 10000,
    });

    // Go back to dashboard using the back button
    await page.click('button:has-text("Back to Dashboard")');

    // Verify we're back on the main page
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible();
  });

  test('should be able to open add printer dialog', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Ensure main page is loaded
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible({
      timeout: 30000,
    });

    // Click Add Printer button
    await page.click('button:has-text("Add Printer")');

    // Verify the dialog opens
    await expect(page.locator('text=Add Bambu Lab Printer')).toBeVisible({
      timeout: 10000,
    });

    // Verify form fields are present
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('select[name="model"]')).toBeVisible();
    await expect(page.locator('input[name="ip"]')).toBeVisible();
    await expect(page.locator('input[name="accessCode"]')).toBeVisible();
    await expect(page.locator('input[name="serial"]')).toBeVisible();

    // Close the dialog
    await page.click('button:has-text("Cancel")');

    // Verify we're back on the main page
    await expect(page.locator('text=PulsePrint Desktop')).toBeVisible();
  });
});
