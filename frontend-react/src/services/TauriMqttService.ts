import { invoke } from '@tauri-apps/api/core';
import {
  Printer,
  PrinterServiceEvent,
  PrinterStatus,
  AddPrinterParams,
  TauriPrintJobData,
  TauriFilamentData,
  TauriErrorData,
} from '../types/printer';
import { TauriPrinterData } from '../types/import';
import { Logger } from '../utils/logger';

export interface TauriPrinterConfig extends TauriPrinterData {
  id: string;
  name: string;
  model: string;
  ip: string;
  access_code: string;
  serial: string;
}

export interface TauriPrintCommand {
  action: string;
}

export class TauriMqttService {
  private listeners: ((event: PrinterServiceEvent) => void)[] = [];
  private printers: Map<string, Printer> = new Map();
  private static readonly STORAGE_KEY = 'printpulse-printer-configs';

  constructor() {
    this.setupEventListeners();
  }

  private async setupEventListeners() {
    // Set up Tauri event listeners for real-time MQTT updates from actual printers
    try {
      const { listen } = await import('@tauri-apps/api/event');

      // Listen for printer status updates from the Rust backend
      await listen('printer-update', event => {
        const printerData = event.payload as TauriPrinterData;
        const printer = this.convertTauriPrinterToFrontend(printerData);

        // Update local state
        this.printers.set(printer.id, printer);

        // Notify listeners with updated printer data
        this.notifyListeners({
          type: 'updated',
          data: Array.from(this.printers.values()),
        });
      });

      // Listen for printer removal events
      await listen('printer-removed', event => {
        const printerId = event.payload as string;
        const printer = this.printers.get(printerId);

        if (printer) {
          this.printers.delete(printerId);

          this.notifyListeners({
            type: 'printer_removed',
            data: printer,
          });

          this.notifyListeners({
            type: 'updated',
            data: Array.from(this.printers.values()),
          });
        }
      });
    } catch (error) {
      Logger.error('Failed to setup Tauri event listeners:', error);
    }
  }

  private convertTauriPrinterToFrontend(
    tauriPrinter: TauriPrinterData
  ): Printer {
    // Map Rust status enum to frontend status
    const mapStatus = (rustStatus?: string): PrinterStatus => {
      if (!rustStatus) return 'offline';

      switch (rustStatus.toLowerCase()) {
        case 'idle':
          return 'idle';
        case 'printing':
          return 'printing';
        case 'paused':
          return 'paused';
        case 'error':
          return 'error';
        case 'connecting':
          return 'connecting';
        case 'offline':
        default:
          return 'offline';
      }
    };

    // Convert print job if present
    const convertPrintJob = (printData?: TauriPrintJobData) => {
      if (!printData) return null;

      return {
        progress: printData.progress || 0,
        fileName: printData.file_name || 'Unknown',
        layerCurrent: printData.layer_current || 0,
        layerTotal: printData.layer_total || 0,
        timeRemaining: printData.time_remaining || 0,
        estimatedTotalTime: printData.estimated_total_time || 0,
      };
    };

    // Convert filament info if present
    const convertFilamentInfo = (filamentData?: TauriFilamentData) => {
      if (!filamentData) return null;

      return {
        type: filamentData.type || 'Unknown',
        color: filamentData.color || 'Unknown',
        remaining: filamentData.remaining || 0,
      };
    };

    // Convert error info if present
    const convertErrorInfo = (errorData?: TauriErrorData) => {
      if (!errorData) return null;

      return {
        printError: errorData.print_error || 0,
        errorCode: errorData.error_code || 0,
        stage: errorData.stage || 0,
        lifecycle: errorData.lifecycle || 'unknown',
        gcodeState: errorData.gcode_state || 'unknown',
        message: errorData.message || 'Unknown error',
      };
    };

    return {
      id: tauriPrinter.id,
      name: tauriPrinter.name,
      model: tauriPrinter.model,
      ip: tauriPrinter.ip,
      accessCode: tauriPrinter.access_code,
      serial: tauriPrinter.serial,
      status: mapStatus(tauriPrinter.status),
      temperatures: {
        nozzle: tauriPrinter.temperatures?.nozzle || 0,
        bed: tauriPrinter.temperatures?.bed || 0,
        chamber: tauriPrinter.temperatures?.chamber || 0,
      },
      print: convertPrintJob(tauriPrinter.print),
      filament: convertFilamentInfo(tauriPrinter.filament),
      error: convertErrorInfo(tauriPrinter.error),
      lastUpdate: tauriPrinter.last_update
        ? new Date(tauriPrinter.last_update)
        : new Date(),
    };
  }

  private convertFrontendToTauriConfig(
    params: AddPrinterParams
  ): TauriPrinterConfig {
    return {
      id: params.serial, // Use serial as ID for uniqueness
      name: params.name,
      model: params.model || 'Unknown Model',
      ip: params.ip,
      access_code: params.accessCode,
      serial: params.serial,
    };
  }

  private loadPrintersFromStorage(): void {
    try {
      const stored = localStorage.getItem(TauriMqttService.STORAGE_KEY);
      if (stored) {
        const configs = JSON.parse(stored) as TauriPrinterConfig[];
        for (const config of configs) {
          const printer = this.convertTauriPrinterToFrontend(config);
          this.printers.set(printer.id, printer);
        }
      }
    } catch (error) {
      Logger.error('Failed to load printers from localStorage:', error);
    }
  }

