import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import Database from '@tauri-apps/plugin-sql';
import { Printer, PrinterServiceEvent } from '../types/printer';
import { SettingsState } from '../types/settings';

// Simple UUID v4 generator that works in all environments
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface PrinterStatistics {
  total: number;
  online: number;
  printing: number;
  idle: number;
  error: number;
}

export class TauriMqttService {
  private static instance: TauriMqttService;
  private printers: Map<string, Printer> = new Map();
  private listeners: ((printers: Printer[]) => void)[] = [];
  private eventListeners: ((event: PrinterServiceEvent) => void)[] = [];
  private db: Database | null = null;
  private unlistenFunctions: (() => void)[] = [];

  private constructor() {}

  static getInstance(): TauriMqttService {
    if (!TauriMqttService.instance) {
      TauriMqttService.instance = new TauriMqttService();
    }
    return TauriMqttService.instance;
  }

  private async getDatabase(): Promise<Database> {
    if (!this.db) {
      this.db = await Database.load('sqlite:pulseprint.db');
    }
    return this.db;
  }

  async getSettings(): Promise<SettingsState> {
    const db = await this.getDatabase();

    try {
      const result = await db.select<{ value: string }[]>(
        'SELECT value FROM user_preferences WHERE key = ?1',
        ['app_settings']
      );

      if (result.length > 0) {
        return JSON.parse(result[0].value);
      }
    } catch (error) {
      console.warn('Failed to get settings from database:', error);
    }

    // Return default settings if none exist
    return {
      darkMode: false,
      showTemperatures: true,
      idleNotifications: false,
      errorNotifications: true,
      soundNotifications: false,
      showProgress: true,
      compactView: false,
      viewMode: 'card' as const,
    };
  }

  async saveSettings(settings: SettingsState): Promise<void> {
    const db = await this.getDatabase();
    const settingsJson = JSON.stringify(settings);

    await db.execute(
      'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?1, ?2)',
      ['app_settings', settingsJson]
    );
  }

