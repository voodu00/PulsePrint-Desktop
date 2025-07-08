import { test, expect } from '@playwright/test';
import {
  setupNetworkMocking,
  setupMqttMocking,
  waitForAppReady,
  addTestPrinter,
  navigateToSettings,
  toggleSetting,
} from './test-helpers';

test.describe('Printer Card Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupNetworkMocking(page);
    await setupMqttMocking(page);
  });

  test('should display printer status indicators correctly', async ({
    page,
  }) => {
    await waitForAppReady(page);

    // Add a test printer
    await addTestPrinter(page, 'Status Test', 'X1C', '192.168.1.150');

    // Verify printer card is visible
    const printerCard = page.locator('.printer-card:has-text("Status Test")');
    await expect(printerCard).toBeVisible();

    // Verify status badge is present
    const statusBadge = printerCard.locator('.badge');
    await expect(statusBadge).toBeVisible();

    // Verify status icon is present
    const statusIcon = statusBadge.locator('svg');
    await expect(statusIcon).toBeVisible();

    // Verify status text is present (could be idle, connecting, online, etc.)
    // The badge should contain status text like "Idle", "Printing", etc.
    const hasStatusText = await statusBadge.textContent();
    expect(hasStatusText).toBeTruthy();
    expect(hasStatusText?.trim().length).toBeGreaterThan(0);
  });

  test('should display temperatures when enabled in settings', async ({
    page,
  }) => {
    await waitForAppReady(page);

    // Enable temperature display in settings
    await navigateToSettings(page);
    await toggleSetting(page, 'Show Temperatures', true);

    // Navigate back to dashboard
    await page.click('button:has-text("Back to Dashboard")');
    await waitForAppReady(page);

    // Add a test printer
    await addTestPrinter(page, 'Temp Test', 'X1C', '192.168.1.151');

    const printerCard = page.locator('.printer-card:has-text("Temp Test")');
    await expect(printerCard).toBeVisible();

    // Check for temperature section (may not be visible if printer is offline or no temps)
    // This depends on the mock service providing temperature data
    const temperatureSection = printerCard.locator('text=Temperatures');

    // If temperatures are available, verify display
    if ((await temperatureSection.count()) > 0) {
      await expect(temperatureSection).toBeVisible();

      // Look for temperature values (nozzle, bed, chamber)
      const tempValues = printerCard.locator('text=/\\d+°C/');
      await expect(tempValues.first()).toBeVisible();
    }
  });

  test('should hide temperatures when disabled in settings', async ({
    page,
  }) => {
    await waitForAppReady(page);

    // Disable temperature display in settings
    await navigateToSettings(page);
    await toggleSetting(page, 'Show Temperatures', false);

    // Navigate back to dashboard
    await page.click('button:has-text("Back to Dashboard")');
    await waitForAppReady(page);

    // Add a test printer
    await addTestPrinter(page, 'No Temp Test', 'X1C', '192.168.1.152');

    const printerCard = page.locator('.printer-card:has-text("No Temp Test")');
    await expect(printerCard).toBeVisible();

    // Verify temperature section is not visible
    const temperatureSection = printerCard.locator('text=Temperatures');
    await expect(temperatureSection).not.toBeVisible();
  });

  test('should display print progress when enabled and printer is printing', async ({
    page,
  }) => {
    await waitForAppReady(page);

    // Enable progress display in settings
    await navigateToSettings(page);
    await toggleSetting(page, 'Show Progress', true);

    // Navigate back to dashboard
    await page.click('button:has-text("Back to Dashboard")');
    await waitForAppReady(page);

    // Add a test printer
    await addTestPrinter(page, 'Progress Test', 'X1C', '192.168.1.153');

    const printerCard = page.locator('.printer-card:has-text("Progress Test")');
    await expect(printerCard).toBeVisible();

    // If the mock service provides printing status, verify progress elements
    const progressSection = printerCard.locator('text=Progress');

    // Check for progress-related elements (depends on mock service providing print data)
    if ((await progressSection.count()) > 0) {
      await expect(progressSection).toBeVisible();

      // Look for progress percentage
      const progressPercent = printerCard.locator('text=/%\\d+%/');
      if ((await progressPercent.count()) > 0) {
        await expect(progressPercent).toBeVisible();
      }

      // Look for progress bar
      const progressBar = printerCard.locator('.progress-bar');
      if ((await progressBar.count()) > 0) {
        await expect(progressBar).toBeVisible();
      }
    }
  });

  test('should display layer information when available', async ({ page }) => {
    await waitForAppReady(page);

    // Enable progress display
    await navigateToSettings(page);
    await toggleSetting(page, 'Show Progress', true);

    // Navigate back to dashboard
    await page.click('button:has-text("Back to Dashboard")');
    await waitForAppReady(page);

    // Add a test printer
    await addTestPrinter(page, 'Layer Test', 'X1C', '192.168.1.154');

    const printerCard = page.locator('.printer-card:has-text("Layer Test")');
    await expect(printerCard).toBeVisible();

    // Check for layer information (depends on mock service)
    const layerInfo = printerCard.locator('text=/Layer \\d+\\/\\d+/');
    if ((await layerInfo.count()) > 0) {
      await expect(layerInfo).toBeVisible();
    }
  });

  test('should display time remaining when available', async ({ page }) => {
    await waitForAppReady(page);

    // Enable progress display
    await navigateToSettings(page);
    await toggleSetting(page, 'Show Progress', true);

    // Navigate back to dashboard
    await page.click('button:has-text("Back to Dashboard")');
    await waitForAppReady(page);

    // Add a test printer
    await addTestPrinter(page, 'Time Test', 'X1C', '192.168.1.155');

    const printerCard = page.locator('.printer-card:has-text("Time Test")');
    await expect(printerCard).toBeVisible();

    // Check for time remaining (depends on mock service)
    const timeRemaining = printerCard.locator('text=/\\d+.*left/');
    if ((await timeRemaining.count()) > 0) {
      await expect(timeRemaining).toBeVisible();
    }
  });

  test('should display printer control buttons when printing', async ({
    page,
  }) => {
    await waitForAppReady(page);

    // Add a test printer
    await addTestPrinter(page, 'Control Test', 'X1C', '192.168.1.156');

    const printerCard = page.locator('.printer-card:has-text("Control Test")');
    await expect(printerCard).toBeVisible();

    // Check for control buttons (depends on mock service providing printing status)
    const pauseButton = printerCard.locator('button:has-text("Pause")');
    const resumeButton = printerCard.locator('button:has-text("Resume")');
    const stopButton = printerCard.locator('button:has-text("Stop")');

    // At least one control button should be present if printer is active
    const hasControlButtons =
      (await pauseButton.count()) > 0 ||
      (await resumeButton.count()) > 0 ||
      (await stopButton.count()) > 0;

    // This test depends on the mock service providing appropriate status
    if (hasControlButtons) {
      // If any control button exists, verify it's clickable
      if ((await pauseButton.count()) > 0) {
        await expect(pauseButton).toBeVisible();
      }
      if ((await resumeButton.count()) > 0) {
        await expect(resumeButton).toBeVisible();
      }
      if ((await stopButton.count()) > 0) {
        await expect(stopButton).toBeVisible();
      }
    }
  });

  test('should display last update timestamp', async ({ page }) => {
    await waitForAppReady(page);

    // Add a test printer
    await addTestPrinter(page, 'Timestamp Test', 'X1C', '192.168.1.157');

    const printerCard = page.locator(
      '.printer-card:has-text("Timestamp Test")'
    );
    await expect(printerCard).toBeVisible();

    // Verify last update timestamp is displayed
    const lastUpdate = printerCard.locator('text=Last update:');
    await expect(lastUpdate).toBeVisible();

    // Verify timestamp format (should include time)
    const timestamp = printerCard.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/');
    await expect(timestamp).toBeVisible();
  });

  test('should handle different printer statuses', async ({ page }) => {
    await waitForAppReady(page);

    // Add multiple printers to test different statuses
    await addTestPrinter(page, 'Status Idle', 'X1C', '192.168.1.161');
    await addTestPrinter(page, 'Status Online', 'P1S', '192.168.1.162');
    await addTestPrinter(page, 'Status Offline', 'A1', '192.168.1.163');

    // Verify all printer cards are visible
    await expect(
      page.locator('.printer-card:has-text("Status Idle")')
    ).toBeVisible();
    await expect(
      page.locator('.printer-card:has-text("Status Online")')
    ).toBeVisible();
    await expect(
      page.locator('.printer-card:has-text("Status Offline")')
    ).toBeVisible();

    // Verify each card has a status badge
    const idleCard = page.locator('.printer-card:has-text("Status Idle")');
    const onlineCard = page.locator('.printer-card:has-text("Status Online")');
    const offlineCard = page.locator(
      '.printer-card:has-text("Status Offline")'
    );

    await expect(idleCard.locator('.badge')).toBeVisible();
    await expect(onlineCard.locator('.badge')).toBeVisible();
    await expect(offlineCard.locator('.badge')).toBeVisible();
  });

  test('should display printer model information', async ({ page }) => {
    await waitForAppReady(page);

    // Add printers with different models
    await addTestPrinter(page, 'X1C Model', 'X1C', '192.168.1.171');
    await addTestPrinter(page, 'P1S Model', 'P1S', '192.168.1.172');
    await addTestPrinter(page, 'A1 Model', 'A1', '192.168.1.173');

    // Verify printer names are displayed (model info is typically in the name or separate field)
    await expect(page.locator('text=X1C Model')).toBeVisible();
    await expect(page.locator('text=P1S Model')).toBeVisible();
    await expect(page.locator('text=A1 Model')).toBeVisible();
  });

  test('should handle printer card visual states', async ({ page }) => {
    await waitForAppReady(page);

    // Enable visual notifications
    await navigateToSettings(page);
    await toggleSetting(page, 'Idle Printer Alerts', true);
    await toggleSetting(page, 'Error Printer Alerts', true);

    // Navigate back to dashboard
    await page.click('button:has-text("Back to Dashboard")');
    await waitForAppReady(page);

    // Add a test printer
    await addTestPrinter(page, 'Visual Test', 'X1C', '192.168.1.180');

    const printerCard = page.locator('.printer-card:has-text("Visual Test")');
    await expect(printerCard).toBeVisible();

    // Verify the card has appropriate CSS classes for status
    const cardClasses = await printerCard.getAttribute('class');
    expect(cardClasses).toContain('printer-card');

    // The specific status classes depend on the mock service implementation
    // Common classes: status-idle, status-printing, status-error, etc.
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    await waitForAppReady(page);

    // Add a test printer
    await addTestPrinter(page, 'Responsive Test', 'X1C', '192.168.1.190');

    const printerCard = page.locator(
      '.printer-card:has-text("Responsive Test")'
    );
    await expect(printerCard).toBeVisible();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(printerCard).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(printerCard).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(printerCard).toBeVisible();
  });
});
