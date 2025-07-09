import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PrinterCard from '../PrinterCard';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { Printer, PrinterStatus, PrintJob } from '../../types/printer';

// Mock the progress calculation utility
jest.mock('../../utils/progressCalculation', () => ({
  calculateProgress: jest
    .fn()
    .mockImplementation((printJob: PrintJob | null) => {
      if (!printJob) {
        return { progress: 0, source: 'unknown' };
      }

      // If progress is available and not 0, use it directly
      if (typeof printJob.progress === 'number' && printJob.progress !== 0) {
        return {
          progress: printJob.progress,
          source: 'direct',
        };
      }

      // Otherwise use time-based calculation if available
      if (printJob.estimatedTotalTime && printJob.timeRemaining) {
        const elapsed = printJob.estimatedTotalTime - printJob.timeRemaining;
        const progress = Math.min(
          100,
          Math.max(0, (elapsed / printJob.estimatedTotalTime) * 100)
        );
        return {
          progress,
          source: 'time',
        };
      }

      // Otherwise use layer-based calculation if available
      if (printJob.layerTotal && printJob.layerCurrent) {
        const progress = Math.min(
          100,
          Math.max(0, (printJob.layerCurrent / printJob.layerTotal) * 100)
        );
        return {
          progress,
          source: 'layer',
        };
      }

      return { progress: 0, source: 'unknown' };
    }),
  getProgressSourceDescription: jest
    .fn()
    .mockReturnValue('Direct from printer'),
}));

// Get the mocked function for use in tests
const mockCalculateProgress =
  require('../../utils/progressCalculation').calculateProgress;