  addListener(listener: (printers: Printer[]) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (printers: Printer[]) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  addEventListener(listener: (event: PrinterServiceEvent) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: PrinterServiceEvent) => void): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    const printerList = Array.from(this.printers.values());
    this.listeners.forEach(listener => listener(printerList));
  }

  private notifyEventListeners(event: PrinterServiceEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  async connectPrinter(config: any): Promise<void> {
    const formattedConfig = {
      id: config.id || generateUUID(),
      name: config.name,
      model: config.model || '',
      ip: config.ip,
      access_code: config.accessCode || config.access_code,
      serial: config.serial,
    };

    await invoke('add_printer', { config: formattedConfig });
  }

  async disconnectPrinter(printerId: string): Promise<void> {
    await invoke('remove_printer', { printerId });
    this.printers.delete(printerId);
    this.notifyListeners();
  }

  async addPrinter(printer: {
    name: string;
    model?: string;
    ip: string;
    accessCode: string;
    serial: string;
  }): Promise<void> {
    const config = {
      id: generateUUID(),
      name: printer.name,
      model: printer.model || '',
      ip: printer.ip,
      access_code: printer.accessCode,
      serial: printer.serial,
    };

    await invoke('add_printer', { config });
    const printers = await this.getPrinters();
    this.notifyEventListeners({ type: 'printer_added', data: printers });
  }

  async removePrinter(printerId: string): Promise<void> {
    await invoke('remove_printer', { printerId });
    this.printers.delete(printerId);
    this.notifyListeners();
    const printers = await this.getPrinters();
    this.notifyEventListeners({ type: 'printer_removed', data: printers });
  }

  async sendPrintCommand(printerId: string, command: string): Promise<void> {
    await invoke('send_printer_command', { printerId, command });
  }

  private convertBackendPrinterToFrontend(backendPrinter: any): Printer {
    const converted: any = {
      ...backendPrinter,
      lastUpdate: new Date(
        backendPrinter.last_update || backendPrinter.lastUpdate || Date.now()
      ),
    };

    // Convert print object field names from snake_case to camelCase
    if (backendPrinter.print) {
      converted.print = {
        progress: backendPrinter.print.progress,
        fileName: backendPrinter.print.file_name,
        layerCurrent: backendPrinter.print.layer_current,
        layerTotal: backendPrinter.print.layer_total,
        timeRemaining: backendPrinter.print.time_remaining,
        estimatedTotalTime: backendPrinter.print.estimated_total_time,
      };
    }

    // Convert filament object field names if needed
    if (backendPrinter.filament) {
      converted.filament = {
        type: backendPrinter.filament.type || backendPrinter.filament['r#type'],
        color: backendPrinter.filament.color,
        remaining: backendPrinter.filament.remaining,
      };
    }

    // Convert error object field names if needed
    if (backendPrinter.error) {
      converted.error = {
        printError: backendPrinter.error.print_error,
        errorCode: backendPrinter.error.error_code,
        stage: backendPrinter.error.stage,
        lifecycle: backendPrinter.error.lifecycle,
        gcodeState: backendPrinter.error.gcode_state,
        message: backendPrinter.error.message,
      };
    }

    return converted as Printer;
  }

  async getPrinters(): Promise<Printer[]> {
    try {
      const backendPrinters = await invoke<any[]>('get_all_printers');
      if (Array.isArray(backendPrinters)) {
        const frontendPrinters = backendPrinters.map(printer =>
          this.convertBackendPrinterToFrontend(printer)
        );

        frontendPrinters.forEach(printer => {
          this.printers.set(printer.id, printer);
        });

        return frontendPrinters;
      }
      return [];
    } catch (error) {
      console.error('Failed to get printers:', error);
      return [];
    }
  }

  getStatistics(): PrinterStatistics {
    const printers = Array.from(this.printers.values());
    const stats = {
      total: printers.length,
      online: 0,
      printing: 0,
      idle: 0,
      error: 0,
    };

    printers.forEach(printer => {
      switch (printer.status) {
        case 'printing':
          stats.printing++;
          break;
        case 'idle':
          stats.idle++;
          break;
        case 'error':
          stats.error++;
          break;
        case 'connecting':
          // Count connecting printers as online
          stats.online++;
          break;
      }
    });

    return stats;
  }

  async pausePrint(printerId: string): Promise<void> {
    await invoke('pause_printer', { printerId });
    const printers = await this.getPrinters();
    this.notifyEventListeners({ type: 'printer_paused', data: printers });
  }

  async resumePrint(printerId: string): Promise<void> {
    await invoke('resume_printer', { printerId });
    const printers = await this.getPrinters();
    this.notifyEventListeners({ type: 'printer_resumed', data: printers });
  }

  async stopPrint(printerId: string): Promise<void> {
    await invoke('stop_printer', { printerId });
    const printers = await this.getPrinters();
    this.notifyEventListeners({ type: 'printer_stopped', data: printers });
  }

  async initialize(): Promise<void> {
    try {
      // Set up real-time event listeners for MQTT updates
      const unlistenPrinterUpdate = await listen('printer-update', event => {
        const backendPrinter = event.payload as any;
        const frontendPrinter =
          this.convertBackendPrinterToFrontend(backendPrinter);

        this.printers.set(frontendPrinter.id, frontendPrinter);

        this.notifyListeners();
        this.notifyEventListeners({ type: 'updated', data: frontendPrinter });
      });

      const unlistenPrinterRemoved = await listen('printer-removed', event => {
        const printerId = event.payload as string;
        this.printers.delete(printerId);

        this.notifyListeners();
        this.notifyEventListeners({ type: 'printer_removed', data: [] });
      });

      // Store unlisten functions for cleanup
      this.unlistenFunctions.push(
        unlistenPrinterUpdate,
        unlistenPrinterRemoved
      );

      const printers = await this.getPrinters();
      this.printers.clear();

      // Add printers to local state
      for (const printer of printers) {
        this.printers.set(printer.id, printer);
      }

      // Notify listeners
      this.notifyListeners();
      this.notifyEventListeners({ type: 'initialized', data: printers });
    } catch (error) {
      console.error('Failed to initialize TauriMqttService:', error);
      // Don't throw - let the app continue with empty state
    }
  }

  getAllPrinters(): Printer[] {
    return Array.from(this.printers.values());
  }

  getPrinter(id: string): Printer | undefined {
    return this.printers.get(id);
  }

  destroy(): void {
    this.listeners = [];
    this.eventListeners = [];
    this.printers.clear();

    // Clean up event listeners
    this.unlistenFunctions.forEach(unlisten => unlisten());
    this.unlistenFunctions = [];

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
