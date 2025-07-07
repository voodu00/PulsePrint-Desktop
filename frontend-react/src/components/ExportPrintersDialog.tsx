import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import {
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Save,
} from 'lucide-react';
import { ImportService } from '../services/ImportService';
import { TauriMqttService } from '../services/TauriMqttService';
import { ExportOptions, ExportResult, ImportFileFormat } from '../types/import';
import {
  getFormatIcon,
  getFormatColor,
  getFormatDescription,
} from '../utils/formatUtils';
import { Logger } from '../utils/logger';

interface ExportPrintersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  printerService: TauriMqttService;
}

export const ExportPrintersDialog: React.FC<ExportPrintersDialogProps> = ({
  isOpen,
  onClose,
  printerService,
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeTimestamps: false,
    prettyFormat: true,
  });
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const importService = useMemo(
    () => new ImportService(printerService),
    [printerService]
  );
  const printers = printerService.getPrinters();

  const handleExport = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await importService.exportPrinters(exportOptions);
      setExportResult(result);

      if (!result.success) {
        setError(result.error || 'Export failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsLoading(false);
    }
  }, [exportOptions, importService]);

  const handleDownload = useCallback(() => {
    if (!exportResult || !exportResult.success) {
      return;
    }

    const blob = new Blob([exportResult.data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportResult]);

  const handleCopy = useCallback(async () => {
    if (!exportResult || !exportResult.success) {
      return;
    }

    try {
      await navigator.clipboard.writeText(exportResult.data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      Logger.error('Failed to copy to clipboard:', err);
    }
  }, [exportResult]);

  const handleClose = useCallback(() => {
    setExportResult(null);
    setError(null);
    setIsLoading(false);
    setCopied(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} className="max-w-2xl">
      <DialogContent className="p-6">
        <DialogHeader>
          <DialogTitle>Export Printer Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Error:</span>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {!exportResult ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Export Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {printers.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Printers ready to export
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Export Options</h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      File Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        ['json', 'csv', 'yaml', 'txt'] as ImportFileFormat[]
                      ).map(format => (
                        <button
                          key={format}
                          onClick={() =>
                            setExportOptions(prev => ({ ...prev, format }))
                          }
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            exportOptions.format === format
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                              {format.toUpperCase()}
                            </span>
                            <Badge className={getFormatColor(format)}>
                              {getFormatIcon(format)}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getFormatDescription(format)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">
                        Include Timestamps
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Add last update timestamps to exported data
                      </p>
                    </div>
                    <Switch
                      checked={exportOptions.includeTimestamps}
                      onCheckedChange={checked =>
                        setExportOptions(prev => ({
                          ...prev,
                          includeTimestamps: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Pretty Format</h4>
                      <p className="text-sm text-muted-foreground">
                        Format output for better readability (JSON only)
                      </p>
                    </div>
                    <Switch
                      checked={exportOptions.prettyFormat}
                      onCheckedChange={checked =>
                        setExportOptions(prev => ({
                          ...prev,
                          prettyFormat: checked,
                        }))
                      }
                      disabled={exportOptions.format !== 'json'}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={isLoading || printers.length === 0}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export Printers
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                {exportResult.success ? (
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600 dark:text-red-400" />
                )}
                <h3 className="text-lg font-semibold mb-2">
                  Export {exportResult.success ? 'Complete' : 'Failed'}
                </h3>
                {exportResult.success && (
                  <p className="text-sm text-muted-foreground">
                    Your printer settings have been exported successfully
                  </p>
                )}
              </div>

              {exportResult.success && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Export Details</span>
                        <Badge className={getFormatColor(exportOptions.format)}>
                          {getFormatIcon(exportOptions.format)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Filename:</span>
                          <span className="font-mono">
                            {exportResult.filename}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span>
                            {(exportResult.data.length / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Printers:</span>
                          <span>{printers.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <pre className="text-xs overflow-x-auto max-h-40 overflow-y-auto">
                          {exportResult.data.length > 1000
                            ? exportResult.data.substring(0, 1000) + '\n...'
                            : exportResult.data}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button onClick={handleDownload} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Download File
                    </Button>
                    <Button variant="outline" onClick={handleCopy}>
                      {copied ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                  </div>
                </>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
