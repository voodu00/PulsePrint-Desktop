import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../SettingsContext';
import { defaultSettings } from '../../types/settings';

// Mock logger
jest.mock('../../utils/logger', () => ({
  Logger: {
    error: jest.fn(),
  },
}));

// Test component to interact with settings
const TestComponent: React.FC = () => {
  const {
    settings,
    updateSetting,
    resetSettings,
    hasUnsavedChanges,
    saveSettings,
  } = useSettings();

  return (
    <div>
      <div data-testid="dark-mode">{settings.darkMode.toString()}</div>
      <div data-testid="sound-notifications">
        {settings.soundNotifications.toString()}
      </div>
      <div data-testid="unsaved-changes">{hasUnsavedChanges.toString()}</div>

      <button
        data-testid="toggle-sound-notifications"
        onClick={() =>
          updateSetting('soundNotifications', !settings.soundNotifications)
        }
      >
        Toggle Sound Notifications
      </button>

      <button
        data-testid="toggle-dark-mode"
        onClick={() => updateSetting('darkMode', !settings.darkMode)}
      >
        Toggle Dark Mode
      </button>

      <button data-testid="save-settings" onClick={saveSettings}>
        Save Settings
      </button>

      <button data-testid="reset-settings" onClick={resetSettings}>
        Reset Settings
      </button>
    </div>
  );
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock document.documentElement.classList
const mockClassList = {
  add: jest.fn(),
  remove: jest.fn(),
  toggle: jest.fn(),
  contains: jest.fn(),
};

Object.defineProperty(document.documentElement, 'classList', {
  value: mockClassList,
});

describe('SettingsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Default Settings', () => {
    test('should initialize with all default settings', () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      expect(screen.getByTestId('dark-mode')).toHaveTextContent('false');
      expect(screen.getByTestId('sound-notifications')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('false');
    });

    test('should verify default settings object has correct values', () => {
      expect(defaultSettings.darkMode).toBe(false);
      expect(defaultSettings.idleNotifications).toBe(false);
      expect(defaultSettings.errorNotifications).toBe(true);
      expect(defaultSettings.soundNotifications).toBe(false);
      expect(defaultSettings.showTemperatures).toBe(true);
      expect(defaultSettings.showProgress).toBe(true);
      expect(defaultSettings.compactView).toBe(false);
    });
  });

  describe('Settings Updates', () => {
    test('should update sound notifications setting', () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      expect(screen.getByTestId('sound-notifications')).toHaveTextContent(
        'false'
      );

      fireEvent.click(screen.getByTestId('toggle-sound-notifications'));

      expect(screen.getByTestId('sound-notifications')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('true');
    });

    test('should update dark mode setting', () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      expect(screen.getByTestId('dark-mode')).toHaveTextContent('false');

      fireEvent.click(screen.getByTestId('toggle-dark-mode'));

      expect(screen.getByTestId('dark-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('true');
    });

    test('should apply dark mode to document immediately', () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      fireEvent.click(screen.getByTestId('toggle-dark-mode'));

      expect(mockClassList.add).toHaveBeenCalledWith('dark');

      fireEvent.click(screen.getByTestId('toggle-dark-mode'));

      expect(mockClassList.remove).toHaveBeenCalledWith('dark');
    });
  });

  describe('Settings Persistence', () => {
    test('should save settings to localStorage', () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      fireEvent.click(screen.getByTestId('toggle-sound-notifications'));
      fireEvent.click(screen.getByTestId('save-settings'));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pulseprint-desktop-settings',
        JSON.stringify({
          ...defaultSettings,
          soundNotifications: true,
        })
      );

      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('false');
    });

    test('should load settings from localStorage on mount', () => {
      const savedSettings = {
        ...defaultSettings,
        soundNotifications: true,
        darkMode: true,
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings));

      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      expect(screen.getByTestId('sound-notifications')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('dark-mode')).toHaveTextContent('true');
      expect(mockClassList.add).toHaveBeenCalledWith('dark');
    });

    test('should handle corrupted localStorage data gracefully', () => {
      const Logger = require('../../utils/logger').Logger;
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      // Should fall back to defaults
      expect(screen.getByTestId('sound-notifications')).toHaveTextContent(
        'false'
      );
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to load settings:',
        expect.any(Error)
      );
    });

    test('should merge saved settings with defaults for missing fields', () => {
      const partialSettings = {
        soundNotifications: true,
        darkMode: true,
        // Missing other fields
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(partialSettings));

      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      expect(screen.getByTestId('sound-notifications')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('dark-mode')).toHaveTextContent('true');
    });
  });

  describe('Settings Reset', () => {
    test('should reset settings to defaults', () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      // Make changes and save them first
      fireEvent.click(screen.getByTestId('toggle-sound-notifications'));
      fireEvent.click(screen.getByTestId('toggle-dark-mode'));
      fireEvent.click(screen.getByTestId('save-settings'));

      expect(screen.getByTestId('sound-notifications')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('dark-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('false');

      // Reset
      fireEvent.click(screen.getByTestId('reset-settings'));

      expect(screen.getByTestId('sound-notifications')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('dark-mode')).toHaveTextContent('false');
      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('true');
    });
  });

  describe('Unsaved Changes Detection', () => {
    test('should detect unsaved changes correctly', () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('false');

      fireEvent.click(screen.getByTestId('toggle-sound-notifications'));
      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('true');

      fireEvent.click(screen.getByTestId('save-settings'));
      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('false');
    });

    test('should not show unsaved changes when reverting to original value', () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      // Toggle dark mode twice (back to original)
      fireEvent.click(screen.getByTestId('toggle-dark-mode'));
      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('true');

      fireEvent.click(screen.getByTestId('toggle-dark-mode'));
      expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('false');
    });
  });

  describe('Settings Event Dispatch', () => {
    test('should dispatch custom event when settings are saved', () => {
      const mockDispatchEvent = jest.fn();
      window.dispatchEvent = mockDispatchEvent;

      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      fireEvent.click(screen.getByTestId('toggle-sound-notifications'));
      fireEvent.click(screen.getByTestId('save-settings'));

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'settingsChanged',
          detail: expect.objectContaining({
            soundNotifications: true,
          }),
        })
      );
    });
  });

  describe('Hook Usage', () => {
    test('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useSettings must be used within a SettingsProvider');

      console.error = originalError;
    });
  });
});
