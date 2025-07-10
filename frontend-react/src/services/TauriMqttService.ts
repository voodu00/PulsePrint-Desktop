import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import { Printer, PrinterServiceEvent } from '../types/printer';
import { SettingsState } from '../types/settings';

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

  // Event listener management
  addListener(listener: (printers: Printer[]) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (printers: Printer[]) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Event listener management for PrinterServiceEvent
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

  // Printer management methods
  async connectPrinter(config: any): Promise<void> {
    await invoke('add_printer', config);
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
    await invoke('add_printer', printer);
    // Get updated printer list and notify
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

  async getPrinters(): Promise<Printer[]> {
    try {
      const printers = await invoke<Printer[]>('get_all_printers');
      if (Array.isArray(printers)) {
        printers.forEach(printer => {
          this.printers.set(printer.id, printer);
        });
        return printers;
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

  // Initialize the service
  async initialize(): Promise<void> {
    try {
      // Get current printers from backend
      const printers = await this.getPrinters();

      // Clear local state and start fresh
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

  // Get current printers
  getAllPrinters(): Printer[] {
    return Array.from(this.printers.values());
  }

  getPrinter(id: string): Printer | undefined {
    return this.printers.get(id);
  }

  // Clean up
  destroy(): void {
    this.printers.clear();
    this.listeners = [];
    this.eventListeners = [];
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
