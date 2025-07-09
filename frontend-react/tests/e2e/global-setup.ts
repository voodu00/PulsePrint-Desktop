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
    // Wait for the development server to be ready
    console.log('⏳ Waiting for development server to be ready...');
    let serverReady = false;
    const maxRetries = 30;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.goto('http://localhost:3000', {
          waitUntil: 'networkidle',
          timeout: 5000,
        });
        serverReady = true;
        console.log('✅ Development server is ready!');
        break;
      } catch (error) {
        console.log(`⏳ Waiting for server... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!serverReady) {
      console.warn('⚠️ Development server not ready, tests may fail');
      return;
    }

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
    // Don't fail the setup, just warn
    console.warn('⚠️ Global setup failed, but tests will continue');
  } finally {
    await browser.close();
  }
}

export default globalSetup;
