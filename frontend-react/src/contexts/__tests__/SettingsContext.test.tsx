import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsProvider, useSettings } from '../SettingsContext';

// Mock the TauriMqttService
jest.mock('../../services/TauriMqttService');

const TestComponent: React.FC = () => {
  const { settings, updateSettings, isLoading } = useSettings();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="dark-mode">{settings.darkMode.toString()}</div>
      <div data-testid="show-temperatures">
        {settings.showTemperatures.toString()}
      </div>
      <div data-testid="idle-notifications">
        {settings.idleNotifications.toString()}
      </div>
      <div data-testid="error-notifications">
        {settings.errorNotifications.toString()}
      </div>
      <div data-testid="view-mode">{settings.viewMode}</div>
      <button
        data-testid="toggle-dark-mode"
        onClick={() => updateSettings({ darkMode: !settings.darkMode })}
      >
        Toggle Dark Mode
      </button>
      <button
        data-testid="toggle-temperatures"
        onClick={() =>
          updateSettings({ showTemperatures: !settings.showTemperatures })
        }
      >
        Toggle Temperatures
      </button>
      <button
        data-testid="toggle-idle-notifications"
        onClick={() =>
          updateSettings({ idleNotifications: !settings.idleNotifications })
        }
      >
        Toggle Idle Notifications
      </button>
      <button
        data-testid="toggle-error-notifications"
        onClick={() =>
          updateSettings({ errorNotifications: !settings.errorNotifications })
        }
      >
        Toggle Error Notifications
      </button>
      <button
        data-testid="set-table-view"
        onClick={() => updateSettings({ viewMode: 'table' })}
      >
        Set Table View
      </button>
    </div>
  );
};

describe('SettingsContext', () => {
  const mockService =
    require('../../services/TauriMqttService').TauriMqttService.getInstance();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock to return default settings
    mockService.getSettings.mockResolvedValue({
      darkMode: false,
      showTemperatures: true,
      idleNotifications: false,
      errorNotifications: true,
      viewMode: 'card',
    });

    mockService.saveSettings.mockResolvedValue(undefined);
  });

  describe('Settings Loading', () => {
    test('should load settings from database on mount', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Should show default settings
      expect(screen.getByTestId('dark-mode')).toHaveTextContent('false');
      expect(screen.getByTestId('show-temperatures')).toHaveTextContent('true');
      expect(screen.getByTestId('idle-notifications')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('error-notifications')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('view-mode')).toHaveTextContent('card');
    });

    test('should handle custom settings from database', async () => {
      mockService.getSettings.mockResolvedValue({
        darkMode: true,
        showTemperatures: false,
        idleNotifications: true,
        errorNotifications: false,
        viewMode: 'table',
      });

      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('dark-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('show-temperatures')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('idle-notifications')).toHaveTextContent(
        'true'
      );
      expect(screen.getByTestId('error-notifications')).toHaveTextContent(
        'false'
      );
      expect(screen.getByTestId('view-mode')).toHaveTextContent('table');
    });
  });

  describe('Settings Updates', () => {
    test('should update settings and save to database', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('toggle-dark-mode'));

      await waitFor(() => {
        expect(screen.getByTestId('dark-mode')).toHaveTextContent('true');
      });

      expect(mockService.saveSettings).toHaveBeenCalledWith({
        darkMode: true,
        showTemperatures: true,
        idleNotifications: false,
        errorNotifications: true,
        viewMode: 'card',
      });
    });

    test('should update multiple settings', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('toggle-dark-mode'));

      await waitFor(() => {
        expect(screen.getByTestId('dark-mode')).toHaveTextContent('true');
      });

      fireEvent.click(screen.getByTestId('toggle-temperatures'));

      await waitFor(() => {
        expect(screen.getByTestId('show-temperatures')).toHaveTextContent(
          'false'
        );
      });

      fireEvent.click(screen.getByTestId('set-table-view'));

      await waitFor(() => {
        expect(screen.getByTestId('view-mode')).toHaveTextContent('table');
      });

      expect(mockService.saveSettings).toHaveBeenCalledTimes(3);
    });

    test('should handle partial settings updates', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('toggle-idle-notifications'));

      await waitFor(() => {
        expect(screen.getByTestId('idle-notifications')).toHaveTextContent(
          'true'
        );
      });

      expect(mockService.saveSettings).toHaveBeenCalledWith({
        darkMode: false,
        showTemperatures: true,
        idleNotifications: true,
        errorNotifications: true,
        viewMode: 'card',
      });
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
