import { SettingsState } from '../../types/settings';

export class TauriMqttService {
  private static instance: TauriMqttService;

  static getInstance(): TauriMqttService {
    if (!TauriMqttService.instance) {
      TauriMqttService.instance = new TauriMqttService();
    }
    return TauriMqttService.instance;
  }

  // Settings methods
  getSettings = jest.fn().mockResolvedValue({
    darkMode: false,
    showTemperatures: true,
    idleNotifications: false,
    errorNotifications: true,
    viewMode: 'card' as const,
  } as SettingsState);

  saveSettings = jest.fn().mockResolvedValue(undefined);

  // Event listener methods (matching the new interface)
  addListener = jest.fn();
  removeListener = jest.fn();

  // Printer methods
  initialize = jest.fn().mockResolvedValue(undefined);
  destroy = jest.fn();
  getPrinters = jest.fn().mockResolvedValue([]);
  getAllPrinters = jest.fn().mockReturnValue([]);
  getPrinter = jest.fn().mockReturnValue(undefined);
  connectPrinter = jest.fn().mockResolvedValue(undefined);
  disconnectPrinter = jest.fn().mockResolvedValue(undefined);
  sendPrintCommand = jest.fn().mockResolvedValue(undefined);
  pausePrint = jest.fn().mockResolvedValue(undefined);
  resumePrint = jest.fn().mockResolvedValue(undefined);
  stopPrint = jest.fn().mockResolvedValue(undefined);

  // Deprecated methods for backward compatibility
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
}