// Mock the time formatting utility
jest.mock('../../utils/formatTime', () => ({
  formatTime: jest.fn(seconds => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  Logger: {
    error: jest.fn(),
  },
}));

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

const createMockPrinter = (overrides: Partial<Printer> = {}): Printer => ({
  id: 'test-printer-1',
  name: 'Test Printer',
  model: 'X1C',
  ip: '192.168.1.100',
  accessCode: 'test123',
  serial: 'TEST001',
  status: 'idle',
  temperatures: {
    nozzle: 25,
    bed: 25,
    chamber: 25,
  },
  print: null,
  filament: null,
  error: null,
  lastUpdate: new Date('2024-01-01T12:00:00Z'),
  ...overrides,
});

const renderPrinterCard = (printer: Printer, handlers = {}) => {
  const defaultHandlers = {
    onPause: jest.fn(),
    onResume: jest.fn(),
    onStop: jest.fn(),
    ...handlers,
  };

  return render(
    <SettingsProvider>
      <PrinterCard printer={printer} {...defaultHandlers} />
    </SettingsProvider>
  );
};

describe('PrinterCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Reset the calculateProgress mock to ensure it returns proper objects
    mockCalculateProgress.mockImplementation((printJob: PrintJob | null) => {
      if (!printJob) {
        return { progress: 0, source: 'unknown' };
      }

      // If progress is available and not 0, use it directly
      if (typeof printJob.progress === 'number' && printJob.progress !== 0) {
        return {
          progress: printJob.progress,
          source: 'direct',
        };
      }

      // Otherwise use time-based calculation if available
      if (printJob.estimatedTotalTime && printJob.timeRemaining) {
        const elapsed = printJob.estimatedTotalTime - printJob.timeRemaining;
        const progress = Math.min(
          100,
          Math.max(0, (elapsed / printJob.estimatedTotalTime) * 100)
        );
        return {
          progress,
          source: 'time',
        };
      }

      // Otherwise use layer-based calculation if available
      if (printJob.layerTotal && printJob.layerCurrent) {
        const progress = Math.min(
          100,
          Math.max(0, (printJob.layerCurrent / printJob.layerTotal) * 100)
        );
        return {
          progress,
          source: 'layer',
        };
      }

      return { progress: 0, source: 'unknown' };
    });
  });

  describe('Status Display', () => {
    test('should display idle status correctly', () => {
      const printer = createMockPrinter({ status: 'idle' });
      renderPrinterCard(printer);

      expect(screen.getByText('Test Printer')).toBeInTheDocument();
      expect(screen.getByText('Idle')).toBeInTheDocument();

      const printerCard = screen.getByTestId('printer-card-test-printer-1');
      expect(printerCard).toHaveClass('status-idle');
    });

    test('should display printing status correctly', () => {
      const printer = createMockPrinter({
        status: 'printing',
        print: {
          progress: 45.5,
          fileName: 'test_model.3mf',
          layerCurrent: 150,
          layerTotal: 300,
          timeRemaining: 3600,
          estimatedTotalTime: 7200,
        },
      });
      renderPrinterCard(printer);

      expect(screen.getByText('Printing')).toBeInTheDocument();
      expect(screen.getByText(/test_model\.3mf/)).toBeInTheDocument();
      expect(screen.getByText('46%')).toBeInTheDocument(); // Math.round(45.5) = 46
      expect(screen.getByText('Layer 150/300')).toBeInTheDocument();

      const printerCard = screen.getByTestId('printer-card-test-printer-1');
      expect(printerCard).toHaveClass('status-printing');
    });

    test('should display paused status correctly', () => {
      const printer = createMockPrinter({
        status: 'paused',
        print: {
          progress: 30.0,
          fileName: 'paused_print.3mf',
          layerCurrent: 100,
          layerTotal: 350,
          timeRemaining: 4500,
          estimatedTotalTime: 9000,
        },
      });
      renderPrinterCard(printer);

      expect(screen.getByText('Paused')).toBeInTheDocument();
      expect(screen.getByText(/paused_print\.3mf/)).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    test('should display error status correctly', () => {
      const printer = createMockPrinter({
        status: 'error',
        error: {
          printError: 1,
          errorCode: 12345,
          stage: 3,
          lifecycle: 'printing',
          gcodeState: 'pause',
          message: 'Filament runout detected',
        },
      });
      renderPrinterCard(printer);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Filament runout detected')).toBeInTheDocument();
      expect(screen.getByText('Error Code:')).toBeInTheDocument();
      expect(screen.getByText('12345')).toBeInTheDocument();

      const printerCard = screen.getByTestId('printer-card-test-printer-1');
      expect(printerCard).toHaveClass('status-error');
    });

    test('should display offline status correctly', () => {
      const printer = createMockPrinter({ status: 'offline' });
      renderPrinterCard(printer);

      expect(screen.getByText('Offline')).toBeInTheDocument();

      const printerCard = screen.getByTestId('printer-card-test-printer-1');
      expect(printerCard).toHaveClass('status-offline');
    });

    test('should display connecting status correctly', () => {
      const printer = createMockPrinter({ status: 'connecting' });
      renderPrinterCard(printer);

      expect(screen.getByText('Connecting')).toBeInTheDocument();

      const printerCard = screen.getByTestId('printer-card-test-printer-1');
      expect(printerCard).toHaveClass('status-connecting');
    });
  });

  describe('Temperature Display', () => {
    test('should show temperatures when setting is enabled and temperatures are above 0', () => {
      const printer = createMockPrinter({
        temperatures: {
          nozzle: 220,
          bed: 60,
          chamber: 35,
        },
      });

      // Mock settings with temperatures enabled
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          showTemperatures: true,
          darkMode: false,
          idleNotifications: false,
          errorNotifications: true,
          soundNotifications: false,
          showProgress: true,
          compactView: false,
        })
      );

      renderPrinterCard(printer);

      expect(screen.getByText('220°C')).toBeInTheDocument();
      expect(screen.getByText('60°C')).toBeInTheDocument();
      expect(screen.getByText('35°C')).toBeInTheDocument();
    });

    test('should hide temperatures when setting is disabled', () => {
      const printer = createMockPrinter({
        temperatures: {
          nozzle: 220,
          bed: 60,
          chamber: 35,
        },
      });

      // Mock settings with temperatures disabled
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          showTemperatures: false,
          darkMode: false,
          idleNotifications: false,
          errorNotifications: true,
          soundNotifications: false,
          showProgress: true,
          compactView: false,
        })
      );

      renderPrinterCard(printer);

      expect(screen.queryByText('220°C')).not.toBeInTheDocument();
      expect(screen.queryByText('60°C')).not.toBeInTheDocument();
      expect(screen.queryByText('35°C')).not.toBeInTheDocument();
    });

    test('should not show temperatures when all are 0 or below', () => {
      const printer = createMockPrinter({
        temperatures: {
          nozzle: 0,
          bed: 0,
          chamber: 0,
        },
      });

      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          showTemperatures: true,
          darkMode: false,
          idleNotifications: false,
          errorNotifications: true,
          soundNotifications: false,
          showProgress: true,
          compactView: false,
        })
      );

      renderPrinterCard(printer);

      expect(screen.queryByText('Temperatures')).not.toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    test('should show progress when setting is enabled and printer is printing', () => {
      const printer = createMockPrinter({
        status: 'printing',
        print: {
          progress: 65.7,
          fileName: 'complex_model.3mf',
          layerCurrent: 200,
          layerTotal: 300,
          timeRemaining: 1800,
          estimatedTotalTime: 5400,
        },
      });

      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          showProgress: true,
          darkMode: false,
          idleNotifications: false,
          errorNotifications: true,
          soundNotifications: false,
          showTemperatures: true,
          compactView: false,
        })
      );

      renderPrinterCard(printer);

      expect(screen.getByText('66%')).toBeInTheDocument(); // Math.round(65.7) = 66
      expect(screen.getByText('Layer 200/300')).toBeInTheDocument();
      expect(screen.getByText(/left/)).toBeInTheDocument(); // Time remaining should be displayed
    });

    test('should hide progress when setting is disabled', () => {
      const printer = createMockPrinter({
        status: 'printing',
        print: {
          progress: 65.7,
          fileName: 'complex_model.3mf',
          layerCurrent: 200,
          layerTotal: 300,
          timeRemaining: 1800,
          estimatedTotalTime: 5400,
        },
      });

      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          showProgress: false,
          darkMode: false,
          idleNotifications: false,
          errorNotifications: true,
          soundNotifications: false,
          showTemperatures: true,
          compactView: false,
        })
      );

      renderPrinterCard(printer);

      expect(screen.queryByText('66%')).not.toBeInTheDocument();
      expect(screen.queryByText('Layer 200/300')).not.toBeInTheDocument();
    });

    test('should not show progress when printer is not printing/paused', () => {
      const printer = createMockPrinter({
        status: 'idle',
        print: {
          progress: 65.7,
          fileName: 'complex_model.3mf',
          layerCurrent: 200,
          layerTotal: 300,
          timeRemaining: 1800,
          estimatedTotalTime: 5400,
        },
      });

      renderPrinterCard(printer);

      expect(screen.queryByText('66%')).not.toBeInTheDocument();
      expect(screen.queryByText('Layer 200/300')).not.toBeInTheDocument();
    });
  });

  describe('Filament Display', () => {
    test('should show filament information when available', () => {
      const printer = createMockPrinter({
        filament: {
          type: 'PLA',
          color: 'Red',
          remaining: 85,
        },
      });

      renderPrinterCard(printer);

      expect(screen.getByText('PLA')).toBeInTheDocument();
      expect(screen.getByText('Red')).toBeInTheDocument();
      // Note: The component doesn't show remaining percentage, only type and color
    });

    test('should not show filament section when no filament data', () => {
      const printer = createMockPrinter({ filament: null });

      renderPrinterCard(printer);

      expect(screen.queryByText('🧵 Filament')).not.toBeInTheDocument();
    });

    test('should not show filament section when type is missing', () => {
      const printer = createMockPrinter({
        filament: {
          type: '',
          color: 'Red',
          remaining: 85,
        },
      });

      renderPrinterCard(printer);

      expect(screen.queryByText('🧵 Filament')).not.toBeInTheDocument();
    });
  });

  describe('Control Buttons', () => {
    test('should show pause button when printer is printing', () => {
      const printer = createMockPrinter({
        status: 'printing',
        print: {
          progress: 50,
          fileName: 'test.3mf',
          layerCurrent: 100,
          layerTotal: 200,
          timeRemaining: 3600,
          estimatedTotalTime: 7200,
        },
      });

      const mockOnPause = jest.fn();
      renderPrinterCard(printer, { onPause: mockOnPause });

      const pauseButton = screen.getByText('Pause');
      expect(pauseButton).toBeInTheDocument();

      fireEvent.click(pauseButton);
      expect(mockOnPause).toHaveBeenCalledWith(printer.id);
    });

    test('should show resume button when printer is paused', () => {
      const printer = createMockPrinter({
        status: 'paused',
        print: {
          progress: 50,
          fileName: 'test.3mf',
          layerCurrent: 100,
          layerTotal: 200,
          timeRemaining: 3600,
          estimatedTotalTime: 7200,
        },
      });

      const mockOnResume = jest.fn();
      renderPrinterCard(printer, { onResume: mockOnResume });

      const resumeButton = screen.getByText('Resume');
      expect(resumeButton).toBeInTheDocument();

      fireEvent.click(resumeButton);
      expect(mockOnResume).toHaveBeenCalledWith(printer.id);
    });

    test('should show stop button when printer is printing or paused', () => {
      const printingPrinter = createMockPrinter({
        status: 'printing',
        print: {
          progress: 50,
          fileName: 'test.3mf',
          layerCurrent: 100,
          layerTotal: 200,
          timeRemaining: 3600,
          estimatedTotalTime: 7200,
        },
      });

      const mockOnStop = jest.fn();
      renderPrinterCard(printingPrinter, { onStop: mockOnStop });

      const stopButton = screen.getByText('Stop');
      expect(stopButton).toBeInTheDocument();

      fireEvent.click(stopButton);
      expect(mockOnStop).toHaveBeenCalledWith(printingPrinter.id);
    });

    test('should not show control buttons when printer is idle', () => {
      const printer = createMockPrinter({ status: 'idle' });
      renderPrinterCard(printer);

      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
      expect(screen.queryByText('Resume')).not.toBeInTheDocument();
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });

    test('should not show control buttons when printer is offline', () => {
      const printer = createMockPrinter({ status: 'offline' });
      renderPrinterCard(printer);

      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
      expect(screen.queryByText('Resume')).not.toBeInTheDocument();
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });
  });

  describe('Last Update Display', () => {
    test('should show last update time', () => {
      const printer = createMockPrinter({
        lastUpdate: new Date('2024-01-01T12:30:45Z'),
      });

      renderPrinterCard(printer);

      expect(screen.getByText(/Last update:/)).toBeInTheDocument();
      // Time format depends on locale, so we just check for the presence of time
      expect(screen.getByText(/\d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument();
    });
  });

  describe('Status Icons', () => {
    test('should show correct icon for each status', () => {
      const statuses: PrinterStatus[] = [
        'idle',
        'printing',
        'paused',
        'error',
        'offline',
        'connecting',
      ];

      statuses.forEach(status => {
        const printer = createMockPrinter({ status });
        const { unmount } = renderPrinterCard(printer);

        const statusBadge = screen.getByText(
          status.charAt(0).toUpperCase() + status.slice(1)
        );
        expect(statusBadge).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing print data gracefully', () => {
      const printer = createMockPrinter({
        status: 'printing',
        print: null, // Missing print data
      });

      expect(() => renderPrinterCard(printer)).not.toThrow();
      expect(screen.getByText('Printing')).toBeInTheDocument();
    });

    test('should handle invalid temperature values', () => {
      const printer = createMockPrinter({
        temperatures: {
          nozzle: -999,
          bed: 999,
          chamber: 0,
        },
      });

      expect(() => renderPrinterCard(printer)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels for interactive elements', () => {
      const printer = createMockPrinter({
        status: 'printing',
        print: {
          progress: 50,
          fileName: 'test.3mf',
          layerCurrent: 100,
          layerTotal: 200,
          timeRemaining: 3600,
          estimatedTotalTime: 7200,
        },
      });

      renderPrinterCard(printer);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      const stopButton = screen.getByRole('button', { name: /stop/i });

      expect(pauseButton).toBeInTheDocument();
      expect(stopButton).toBeInTheDocument();
    });

    test('should have proper heading structure', () => {
      const printer = createMockPrinter();
      renderPrinterCard(printer);

      const printerName = screen.getByRole('heading', { level: 3 });
      expect(printerName).toHaveTextContent('Test Printer');
    });
  });
});
