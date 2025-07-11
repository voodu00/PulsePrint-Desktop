import React, { useEffect, useRef } from 'react';
import {
  Printer,
  Thermometer,
  Layers,
  Clock,
  AlertTriangle,
  Pause,
  Play,
  Square,
  Wifi,
  WifiOff,
  Loader2,
  Info,
} from 'lucide-react';
import { Printer as PrinterType } from '../types/printer';
import { formatTime } from '../utils/formatTime';
import {
  calculateProgress,
  getProgressSourceDescription,
} from '../utils/progressCalculation';
import { useSettings } from '../contexts/SettingsContext';

interface PrinterTableProps {
  printers: PrinterType[];
  onPause: (printerId: string) => void;
  onResume: (printerId: string) => void;
  onStop: (printerId: string) => void;
}

const PrinterTableRow: React.FC<{
  printer: PrinterType;
  settings: any;
  onPause: (printerId: string) => void;
  onResume: (printerId: string) => void;
  onStop: (printerId: string) => void;
  getStatusIcon: (status: string) => React.JSX.Element;
  getStatusBadgeClass: (status: string) => string;
  renderProgressCell: (printer: PrinterType) => React.JSX.Element;
  renderFilamentCell: (printer: PrinterType) => React.JSX.Element;
  renderTemperatureCell: (printer: PrinterType) => React.JSX.Element;
  renderActionButtons: (printer: PrinterType) => React.JSX.Element;
}> = ({
  printer,
  settings,
  onPause,
  onResume,
  onStop,
  getStatusIcon,
  getStatusBadgeClass,
  renderProgressCell,
  renderFilamentCell,
  renderTemperatureCell,
  renderActionButtons,
}) => {
  const previousStatusRef = useRef<string>(printer.status);

  // Determine if row should flash based on current status and settings
  const shouldFlashIdle =
    settings.idleNotifications && printer.status === 'idle';
  const shouldFlashError =
    settings.errorNotifications && printer.status === 'error';

  // Update the ref for next comparison
  useEffect(() => {
    previousStatusRef.current = printer.status;
  }, [printer.status]);

  const rowClasses = [
    'border-b',
    'border-gray-100',
    'dark:border-gray-800',
    'hover:bg-gray-50',
    'dark:hover:bg-gray-900/50',
    'transition-colors',
  ];

  // Add flash classes if needed
  if (shouldFlashIdle) {
    rowClasses.push('printer-table-row-idle-flash');
  } else if (shouldFlashError) {
    rowClasses.push('printer-table-row-error-flash');
  }

  return (
    <tr
      key={printer.id}
      className={rowClasses.join(' ')}
      data-testid={`printer-row-${printer.id}`}
    >
      <td className="py-4 px-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{printer.name}</span>
          </div>
          {printer.model && (
            <div className="text-xs text-muted-foreground">{printer.model}</div>
          )}
          {printer.ip && (
            <div className="text-xs text-muted-foreground">{printer.ip}</div>
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
              printer.status
            )}`}
          >
            {getStatusIcon(printer.status)}
            {printer.status.charAt(0).toUpperCase() + printer.status.slice(1)}
          </span>
        </div>
        {printer.error && (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400">
            {printer.error.message}
          </div>
        )}
      </td>
      <td className="py-4 px-4">{renderProgressCell(printer)}</td>
      <td className="py-4 px-4">{renderFilamentCell(printer)}</td>
      {settings.showTemperatures && (
        <td className="py-4 px-4">{renderTemperatureCell(printer)}</td>
      )}
      <td className="py-4 px-4">{renderActionButtons(printer)}</td>
    </tr>
  );
};

const PrinterTable: React.FC<PrinterTableProps> = ({
  printers,
  onPause,
  onResume,
  onStop,
}) => {
  const { settings } = useSettings();

  const getStatusIcon = (status: string) => {
    const iconProps = { className: 'w-4 h-4' };

    switch (status) {
      case 'idle':
        return <Wifi {...iconProps} />;
      case 'printing':
        return <Play {...iconProps} />;
      case 'paused':
        return <Pause {...iconProps} />;
      case 'error':
        return <AlertTriangle {...iconProps} />;
      case 'offline':
        return <WifiOff {...iconProps} />;
      case 'connecting':
        return <Loader2 {...iconProps} className="w-4 h-4 animate-spin" />;
      default:
        return <Wifi {...iconProps} />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'idle':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'printing':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'offline':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'connecting':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const renderProgressCell = (printer: PrinterType) => {
    const isPrinting = printer.status === 'printing';
    const isPaused = printer.status === 'paused';

    if (!(isPrinting || isPaused) || !printer.print) {
      return <span className="text-muted-foreground">—</span>;
    }

    const progressCalc = calculateProgress(printer.print);
    const showProgressSource =
      progressCalc.source !== 'direct' && progressCalc.progress > 0;

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(progressCalc.progress)}%` }}
            />
          </div>
          <span className="text-sm font-medium min-w-[3rem]">
            {Math.round(progressCalc.progress)}%
          </span>
          {showProgressSource && (
            <div className="group relative">
              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                {getProgressSourceDescription(progressCalc.source)}
              </div>
            </div>
          )}
        </div>
        {/* Time remaining directly under progress bar */}
        {printer.print.timeRemaining > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatTime(printer.print.timeRemaining)} remaining</span>
          </div>
        )}
        {printer.print.fileName && (
          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
            📄 {printer.print.fileName}
          </div>
        )}
        {/* Layer information */}
        {printer.print.layerCurrent > 0 && printer.print.layerTotal > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Layers className="w-3 h-3" />
            <span>
              Layer {printer.print.layerCurrent}/{printer.print.layerTotal}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderFilamentCell = (printer: PrinterType) => {
    if (!printer.filament?.type) {
      return <span className="text-muted-foreground">—</span>;
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full border"
            style={{ backgroundColor: printer.filament.color || '#gray' }}
          />
          <span className="text-sm font-medium">{printer.filament.type}</span>
        </div>
        {printer.filament.remaining > 0 && (
          <div className="text-xs text-muted-foreground">
            {Math.round(printer.filament.remaining)}% remaining
          </div>
        )}
      </div>
    );
  };

  const renderTemperatureCell = (printer: PrinterType) => {
    if (!settings.showTemperatures) {
      return <span className="text-muted-foreground">—</span>;
    }

    const isOnline = printer.status !== 'offline';
    const hasTemperatures =
      printer.temperatures.nozzle > 0 ||
      printer.temperatures.bed > 0 ||
      printer.temperatures.chamber > 0;

    if (!isOnline || !hasTemperatures) {
      return <span className="text-muted-foreground">—</span>;
    }

    return (
      <div className="space-y-1">
        {printer.temperatures.nozzle > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <Thermometer className="w-3 h-3" />
            <span className="text-muted-foreground">N:</span>
            <span
              className={`font-medium ${
                printer.temperatures.nozzle > 150
                  ? 'text-red-600 dark:text-red-400'
                  : printer.temperatures.nozzle > 50
                    ? 'text-orange-600 dark:text-orange-400'
                    : ''
              }`}
            >
              {Math.round(printer.temperatures.nozzle)}°C
            </span>
          </div>
        )}
        {printer.temperatures.bed > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">B:</span>
            <span
              className={`font-medium ${
                printer.temperatures.bed > 80
                  ? 'text-red-600 dark:text-red-400'
                  : printer.temperatures.bed > 40
                    ? 'text-orange-600 dark:text-orange-400'
                    : ''
              }`}
            >
              {Math.round(printer.temperatures.bed)}°C
            </span>
          </div>
        )}
        {printer.temperatures.chamber > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">C:</span>
            <span
              className={`font-medium ${
                printer.temperatures.chamber > 50
                  ? 'text-orange-600 dark:text-orange-400'
                  : ''
              }`}
            >
              {Math.round(printer.temperatures.chamber)}°C
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderActionButtons = (printer: PrinterType) => {
    const isPrinting = printer.status === 'printing';
    const isPaused = printer.status === 'paused';
    const isOnline =
      printer.status !== 'offline' && printer.status !== 'connecting';

    if (!isOnline) {
      return <span className="text-muted-foreground">—</span>;
    }

    return (
      <div className="flex items-center gap-1">
        {isPrinting && (
          <>
            <button
              onClick={() => onPause(printer.id)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Pause Print"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              onClick={() => onStop(printer.id)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-red-600 dark:text-red-400"
              title="Stop Print"
            >
              <Square className="w-4 h-4" />
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button
              onClick={() => onResume(printer.id)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-green-600 dark:text-green-400"
              title="Resume Print"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => onStop(printer.id)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-red-600 dark:text-red-400"
              title="Stop Print"
            >
              <Square className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    );
  };

  if (printers.length === 0) {
    return (
      <div className="text-center py-8">
        <Printer className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Printers Added</h3>
        <p className="text-muted-foreground">
          Add your first printer to start monitoring your 3D prints.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
              Printer
            </th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
              Status
            </th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
              Progress
            </th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
              Filament
            </th>
            {settings.showTemperatures && (
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Temperatures
              </th>
            )}
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {printers.map(printer => (
            <PrinterTableRow
              key={printer.id}
              printer={printer}
              settings={settings}
              onPause={onPause}
              onResume={onResume}
              onStop={onStop}
              getStatusIcon={getStatusIcon}
              getStatusBadgeClass={getStatusBadgeClass}
              renderProgressCell={renderProgressCell}
              renderFilamentCell={renderFilamentCell}
              renderTemperatureCell={renderTemperatureCell}
              renderActionButtons={renderActionButtons}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PrinterTable;
