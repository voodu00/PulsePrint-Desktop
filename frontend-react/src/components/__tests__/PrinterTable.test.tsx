import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PrinterTable from '../PrinterTable';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { Printer } from '../../types/printer';
import { TauriMqttService } from '../../services/TauriMqttService';

// Mock the TauriMqttService
jest.mock('../../services/TauriMqttService');

// Mock printer data
const mockPrinters: Printer[] = [
  {
    id: 'test-printer-1',
    name: 'Test Printer 1',
    model: 'X1C',
    ip: '192.168.1.100',
    accessCode: 'test123',
    serial: 'TEST001',
    status: 'printing',
    temperatures: {
      nozzle: 220,
      bed: 60,
      chamber: 35,
    },
    print: {
      progress: 50,
      fileName: 'test_print.3mf',
      layerCurrent: 150,
      layerTotal: 300,
      timeRemaining: 3600,
      estimatedTotalTime: 7200,
    },
    filament: {
      type: 'PLA',
      color: '#ff0000',
      remaining: 75,
    },
    error: null,
    lastUpdate: new Date(),
  },
];

const mockHandlers = {
  onPause: jest.fn(),
  onResume: jest.fn(),
  onStop: jest.fn(),
};

const renderWithSettings = (component: React.ReactElement) => {
  return render(<SettingsProvider>{component}</SettingsProvider>);
};

