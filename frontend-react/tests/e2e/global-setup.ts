import { chromium, FullConfig } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up global Tauri API mock...');

  // Read the mock script
  const mockScript = readFileSync(join(__dirname, 'tauri-api-mock.js'), 'utf8');

  // Create a browser instance to verify mock works
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Inject the mock script
    await page.addInitScript(mockScript);

    // Verify the mock is working
    const mockExists = await page.evaluate(() => {
      return typeof window.__TAURI_MOCK__ !== 'undefined';
    });

    if (mockExists) {
      console.log('✅ Tauri API mock successfully injected');
    } else {
      console.warn('⚠️ Tauri API mock injection failed');
    }
  } catch (error) {
    console.error('❌ Error during global setup:', error);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
