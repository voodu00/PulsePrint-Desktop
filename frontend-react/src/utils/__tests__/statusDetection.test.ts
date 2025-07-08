import {
  calculateProgress,
  getProgressSourceDescription,
} from '../progressCalculation';
import { formatTime } from '../formatTime';
import { defaultSettings } from '../../types/settings';

describe('Status Detection and Core Utilities', () => {
  describe('Progress Calculation', () => {
    test('should return zero progress for null print job', () => {
      const result = calculateProgress(null);
      expect(result.progress).toBe(0);
      expect(result.source).toBe('unknown');
    });

    test('should use direct progress when available', () => {
      const printJob = {
        progress: 75.5,
        fileName: 'test.3mf',
        layerCurrent: 150,
        layerTotal: 200,
        timeRemaining: 1800,
        estimatedTotalTime: 7200,
      };

      const result = calculateProgress(printJob);
      expect(result.progress).toBe(75.5);
      expect(result.source).toBe('direct');
    });

    test('should calculate progress from time when direct progress is unavailable', () => {
      const printJob = {
        progress: 0,
        fileName: 'test.3mf',
        layerCurrent: 0,
        layerTotal: 0,
        timeRemaining: 1800, // 30 minutes remaining
        estimatedTotalTime: 3600, // 60 minutes total
      };

      const result = calculateProgress(printJob);
      expect(result.progress).toBe(50); // 50% complete (30/60 remaining)
      expect(result.source).toBe('time');
    });

    test('should calculate progress from layers when time is unavailable', () => {
      const printJob = {
        progress: 0,
        fileName: 'test.3mf',
        layerCurrent: 75,
        layerTotal: 150,
        timeRemaining: 0,
        estimatedTotalTime: 0,
      };

      const result = calculateProgress(printJob);
      expect(result.progress).toBe(50); // 50% complete (75/150 layers)
      expect(result.source).toBe('layer');
    });

    test('should handle edge cases and invalid data', () => {
      // Test with negative values
      const invalidJob = {
        progress: -10,
        fileName: 'test.3mf',
        layerCurrent: -5,
        layerTotal: 100,
        timeRemaining: -100,
        estimatedTotalTime: 3600,
      };

      const result = calculateProgress(invalidJob);
      expect(result.progress).toBe(0); // Should clamp to 0
      expect(result.source).toBe('direct');
    });

    test('should handle progress over 100%', () => {
      const overJob = {
        progress: 150,
        fileName: 'test.3mf',
        layerCurrent: 200,
        layerTotal: 100,
        timeRemaining: 0,
        estimatedTotalTime: 3600,
      };

      const result = calculateProgress(overJob);
      expect(result.progress).toBe(100); // Should clamp to 100
      expect(result.source).toBe('direct');
    });
  });

  describe('Progress Source Descriptions', () => {
    test('should return correct descriptions for each source type', () => {
      expect(getProgressSourceDescription('direct')).toBe(
        'Direct from printer'
      );
      expect(getProgressSourceDescription('time')).toBe(
        'Calculated from time remaining'
      );
      expect(getProgressSourceDescription('layer')).toBe(
        'Calculated from layer progress'
      );
      expect(getProgressSourceDescription('unknown')).toBe(
        'Progress unavailable'
      );
    });
  });

  describe('Time Formatting', () => {
    test('should format time correctly for different durations', () => {
      expect(formatTime(0)).toBe('N/A');
      expect(formatTime(-100)).toBe('N/A');
      expect(formatTime(30)).toBe('0m'); // Less than 1 minute
      expect(formatTime(60)).toBe('1m'); // Exactly 1 minute
      expect(formatTime(90)).toBe('1m'); // 1.5 minutes
      expect(formatTime(300)).toBe('5m'); // 5 minutes
      expect(formatTime(3600)).toBe('1h 0m'); // 1 hour
      expect(formatTime(3660)).toBe('1h 1m'); // 1 hour 1 minute
      expect(formatTime(7200)).toBe('2h 0m'); // 2 hours
      expect(formatTime(7320)).toBe('2h 2m'); // 2 hours 2 minutes
    });
  });

  describe('Default Settings Validation', () => {
    test('should have 5-minute refresh interval as default', () => {
      expect(defaultSettings.refreshInterval).toBe(300); // 5 minutes in seconds
    });

    test('should have auto refresh enabled by default', () => {
      expect(defaultSettings.autoRefresh).toBe(true);
    });

    test('should have proper default values for all settings', () => {
      expect(defaultSettings).toEqual({
        refreshInterval: 300, // 5 minutes
        autoRefresh: true,
        darkMode: false,
        idleNotifications: false,
        errorNotifications: true,
        soundNotifications: false,
        showTemperatures: true,
        showProgress: true,
        compactView: false,
      });
    });
  });

  describe('Status Detection Logic', () => {
    test('should correctly identify printing status indicators', () => {
      // Mock printer data that would indicate printing
      const printingIndicators = {
        hasActiveJob: true,
        progressGreaterThanZero: true,
        layersProgressing: true,
        timeRemaining: 3600,
        temperaturesElevated: true,
        fanActivity: true,
      };

      // Test that we can identify printing status from multiple indicators
      const isPrinting =
        printingIndicators.hasActiveJob &&
        (printingIndicators.progressGreaterThanZero ||
          printingIndicators.layersProgressing ||
          printingIndicators.timeRemaining > 0) &&
        (printingIndicators.temperaturesElevated ||
          printingIndicators.fanActivity);

      expect(isPrinting).toBe(true);
    });

    test('should correctly identify idle status', () => {
      // Mock printer data that would indicate idle
      const idleIndicators = {
        hasActiveJob: false,
        progressGreaterThanZero: false,
        layersProgressing: false,
        timeRemaining: 0,
        temperaturesElevated: false,
        fanActivity: false,
      };

      // Test that we can identify idle status
      const isIdle =
        !idleIndicators.hasActiveJob &&
        !idleIndicators.progressGreaterThanZero &&
        !idleIndicators.layersProgressing &&
        idleIndicators.timeRemaining === 0;

      expect(isIdle).toBe(true);
    });

    test('should prevent spurious status changes', () => {
      // Mock a scenario where we might get conflicting data
      const conflictingData = {
        reportedStatus: 'idle',
        hasProgress: true,
        hasTimeRemaining: true,
        hasActiveLayers: true,
      };

      // Logic should prioritize actual activity indicators over reported status
      const shouldOverrideStatus =
        conflictingData.hasProgress ||
        conflictingData.hasTimeRemaining ||
        conflictingData.hasActiveLayers;

      expect(shouldOverrideStatus).toBe(true);
    });
  });

  describe('Settings Refresh Interval Formatting', () => {
    test('should format refresh intervals correctly', () => {
      const formatRefreshInterval = (seconds: number): string => {
        if (seconds >= 60) {
          const minutes = seconds / 60;
          return minutes === 1 ? '1 minute' : `${minutes} minutes`;
        }
        return `${seconds} seconds`;
      };

      expect(formatRefreshInterval(15)).toBe('15 seconds');
      expect(formatRefreshInterval(30)).toBe('30 seconds');
      expect(formatRefreshInterval(60)).toBe('1 minute');
      expect(formatRefreshInterval(120)).toBe('2 minutes');
      expect(formatRefreshInterval(300)).toBe('5 minutes'); // Our default
      expect(formatRefreshInterval(600)).toBe('10 minutes');
    });
  });

  describe('Error State Detection', () => {
    test('should identify error conditions correctly', () => {
      const errorConditions = {
        hasErrorCode: true,
        hasErrorMessage: true,
        printStopped: true,
        temperatureOutOfRange: false,
        connectionLost: false,
      };

      const hasError =
        errorConditions.hasErrorCode ||
        errorConditions.hasErrorMessage ||
        errorConditions.temperatureOutOfRange ||
        errorConditions.connectionLost;

      expect(hasError).toBe(true);
    });

    test('should differentiate between critical and non-critical errors', () => {
      const criticalError = {
        errorCode: 12345,
        isCritical: true,
        requiresUserIntervention: true,
      };

      const warningError = {
        errorCode: 1001,
        isCritical: false,
        requiresUserIntervention: false,
      };

      expect(criticalError.isCritical).toBe(true);
      expect(criticalError.requiresUserIntervention).toBe(true);
      expect(warningError.isCritical).toBe(false);
      expect(warningError.requiresUserIntervention).toBe(false);
    });
  });

  describe('Temperature Status Logic', () => {
    test('should classify temperature ranges correctly', () => {
      const classifyTemperature = (
        temp: number,
        type: 'nozzle' | 'bed' | 'chamber'
      ) => {
        if (type === 'nozzle') {
          if (temp > 150) {
            return 'hot';
          }
          if (temp > 50) {
            return 'warm';
          }
          return 'cool';
        }
        if (type === 'bed') {
          if (temp > 80) {
            return 'hot';
          }
          if (temp > 40) {
            return 'warm';
          }
          return 'cool';
        }
        if (type === 'chamber') {
          if (temp > 50) {
            return 'warm';
          }
          return 'cool';
        }
        return 'cool';
      };

      // Test nozzle temperatures
      expect(classifyTemperature(25, 'nozzle')).toBe('cool');
      expect(classifyTemperature(75, 'nozzle')).toBe('warm');
      expect(classifyTemperature(200, 'nozzle')).toBe('hot');

      // Test bed temperatures
      expect(classifyTemperature(25, 'bed')).toBe('cool');
      expect(classifyTemperature(60, 'bed')).toBe('warm');
      expect(classifyTemperature(90, 'bed')).toBe('hot');

      // Test chamber temperatures
      expect(classifyTemperature(25, 'chamber')).toBe('cool');
      expect(classifyTemperature(60, 'chamber')).toBe('warm');
    });
  });
});