// Helper to mock settings
const mockSettings = (settings: any) => {
  const mockInstance = {
    getSettings: jest.fn().mockResolvedValue({
      darkMode: false,
      showTemperatures: true,
      idleNotifications: true,
      errorNotifications: true,
      showProgress: true,
      viewMode: 'card',
      ...settings,
    }),
    saveSettings: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
    getPrinters: jest.fn().mockResolvedValue([]),
    getAllPrinters: jest.fn().mockReturnValue([]),
    getPrinter: jest.fn().mockReturnValue(undefined),
    connectPrinter: jest.fn().mockResolvedValue(undefined),
    disconnectPrinter: jest.fn().mockResolvedValue(undefined),
    sendPrintCommand: jest.fn().mockResolvedValue(undefined),
    pausePrint: jest.fn().mockResolvedValue(undefined),
    resumePrint: jest.fn().mockResolvedValue(undefined),
    stopPrint: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  // Use jest.mocked to properly type the mock
  const MockedTauriMqttService = jest.mocked(TauriMqttService);
  MockedTauriMqttService.getInstance = jest
    .fn()
    .mockReturnValue(mockInstance as any);

  return mockInstance;
};

describe('PrinterTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default settings mock - updated to match new defaults
    mockSettings({
      showTemperatures: true,
      showProgress: true,
      idleNotifications: true,
      errorNotifications: true,
    });
  });

  test('renders empty state when no printers', () => {
    renderWithSettings(<PrinterTable printers={[]} {...mockHandlers} />);

    expect(screen.getByText('No Printers Added')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add your first printer to start monitoring your 3D prints.'
      )
    ).toBeInTheDocument();
  });

  test('renders table with printer data', () => {
    renderWithSettings(
      <PrinterTable printers={mockPrinters} {...mockHandlers} />
    );

    // Check table headers
    expect(screen.getByText('Printer')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Filament')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Check printer data
    expect(screen.getByText('Test Printer 1')).toBeInTheDocument();
    expect(screen.getByText('X1C')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('Printing')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return element?.textContent === '📄 test_print.3mf';
      })
    ).toBeInTheDocument();
    expect(screen.getByText('PLA')).toBeInTheDocument();
  });

  test('renders temperature column when showTemperatures is enabled', () => {
    renderWithSettings(
      <PrinterTable printers={mockPrinters} {...mockHandlers} />
    );

    // Temperature column should be visible by default
    expect(screen.getByText('Temperatures')).toBeInTheDocument();
    expect(screen.getByText('220°C')).toBeInTheDocument();
    expect(screen.getByText('60°C')).toBeInTheDocument();
  });

  test('renders action buttons for printing printer', () => {
    renderWithSettings(
      <PrinterTable printers={mockPrinters} {...mockHandlers} />
    );

    // Should have pause and stop buttons for printing printer
    const pauseButton = screen.getByTitle('Pause Print');
    const stopButton = screen.getByTitle('Stop Print');

    expect(pauseButton).toBeInTheDocument();
    expect(stopButton).toBeInTheDocument();
  });

  test('renders correct status badge colors', () => {
    const printersWithDifferentStatuses: Printer[] = [
      { ...mockPrinters[0], id: 'printer-1', status: 'printing' },
      { ...mockPrinters[0], id: 'printer-2', status: 'idle' },
      { ...mockPrinters[0], id: 'printer-3', status: 'error' },
    ];

    renderWithSettings(
      <PrinterTable
        printers={printersWithDifferentStatuses}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Printing')).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  test('does not apply flash classes for idle printers when notifications disabled', async () => {
    // Mock settings with idle notifications explicitly disabled
    mockSettings({
      showTemperatures: true,
      showProgress: true,
      idleNotifications: false,
      errorNotifications: true,
    });

    const idlePrinter: Printer[] = [
      { ...mockPrinters[0], id: 'idle-printer', status: 'idle' },
    ];

    renderWithSettings(
      <PrinterTable printers={idlePrinter} {...mockHandlers} />
    );

    const tableRow = screen.getByTestId('printer-row-idle-printer');

    // Wait for settings to load, then check that flash class is not applied
    await waitFor(() => {
      expect(tableRow).not.toHaveClass('printer-table-row-idle-flash');
    });
  });

  test('applies flash classes for idle printers when notifications enabled', async () => {
    // Mock settings with idle notifications enabled
    mockSettings({
      showTemperatures: true,
      showProgress: true,
      idleNotifications: true,
      errorNotifications: true,
    });

    const idlePrinter = {
      ...mockPrinters[0],
      status: 'idle' as const,
    };

    renderWithSettings(
      <PrinterTable
        printers={[idlePrinter]}
        onPause={mockHandlers.onPause}
        onResume={mockHandlers.onResume}
        onStop={mockHandlers.onStop}
      />
    );

    const tableRow = screen.getByTestId('printer-row-test-printer-1');

    // Wait for settings to load and flash class to be applied
    await waitFor(() => {
      expect(tableRow).toHaveClass('printer-table-row-idle-flash');
    });
  });

  test('applies flash classes for error printers when notifications enabled', async () => {
    // Mock settings with error notifications enabled
    mockSettings({
      showTemperatures: true,
      showProgress: true,
      idleNotifications: false,
      errorNotifications: true,
    });

    const errorPrinter = {
      ...mockPrinters[0],
      status: 'error' as const,
      error: {
        printError: 1,
        errorCode: 12345,
        stage: 3,
        lifecycle: 'printing',
        gcodeState: 'pause',
        message: 'Test error',
      },
    };

    renderWithSettings(
      <PrinterTable
        printers={[errorPrinter]}
        onPause={mockHandlers.onPause}
        onResume={mockHandlers.onResume}
        onStop={mockHandlers.onStop}
      />
    );

    const tableRow = screen.getByTestId('printer-row-test-printer-1');

    // Wait for settings to load and flash class to be applied
    await waitFor(() => {
      expect(tableRow).toHaveClass('printer-table-row-error-flash');
    });

    // Verify error message is displayed
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  test('does not apply flash classes for printing printers', () => {
    renderWithSettings(
      <PrinterTable printers={mockPrinters} {...mockHandlers} />
    );

    const tableRow = screen.getByTestId('printer-row-test-printer-1');
    expect(tableRow).not.toHaveClass('printer-table-row-idle-flash');
    expect(tableRow).not.toHaveClass('printer-table-row-error-flash');
  });
});
