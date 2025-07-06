import { ImportFileFormat } from '../types/import';

export const getFormatIcon = (format: ImportFileFormat): string => {
  switch (format) {
    case 'json':
      return '{ }';
    case 'csv':
      return 'CSV';
    case 'yaml':
      return 'YAML';
    case 'txt':
      return 'TXT';
    default:
      return '?';
  }
};

export const getFormatColor = (format: ImportFileFormat): string => {
  switch (format) {
    case 'json':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'csv':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'yaml':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'txt':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export const getFormatDescription = (format: ImportFileFormat): string => {
  switch (format) {
    case 'json':
      return 'JavaScript Object Notation - structured data format';
    case 'csv':
      return 'Comma-Separated Values - spreadsheet compatible';
    case 'yaml':
      return "YAML Ain't Markup Language - human-readable format";
    case 'txt':
      return 'Plain text - simple key-value pairs';
    default:
      return 'Unknown format';
  }
};
