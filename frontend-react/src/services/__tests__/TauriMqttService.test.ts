/* eslint-disable max-lines-per-function */
import { TauriMqttService } from '../TauriMqttService';

// Mock Tauri APIs
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('TauriMqttService', () => {
  let service: TauriMqttService;
  let mockInvoke: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoke = require('@tauri-apps/api/core').invoke;
    service = TauriMqttService.getInstance();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Printer Status Detection', () => {
    test('should detect printer status correctly', async () => {
      const mockPrinters = [
        {
          id: 'test-printer',
          name: 'Test Printer',
          model: 'X1C',
          ip: '192.168.1.100',
          accessCode: 'test123',
          serial: 'TEST123',
          status: 'idle' as const,
          temperatures: { nozzle: 25, bed: 25, chamber: 25 },
          lastUpdate: new Date(),
          print: null,
          error: null,
        },
      ];

      mockInvoke.mockResolvedValue(mockPrinters);
      const printers = await service.getPrinters();

      expect(printers[0].status).toBe('idle');
    });
  });

  describe('Statistics Calculation', () => {
    test('should calculate statistics correctly', async () => {
      const mockPrinters = [
        {
          id: 'printer-1',
          name: 'Printer 1',
          model: 'X1C',
          ip: '192.168.1.100',
          accessCode: 'test123',
          serial: 'TEST001',
          status: 'printing' as const,
          temperatures: { nozzle: 220, bed: 60, chamber: 35 },
          lastUpdate: new Date(),
          print: null,
          error: null,
        },
        {
          id: 'printer-2',
          name: 'Printer 2',
          model: 'A1',
          ip: '192.168.1.101',
          accessCode: 'test456',
          serial: 'TEST002',
          status: 'idle' as const,
          temperatures: { nozzle: 25, bed: 25, chamber: 25 },
          lastUpdate: new Date(),
          print: null,
          error: null,
        },
        {
          id: 'printer-3',
          name: 'Printer 3',
          model: 'X1C',
          ip: '192.168.1.102',
          accessCode: 'test789',
          serial: 'TEST003',
          status: 'error' as const,
          temperatures: { nozzle: 25, bed: 25, chamber: 25 },
          lastUpdate: new Date(),
          print: null,
          error: {
            printError: 1,
            errorCode: 12345,
            stage: 3,
            lifecycle: 'printing',
            gcodeState: 'pause',
            message: 'Filament runout detected',
          },
        },
        {
          id: 'printer-4',
          name: 'Printer 4',
          model: 'A1',
          ip: '192.168.1.103',
          accessCode: 'test101',
          serial: 'TEST004',
          status: 'offline' as const,
          temperatures: { nozzle: 0, bed: 0, chamber: 0 },
          lastUpdate: new Date(),
          print: null,
          error: null,
        },
      ];

      mockInvoke.mockResolvedValue(mockPrinters);
      await service.getPrinters();

      const stats = service.getStatistics();

      expect(stats.total).toBe(4);
      expect(stats.printing).toBe(1);
      expect(stats.idle).toBe(1);
      expect(stats.error).toBe(1);
      expect(stats.online).toBe(0); // None have 'online' status
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid printer data gracefully', async () => {
      // Test with minimal/invalid data - mock the backend to return invalid data
      const invalidPrinters = [
        {
          id: 'invalid-printer',
          name: 'Invalid Printer',
          model: '',
          ip: '',
          accessCode: '',
          serial: '',
          status: 'offline' as const,
          temperatures: { nozzle: 0, bed: 0, chamber: 0 },
          lastUpdate: new Date(),
          print: null,
          error: null,
        },
      ];

      mockInvoke.mockResolvedValue(invalidPrinters);
      const printers = await service.getPrinters();

      expect(printers).toHaveLength(1);
      expect(printers[0].status).toBe('offline');
    });

    test('should handle initialization errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Backend initialization failed'));

      await expect(service.initialize()).resolves.not.toThrow();
      // Since we changed the initialize method to not throw, but rather log and continue
      // we just verify it doesn't throw and completes successfully
    });
  });

  describe('Printer Management', () => {
    test('should add printer successfully', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      const params = {
        name: 'New Printer',
        model: 'X1C',
        ip: '192.168.1.200',
        accessCode: 'newcode',
        serial: 'NEW001',
      };

      await expect(service.addPrinter(params)).resolves.not.toThrow();
      expect(mockInvoke).toHaveBeenCalledWith('add_printer', params);
    });

    test('should handle add printer failure', async () => {
      mockInvoke.mockRejectedValue(new Error('Failed to add printer'));

      const params = {
        name: 'New Printer',
        model: 'X1C',
        ip: '192.168.1.200',
        accessCode: 'newcode',
        serial: 'NEW001',
      };

      await expect(service.addPrinter(params)).rejects.toThrow(
        'Failed to add printer'
      );
    });

    test('should remove printer successfully', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      await expect(service.removePrinter('test-id')).resolves.not.toThrow();
      expect(mockInvoke).toHaveBeenCalledWith('remove_printer', {
        printerId: 'test-id',
      });
    });

    test('should handle printer removal event', async () => {
      const eventListener = jest.fn();
      service.addEventListener(eventListener);

      // Mock initial printers
      const mockPrinters = [
        {
          id: 'test-printer',
          name: 'Test Printer',
          model: 'X1C',
          ip: '192.168.1.100',
          accessCode: 'test123',
          serial: 'TEST123',
          status: 'idle' as const,
          temperatures: { nozzle: 25, bed: 25, chamber: 25 },
          lastUpdate: new Date(),
          print: null,
          error: null,
        },
      ];

      mockInvoke.mockResolvedValue(mockPrinters);
      const printers = await service.getPrinters();
      expect(printers).toHaveLength(1);

      // Mock removal
      mockInvoke.mockResolvedValue({ success: true });
      await service.removePrinter('test-printer');

      // Verify removal was called
      expect(mockInvoke).toHaveBeenCalledWith('remove_printer', {
        printerId: 'test-printer',
      });
    });
  });

  describe('Data Conversion', () => {
    test('should convert print job data correctly', async () => {
      const mockPrinters = [
        {
          id: 'test-printer',
          name: 'Test Printer',
          model: 'X1C',
          ip: '192.168.1.100',
          accessCode: 'test123',
          serial: 'TEST123',
          status: 'printing' as const,
          temperatures: { nozzle: 220, bed: 60, chamber: 35 },
          print: {
            progress: 42.5,
            fileName: 'awesome_model.3mf',
            layerCurrent: 150,
            layerTotal: 350,
            timeRemaining: 3600,
            estimatedTotalTime: 8400,
          },
          lastUpdate: new Date(),
          error: null,
        },
      ];

      mockInvoke.mockResolvedValue(mockPrinters);
      const printers = await service.getPrinters();
      const converted = printers[0];

      expect(converted.print).toEqual({
        progress: 42.5,
        fileName: 'awesome_model.3mf',
        layerCurrent: 150,
        layerTotal: 350,
        timeRemaining: 3600,
        estimatedTotalTime: 8400,
      });
    });

    test('should handle error data correctly', async () => {
      const mockPrinters = [
        {
          id: 'test-printer',
          name: 'Test Printer',
          model: 'X1C',
          ip: '192.168.1.100',
          accessCode: 'test123',
          serial: 'TEST123',
          status: 'error' as const,
          temperatures: { nozzle: 25, bed: 25, chamber: 25 },
          print: null,
          error: {
            printError: 1,
            errorCode: 12345,
            stage: 3,
            lifecycle: 'printing',
            gcodeState: 'pause',
            message: 'Filament runout detected',
          },
          lastUpdate: new Date(),
        },
      ];

      mockInvoke.mockResolvedValue(mockPrinters);
      const printers = await service.getPrinters();
      const converted = printers[0];

      expect(converted.error).toEqual({
        printError: 1,
        errorCode: 12345,
        stage: 3,
        lifecycle: 'printing',
        gcodeState: 'pause',
        message: 'Filament runout detected',
      });
    });

    test('should handle minimal printer data', async () => {
      const mockPrinters = [
        {
          id: 'minimal-printer',
          name: 'Minimal Printer',
          model: '',
          ip: '',
          accessCode: '',
          serial: '',
          status: 'offline' as const,
          temperatures: { nozzle: 0, bed: 0, chamber: 0 },
          print: null,
          error: null,
          lastUpdate: new Date(),
        },
      ];

      mockInvoke.mockResolvedValue(mockPrinters);
      const printers = await service.getPrinters();
      const converted = printers[0];

      expect(converted.id).toBe('minimal-printer');
      expect(converted.name).toBe('Minimal Printer');
      expect(converted.status).toBe('offline');
    });
  });
});
