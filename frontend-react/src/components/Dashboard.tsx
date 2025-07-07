import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Settings,
  Printer as PrinterIcon,
  Loader2,
  Upload,
  Download,
} from 'lucide-react';
import PrinterCard from './PrinterCard';
import StatisticsOverview from './StatisticsOverview';

import { TauriMqttService } from '../services/TauriMqttService';
import { AddPrinterDialog } from './AddPrinterDialog';
import { ImportPrintersDialog } from './ImportPrintersDialog';
import { ExportPrintersDialog } from './ExportPrintersDialog';
import {
  Printer,
  PrinterStatistics,
  PrinterServiceEvent,
} from '../types/printer';
import { ImportResult } from '../types/import';
import { Logger } from '../utils/logger';

interface DashboardProps {
  onShowSettings: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onShowSettings }) => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [statistics, setStatistics] = useState<PrinterStatistics>({
    total: 0,
    online: 0,
    printing: 0,
    idle: 0,
    error: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [printerService] = useState(() => new TauriMqttService());
  const [showAddPrinter, setShowAddPrinter] = useState(false);
  const [showImportPrinters, setShowImportPrinters] = useState(false);
  const [showExportPrinters, setShowExportPrinters] = useState(false);

  const handlePrinterServiceEvent = useCallback(
    (event: PrinterServiceEvent) => {
      switch (event.type) {
        case 'initialized':
        case 'updated':
          const printersArray = Array.isArray(event.data)
            ? event.data
            : [event.data];

          // For 'updated' events, we should always use the full printer list from the service
          // to avoid partial updates that could cause display issues
          if (event.type === 'updated') {
            const fullPrinterList = printerService.getPrinters();
            setPrinters(fullPrinterList);
          } else {
            setPrinters(printersArray);
          }

          setStatistics(printerService.getStatistics());
          setLastUpdate(new Date());
          if (event.type === 'initialized') {
            setIsLoading(false);
          }
          break;
        case 'printer_added':
          // This event will be followed by an 'updated' event
          break;
        case 'printer_paused':
        case 'printer_resumed':
        case 'printer_stopped':
          // These will be handled by the updated event that follows
          break;
      }
    },
    [printerService]
  );

  const handlePause = useCallback(
    async (printerId: string) => {
      try {
        await printerService.pausePrint(printerId);
      } catch (error) {
        Logger.error('Failed to pause print:', error);
      }
    },
    [printerService]
  );

  const handleResume = useCallback(
    async (printerId: string) => {
      try {
        await printerService.resumePrint(printerId);
      } catch (error) {
        Logger.error('Failed to resume print:', error);
      }
    },
    [printerService]
  );

  const handleStop = useCallback(
    async (printerId: string) => {
      if (window.confirm('Are you sure you want to stop this print job?')) {
        try {
          await printerService.stopPrint(printerId);
        } catch (error) {
          Logger.error('Failed to stop print:', error);
        }
      }
    },
    [printerService]
  );

  const handleAddPrinter = useCallback(() => {
    setShowAddPrinter(true);
  }, []);

  const handleAddPrinterSubmit = useCallback(
    async (printer: {
      name: string;
      model: string;
      ip: string;
      accessCode: string;
      serial: string;
    }) => {
      try {
        await printerService.addPrinter({
          name: printer.name,
          model: printer.model,
          ip: printer.ip,
          accessCode: printer.accessCode,
          serial: printer.serial,
        });
      } catch (error) {
        Logger.error('Failed to add printer:', error);
      }
    },
    [printerService]
  );

  const handleAddPrinterCancel = useCallback(() => {
    setShowAddPrinter(false);
  }, []);

  const handleImportPrinters = useCallback(() => {
    setShowImportPrinters(true);
  }, []);

  const handleImportPrintersClose = useCallback(() => {
    setShowImportPrinters(false);
  }, []);

  const handleImportComplete = useCallback(
    async (result: ImportResult) => {
      if (result.success && result.imported > 0 && !result.validateOnly) {
        // No need to refresh - the addPrinter events have already updated the local state
        // Just update statistics to reflect the new printer count
        setStatistics(printerService.getStatistics());
        setLastUpdate(new Date());
      }
    },
    [printerService]
  );

  const handleExportPrinters = useCallback(() => {
    setShowExportPrinters(true);
  }, []);

  const handleExportPrintersClose = useCallback(() => {
    setShowExportPrinters(false);
  }, []);

  const handleSettings = useCallback(() => {
    onShowSettings();
  }, [onShowSettings]);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        printerService.addEventListener(handlePrinterServiceEvent);
        await printerService.initialize();
      } catch (error) {
        Logger.error('Failed to initialize dashboard:', error);
        setIsLoading(false);
      }
    };

    initializeDashboard();

    // Cleanup on unmount
    return () => {
      printerService.removeEventListener(handlePrinterServiceEvent);
      printerService.destroy();
    };
  }, [printerService, handlePrinterServiceEvent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="card p-8 text-center">
            <PrinterIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Loading Dashboard...</h3>
            <p className="text-muted-foreground mb-4">
              Initializing printer connections...
            </p>
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              PulsePrint Desktop
            </h1>
            <p className="text-muted-foreground">
              Monitor and control your 3D printers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAddPrinter} className="btn btn-default">
              <Plus className="w-4 h-4 mr-2" />
              Add Printer
            </button>
            <button onClick={handleImportPrinters} className="btn btn-outline">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </button>
            <button
              onClick={handleExportPrinters}
              className="btn btn-outline"
              disabled={printers.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button onClick={handleSettings} className="btn btn-outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
        </div>

        {/* Add Printer Dialog */}
        <AddPrinterDialog
          isOpen={showAddPrinter}
          onClose={handleAddPrinterCancel}
          onAddPrinter={handleAddPrinterSubmit}
        />

        {/* Import Printers Dialog */}
        <ImportPrintersDialog
          isOpen={showImportPrinters}
          onClose={handleImportPrintersClose}
          printerService={printerService}
          onImportComplete={handleImportComplete}
        />

        {/* Export Printers Dialog */}
        <ExportPrintersDialog
          isOpen={showExportPrinters}
          onClose={handleExportPrintersClose}
          printerService={printerService}
        />

        {/* Statistics Overview */}
        <StatisticsOverview statistics={statistics} />

        {/* Last Update Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-6">
          <span>
            Last updated:{' '}
            {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs">Real-time Updates</span>
            <div className="badge badge-outline">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
              Live
            </div>
          </div>
        </div>

        {/* Printer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {printers.length === 0 ? (
            <div className="col-span-full">
              <div className="card p-8 text-center">
                <PrinterIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Printers Added
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add your first printer to start monitoring your 3D prints.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleAddPrinter}
                    className="btn btn-default"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Printer
                  </button>
                  <button
                    onClick={handleImportPrinters}
                    className="btn btn-outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Printers
                  </button>
                </div>
              </div>
            </div>
          ) : (
            printers.map(printer => (
              <PrinterCard
                key={printer.id}
                printer={printer}
                onPause={handlePause}
                onResume={handleResume}
                onStop={handleStop}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
