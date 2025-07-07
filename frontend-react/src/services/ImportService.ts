import {
  ImportablePrinter,
  ImportResult,
  ImportError,
  ImportValidationResult,
  ImportFileFormat,
  ImportOptions,
  ImportPreview,
  ExportOptions,
  ExportResult,
  RawPrinterData,
  ParsedJsonData,
} from '../types/import';
import { TauriMqttService } from './TauriMqttService';
import { AddPrinterParams } from '../types/printer';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';

export class ImportService {
  private printerService: TauriMqttService;

  constructor(printerService: TauriMqttService) {
    this.printerService = printerService;
  }

  /**
   * Detect file format based on content and filename
   */
  detectFormat(filename: string, content: string): ImportFileFormat {
    const extension = filename.split('.').pop()?.toLowerCase();

    // Try to detect by extension first
    if (extension === 'json') return 'json';
    if (extension === 'csv') return 'csv';
    if (extension === 'yaml' || extension === 'yml') return 'yaml';
    if (extension === 'txt') return 'txt';

    // Fallback to content detection
    const trimmed = content.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) return 'json';
    if (trimmed.includes(',') && trimmed.includes('\n')) return 'csv';
    if (trimmed.includes('name:') || trimmed.includes('- name:')) return 'yaml';

    return 'txt';
  }

  /**
   * Parse file content based on format
   */
  async parseFile(
    content: string,
    format: ImportFileFormat
  ): Promise<ImportValidationResult> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];
    let printers: ImportablePrinter[] = [];

    try {
      switch (format) {
        case 'json':
          printers = await this.parseJSON(content, errors);
          break;
        case 'csv':
          printers = await this.parseCSV(content, errors);
          break;
        case 'yaml':
          printers = await this.parseYAML(content, errors);
          break;
        case 'txt':
          printers = await this.parseTXT(content, errors);
          break;
        default:
          errors.push({ message: `Unsupported format: ${format}` });
      }
    } catch (error) {
      errors.push({
        message: `Failed to parse ${format.toUpperCase()} file: ${ErrorHandler.getErrorMessage(error)}`,
      });
    }

    // Validate each printer
    printers = printers
      .map((printer, index) => {
        const validation = this.validatePrinter(printer, index + 1);
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
        return validation.printer;
      })
      .filter(Boolean) as ImportablePrinter[];

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      printers,
    };
  }

  /**
   * Parse JSON format
   */
  private async parseJSON(
    content: string,
    errors: ImportError[]
  ): Promise<ImportablePrinter[]> {
    try {
      const data = JSON.parse(content) as ParsedJsonData;

      // Handle both array and object with printers array
      let printersArray: RawPrinterData[];
      if (Array.isArray(data)) {
        printersArray = data as RawPrinterData[];
      } else if (data.printers && Array.isArray(data.printers)) {
        printersArray = data.printers as RawPrinterData[];
      } else {
        errors.push({
          message:
            'JSON must contain an array of printers or an object with a "printers" array',
        });
        return [];
      }

      return printersArray
        .map((item, index) => this.normalizePrinter(item, index + 1, errors))
        .filter(Boolean) as ImportablePrinter[];
    } catch (error) {
      errors.push({
        message: `Invalid JSON: ${ErrorHandler.getErrorMessage(error)}`,
      });
      return [];
    }
  }

  /**
   * Parse CSV format
   */
  private async parseCSV(
    content: string,
    errors: ImportError[]
  ): Promise<ImportablePrinter[]> {
    const lines = this.parseCSVLines(content);
    if (lines.length === 0) {
      errors.push({ message: 'CSV file is empty' });
      return [];
    }

    const header = this.parseCSVHeader(lines[0]);
    const normalizedHeader = this.normalizeCSVHeader(header);

    if (!this.validateCSVHeader(normalizedHeader, errors)) {
      return [];
    }

    return this.parseCSVDataRows(
      lines.slice(1),
      header,
      normalizedHeader,
      errors
    );
  }

  /**
   * Parse CSV lines from content
   */
  private parseCSVLines(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Parse CSV header row
   */
  private parseCSVHeader(headerLine: string): string[] {
    return headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
  }

  /**
   * Normalize CSV header field names
   */
  private normalizeCSVHeader(header: string[]): string[] {
    const fieldMap: { [key: string]: string } = {
      access_code: 'accessCode',
      'access-code': 'accessCode',
      accesscode: 'accessCode',
      serial_number: 'serial',
      'serial-number': 'serial',
      serialnumber: 'serial',
      ip_address: 'ip',
      'ip-address': 'ip',
      ipaddress: 'ip',
    };

    return header.map(field => {
      const lower = field.toLowerCase();
      return fieldMap[lower] || lower;
    });
  }

  /**
   * Validate CSV header contains required fields
   */
  private validateCSVHeader(
    normalizedHeader: string[],
    errors: ImportError[]
  ): boolean {
    const requiredFields = ['name', 'model', 'ip', 'accessCode', 'serial'];
    const missingFields = requiredFields.filter(
      field => !normalizedHeader.includes(field)
    );

    if (missingFields.length > 0) {
      errors.push({
        message: `Missing required CSV columns: ${missingFields.join(', ')}`,
      });
      return false;
    }

    return true;
  }

  /**
   * Parse CSV data rows
   */
  private parseCSVDataRows(
    dataLines: string[],
    header: string[],
    normalizedHeader: string[],
    errors: ImportError[]
  ): ImportablePrinter[] {
    const printers: ImportablePrinter[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const values = dataLines[i]
        .split(',')
        .map(v => v.trim().replace(/"/g, ''));
      const lineNumber = i + 2; // +2 because we removed header and arrays are 0-indexed

      if (values.length !== header.length) {
        errors.push({
          line: lineNumber,
          message: `Row has ${values.length} columns, expected ${header.length}`,
        });
        continue;
      }

      const printer: RawPrinterData = {};
      normalizedHeader.forEach((field, index) => {
        printer[field] = values[index];
      });

      const normalized = this.normalizePrinter(printer, lineNumber, errors);
      if (normalized) {
        printers.push(normalized);
      }
    }

    return printers;
  }

  /**
   * Parse YAML format
   */
  private async parseYAML(
    content: string,
    errors: ImportError[]
  ): Promise<ImportablePrinter[]> {
    try {
      const lines = content.split('\n');
      const printers: ImportablePrinter[] = [];
      let currentPrinter: RawPrinterData = {};
      let lineNumber = 0;

      for (let i = 0; i < lines.length; i++) {
        lineNumber = i + 1;
        const line = lines[i].trim();

        if (this.shouldSkipYAMLLine(line)) {
          continue;
        }

        if (this.isYAMLListItem(line)) {
          // Save previous printer if exists
          if (Object.keys(currentPrinter).length > 0) {
            this.addYAMLPrinter(currentPrinter, lineNumber, printers, errors);
          }
          currentPrinter = this.parseYAMLListItem(line);
        } else if (this.isYAMLField(line, currentPrinter)) {
          this.parseYAMLField(line, currentPrinter);
        }
      }

      // Add last printer
      if (Object.keys(currentPrinter).length > 0) {
        this.addYAMLPrinter(currentPrinter, lineNumber, printers, errors);
      }

      return printers;
    } catch (error) {
      errors.push({
        message: `YAML parsing error: ${ErrorHandler.getErrorMessage(error)}`,
      });
      return [];
    }
  }

  /**
   * Check if YAML line should be skipped
   */
  private shouldSkipYAMLLine(line: string): boolean {
    return !line || line.startsWith('#');
  }

  /**
   * Check if line is a YAML list item
   */
  private isYAMLListItem(line: string): boolean {
    return line.startsWith('- name:');
  }

  /**
   * Check if line is a YAML field
   */
  private isYAMLField(line: string, currentPrinter: RawPrinterData): boolean {
    return line.includes(':') && Object.keys(currentPrinter).length > 0;
  }

  /**
   * Parse YAML list item
   */
  private parseYAMLListItem(line: string): RawPrinterData {
    const nameValue = line.substring(7).trim(); // Remove "- name:"
    return { name: this.cleanYamlValue(nameValue) };
  }

  /**
   * Parse YAML field
   */
  private parseYAMLField(line: string, currentPrinter: RawPrinterData): void {
    const colonIndex = line.indexOf(':');
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();

    if (key && value) {
      currentPrinter[key] = this.cleanYamlValue(value);
    }
  }

  /**
   * Add YAML printer to results
   */
  private addYAMLPrinter(
    printerData: RawPrinterData,
    lineNumber: number,
    printers: ImportablePrinter[],
    errors: ImportError[]
  ): void {
    const normalized = this.normalizePrinter(printerData, lineNumber, errors);
    if (normalized) {
      printers.push(normalized);
    }
  }

  /**
   * Clean YAML values by removing quotes and handling special characters
   */
  private cleanYamlValue(value: string): string {
    // Remove surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }

  /**
   * Parse TXT format (simple key-value pairs)
   */
  private async parseTXT(
    content: string,
    errors: ImportError[]
  ): Promise<ImportablePrinter[]> {
    const printers: ImportablePrinter[] = [];
    const blocks = content
      .split('\n\n')
      .filter(block => block.trim().length > 0);

    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const block = blocks[blockIndex].trim();
      const lines = block.split('\n');
      const printer: RawPrinterData = {};

      for (const line of lines) {
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          if (key && value) {
            printer[key.trim().toLowerCase()] = value;
          }
        }
      }

      const normalized = this.normalizePrinter(printer, blockIndex + 1, errors);
      if (normalized) {
        printers.push(normalized);
      }
    }

    return printers;
  }

  /**
   * Normalize printer data from various formats
   */
  private normalizePrinter(
    data: RawPrinterData,
    lineNumber: number,
    errors: ImportError[]
  ): ImportablePrinter | null {
    try {
      // Handle different field name variations
      const getName = () =>
        data.name || data.Name || data.printer_name || data.printerName || '';
      const getModel = () =>
        data.model ||
        data.Model ||
        data.printer_model ||
        data.printerModel ||
        '';
      const getIP = () =>
        data.ip ||
        data.IP ||
        data.ip_address ||
        data.ipAddress ||
        data.address ||
        '';
      const getAccessCode = () =>
        data.accessCode ||
        data.access_code ||
        data.accesscode ||
        data.AccessCode ||
        '';
      const getSerial = () =>
        data.serial ||
        data.Serial ||
        data.serial_number ||
        data.serialNumber ||
        '';

      return {
        name: getName(),
        model: getModel(),
        ip: getIP(),
        accessCode: getAccessCode(),
        serial: getSerial(),
      };
    } catch (error) {
      errors.push({
        line: lineNumber,
        message: `Failed to normalize printer data: ${ErrorHandler.getErrorMessage(error)}`,
      });
      return null;
    }
  }

  /**
   * Validate a single printer
   */
  private validatePrinter(
    printer: ImportablePrinter,
    lineNumber: number
  ): {
    errors: ImportError[];
    warnings: ImportError[];
    printer: ImportablePrinter;
  } {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    // Required field validation
    if (!printer.name?.trim()) {
      errors.push({
        line: lineNumber,
        field: 'name',
        message: 'Printer name is required',
      });
    }
    if (!printer.model?.trim()) {
      errors.push({
        line: lineNumber,
        field: 'model',
        message: 'Printer model is required',
      });
    }
    if (!printer.ip?.trim()) {
      errors.push({
        line: lineNumber,
        field: 'ip',
        message: 'IP address is required',
      });
    }
    if (!printer.accessCode?.trim()) {
      errors.push({
        line: lineNumber,
        field: 'accessCode',
        message: 'Access code is required',
      });
    }
    if (!printer.serial?.trim()) {
      errors.push({
        line: lineNumber,
        field: 'serial',
        message: 'Serial number is required',
      });
    }

    // IP address format validation
    if (printer.ip && !this.isValidIP(printer.ip)) {
      errors.push({
        line: lineNumber,
        field: 'ip',
        message: 'Invalid IP address format',
      });
    }

    // Serial number format validation
    if (printer.serial && printer.serial.length < 3) {
      warnings.push({
        line: lineNumber,
        field: 'serial',
        message: 'Serial number seems too short',
      });
    }

    // Clean up data
    const cleanedPrinter: ImportablePrinter = {
      name: printer.name?.trim() || '',
      model: printer.model?.trim() || '',
      ip: printer.ip?.trim() || '',
      accessCode: printer.accessCode?.trim() || '',
      serial: printer.serial?.trim() || '',
    };

    return { errors, warnings, printer: cleanedPrinter };
  }

  /**
   * Validate IP address format
   */
  private isValidIP(ip: string): boolean {
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Create import preview
   */
  async createPreview(
    content: string,
    filename: string
  ): Promise<ImportPreview> {
    const format = this.detectFormat(filename, content);
    const validation = await this.parseFile(content, format);

    const existingPrinters = this.printerService.getPrinters();
    const existingSerials = existingPrinters.map(p => p.serial || '');

    const duplicateSerials = validation.printers
      .map(p => p.serial)
      .filter((serial, index, arr) => arr.indexOf(serial) !== index);

    const existingMatches = validation.printers
      .map(p => p.serial)
      .filter(serial => existingSerials.includes(serial));

    return {
      format,
      totalRecords: validation.printers.length + validation.errors.length,
      validRecords: validation.printers.length,
      invalidRecords: validation.errors.length,
      duplicateSerials: Array.from(new Set(duplicateSerials)),
      existingSerials: Array.from(new Set(existingMatches)),
      sampleData: validation.printers.slice(0, 5), // Show first 5 as sample
    };
  }

  /**
   * Import printers with options
   */
  async importPrinters(
    content: string,
    filename: string,
    options: ImportOptions = {
      skipDuplicates: true,
      overwriteExisting: false,
      validateOnly: false,
    }
  ): Promise<ImportResult> {
    const format = this.detectFormat(filename, content);
    const validation = await this.parseFile(content, format);

    if (!validation.valid) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: validation.errors,
        printers: [],
        validateOnly: options.validateOnly,
      };
    }

    if (options.validateOnly) {
      return {
        success: true,
        imported: validation.printers.length,
        skipped: 0,
        errors: validation.errors,
        printers: validation.printers,
        validateOnly: true,
      };
    }

    const existingPrinters = this.printerService.getPrinters();
    const existingSerials = existingPrinters.map(p => p.serial || '');

    let imported = 0;
    let skipped = 0;
    const errors: ImportError[] = [...validation.errors];
    const successfulPrinters: ImportablePrinter[] = [];

    for (const printer of validation.printers) {
      const exists = existingSerials.includes(printer.serial);

      if (exists && options.skipDuplicates && !options.overwriteExisting) {
        skipped++;
        continue;
      }

      try {
        const params: AddPrinterParams = {
          name: printer.name,
          model: printer.model,
          ip: printer.ip,
          accessCode: printer.accessCode,
          serial: printer.serial,
        };

        await this.printerService.addPrinter(params);
        imported++;
        successfulPrinters.push(printer);
      } catch (error) {
        const errorMessage = ErrorHandler.logAndGetMessage(
          error,
          `Import error for printer: ${printer.name}`
        );

        errors.push({
          message: `Failed to import printer "${printer.name}": ${errorMessage}`,
          data: printer,
        });
      }
    }

    return {
      success: errors.length === 0,
      imported,
      skipped,
      errors,
      printers: successfulPrinters,
      validateOnly: false,
    };
  }

  /**
   * Export printers to various formats
   */
  async exportPrinters(options: ExportOptions): Promise<ExportResult> {
    try {
      const printers = this.printerService.getPrinters();
      const exportData = printers.map(printer => ({
        name: printer.name,
        model: printer.model || '',
        ip: printer.ip || '',
        accessCode: printer.accessCode || '',
        serial: printer.serial || '',
        ...(options.includeTimestamps && {
          lastUpdate: printer.lastUpdate.toISOString(),
        }),
      }));

      let data: string;
      let filename: string;
      const timestamp = new Date().toISOString().split('T')[0];

      switch (options.format) {
        case 'json':
          data = JSON.stringify(exportData, null, options.prettyFormat ? 2 : 0);
          filename = `printers-${timestamp}.json`;
          break;
        case 'csv':
          data = this.exportToCSV(exportData);
          filename = `printers-${timestamp}.csv`;
          break;
        case 'yaml':
          data = this.exportToYAML(exportData);
          filename = `printers-${timestamp}.yaml`;
          break;
        case 'txt':
          data = this.exportToTXT(exportData);
          filename = `printers-${timestamp}.txt`;
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      return {
        success: true,
        filename,
        data,
      };
    } catch (error) {
      return {
        success: false,
        filename: '',
        data: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private exportToCSV(data: Record<string, string>[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvData = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => `"${row[header] || ''}"`).join(',')
      ),
    ];

    return csvData.join('\n');
  }

  private exportToYAML(data: Record<string, string>[]): string {
    return data
      .map(printer =>
        Object.entries(printer)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      )
      .join('\n\n');
  }

  private exportToTXT(data: Record<string, string>[]): string {
    return data
      .map(printer =>
        Object.entries(printer)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      )
      .join('\n\n');
  }
}