  private savePrintersToStorage(): void {
    try {
      const printerConfigs = Array.from(this.printers.values()).map(
        printer => ({
          id: printer.id,
          name: printer.name,
          model: printer.model,
          ip: printer.ip,
          access_code: printer.accessCode,
          serial: printer.serial,
        })
      );
      localStorage.setItem(
        TauriMqttService.STORAGE_KEY,
        JSON.stringify(printerConfigs)
      );
    } catch (error) {
      Logger.error('Failed to save printers to localStorage:', error);
    }
  }

  async addPrinter(params: AddPrinterParams): Promise<void> {
    // Check if printer with same serial already exists
    const existingPrinter = Array.from(this.printers.values()).find(
      p => p.serial === params.serial
    );

    if (existingPrinter) {
      // Printer already exists, skip duplicate
      return;
    }

    const config = this.convertFrontendToTauriConfig(params);
    await invoke('add_printer', { config });

    // Create printer object for local state
    const newPrinter = this.convertTauriPrinterToFrontend(config);

    // Update local state
    this.printers.set(newPrinter.id, newPrinter);

    // Save to localStorage immediately
    this.savePrintersToStorage();

    // Notify listeners
    this.notifyListeners({
      type: 'printer_added',
      data: newPrinter,
    });

    this.notifyListeners({
      type: 'updated',
      data: Array.from(this.printers.values()),
    });
  }

  async removePrinter(printerId: string): Promise<void> {
    // Get printer before removing
    const printer = this.printers.get(printerId);

    await invoke('remove_printer', { printerId });

    // Update local state
    this.printers.delete(printerId);

    // Save to localStorage
    this.savePrintersToStorage();

    // Notify listeners if printer was found
    if (printer) {
      this.notifyListeners({
        type: 'printer_removed',
        data: printer,
      });

      this.notifyListeners({
        type: 'updated',
        data: Array.from(this.printers.values()),
      });
    }
  }

  async getAllPrinters(): Promise<Printer[]> {
    const tauriPrinters = await invoke<TauriPrinterData[]>('get_all_printers');
    return tauriPrinters.map(printer =>
      this.convertTauriPrinterToFrontend(printer)
    );
  }

  async pausePrint(printerId: string): Promise<void> {
    await invoke('pause_printer', { printerId });
  }

  async resumePrint(printerId: string): Promise<void> {
    await invoke('resume_printer', { printerId });
  }

  async stopPrint(printerId: string): Promise<void> {
    await invoke('stop_printer', { printerId });
  }

  async sendCommand(
    printerId: string,
    command: TauriPrintCommand
  ): Promise<void> {
    await invoke('send_printer_command', { printerId, command });
  }

  // Event listener management
  addEventListener(listener: (event: PrinterServiceEvent) => void): void {
    this.listeners.push(listener);
  }

  removeEventListener(listener: (event: PrinterServiceEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(event: PrinterServiceEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  // Initialize the service
  async initialize(): Promise<void> {
    try {
      // Get current printers from backend (this is the source of truth)
      const backendPrinters =
        await invoke<TauriPrinterData[]>('get_all_printers');

      // Clear local state and start fresh
      this.printers.clear();

      // Deduplicate printers by serial number (keep the first occurrence)
      const uniquePrinters = new Map<string, TauriPrinterData>();
      for (const tauriPrinter of backendPrinters) {
        if (!uniquePrinters.has(tauriPrinter.serial)) {
          uniquePrinters.set(tauriPrinter.serial, tauriPrinter);
        }
      }

      // If we found duplicates, clean them up
      if (uniquePrinters.size < backendPrinters.length) {
        // Found duplicates, cleaning up...

        // Remove all printers from backend
        for (const tauriPrinter of backendPrinters) {
          try {
            await invoke('remove_printer', { printer_id: tauriPrinter.id });
          } catch (error) {
            Logger.error(
              `Failed to remove duplicate printer ${tauriPrinter.id}:`,
              error
            );
          }
        }

        // Re-add only unique printers
        const uniquePrintersArray = Array.from(uniquePrinters.values());
        for (const tauriPrinter of uniquePrintersArray) {
          try {
            await invoke('add_printer', { config: tauriPrinter });
            const printer = this.convertTauriPrinterToFrontend(tauriPrinter);
            this.printers.set(printer.id, printer);
          } catch (error) {
            Logger.error(
              `Failed to re-add printer ${tauriPrinter.name}:`,
              error
            );
          }
        }
      } else {
        // No duplicates, just convert to frontend format
        for (const tauriPrinter of backendPrinters) {
          const printer = this.convertTauriPrinterToFrontend(tauriPrinter);
          this.printers.set(printer.id, printer);
        }
      }

      // Update localStorage to match backend state
      this.savePrintersToStorage();

      // Initialized successfully

      this.notifyListeners({
        type: 'initialized',
        data: Array.from(this.printers.values()),
      });
    } catch (error) {
      Logger.error('Failed to initialize TauriMqttService:', error);

      // Fallback to localStorage if backend fails
      this.loadPrintersFromStorage();

      this.notifyListeners({
        type: 'initialized',
        data: Array.from(this.printers.values()),
      });
    }
  }

  // Get current printer data
  getPrinters(): Printer[] {
    return Array.from(this.printers.values());
  }

  getPrinter(id: string): Printer | undefined {
    return this.printers.get(id);
  }

  // Additional methods expected by Dashboard
  getStatistics() {
    const printers = Array.from(this.printers.values());
    return {
      total: printers.length,
      online: printers.filter(p => p.status !== 'offline').length,
      printing: printers.filter(p => p.status === 'printing').length,
      idle: printers.filter(p => p.status === 'idle').length,
      error: printers.filter(p => p.status === 'error').length,
    };
  }

  // Cleanup method
  destroy() {
    // Clean up any resources if needed
    this.listeners = [];
    this.printers.clear();
  }
}
