export interface ImportablePrinter {
	name: string
	model: string
	ip: string
	accessCode: string
	serial: string
}

export interface ImportResult {
	success: boolean
	imported: number
	skipped: number
	errors: ImportError[]
	printers: ImportablePrinter[]
	validateOnly: boolean
}

export interface ImportError {
	line?: number
	field?: string
	message: string
	data?: ImportablePrinter
}

export interface ImportValidationResult {
	valid: boolean
	errors: ImportError[]
	warnings: ImportError[]
	printers: ImportablePrinter[]
}

export type ImportFileFormat = 'json' | 'csv' | 'yaml' | 'txt'

export interface ImportOptions {
	skipDuplicates: boolean
	overwriteExisting: boolean
	validateOnly: boolean
}

export interface ImportPreview {
	format: ImportFileFormat
	totalRecords: number
	validRecords: number
	invalidRecords: number
	duplicateSerials: string[]
	existingSerials: string[]
	sampleData: ImportablePrinter[]
}

// Export types for symmetry
export interface ExportOptions {
	format: ImportFileFormat
	includeTimestamps: boolean
	prettyFormat: boolean
}

export interface ExportResult {
	success: boolean
	filename: string
	data: string
	error?: string
}

// Raw printer data interfaces to replace 'any' types
export interface RawPrinterData {
	name?: string
	Name?: string
	printer_name?: string
	printerName?: string
	model?: string
	Model?: string
	printer_model?: string
	printerModel?: string
	ip?: string
	IP?: string
	ip_address?: string
	ipAddress?: string
	address?: string
	accessCode?: string
	access_code?: string
	accesscode?: string
	AccessCode?: string
	serial?: string
	Serial?: string
	serial_number?: string
	serialNumber?: string
	[key: string]: unknown
}

export interface ParsedJsonData {
	printers?: ImportablePrinter[]
	[key: string]: unknown
}

export interface TauriPrinterData {
	id: string
	name: string
	model: string
	ip: string
	access_code: string
	serial: string
	status?: string
	online?: boolean
	connection_state?: string
	temperatures?: {
		nozzle: number
		bed: number
		chamber: number
	}
	print?: {
		progress: number
		time_remaining: number
		estimated_total_time?: number
		file_name: string
		print_type?: string
		layer_current: number
		layer_total: number
		speed_level?: number
		fan_speed?: number
		stage?: number
		lifecycle?: string
	}
	filament?: {
		type: string
		color: string
		remaining: number
	}
	error?: {
		print_error: number
		error_code: number
		stage: number
		lifecycle: string
		gcode_state: string
		message: string
	}
	last_update?: string
	[key: string]: unknown
}
