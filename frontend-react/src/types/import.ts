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
	data?: any
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
