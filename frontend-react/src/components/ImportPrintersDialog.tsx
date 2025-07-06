import React, { useState, useCallback, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Switch } from './ui/switch'
import {
	Upload,
	CheckCircle,
	XCircle,
	AlertTriangle,
	Download,
	Eye,
	Loader2,
	Info,
} from 'lucide-react'
import { ImportService } from '../services/ImportService'
import { TauriMqttService } from '../services/TauriMqttService'
import { ImportPreview, ImportResult, ImportOptions } from '../types/import'
import { getFormatIcon, getFormatColor } from '../utils/formatUtils'

interface ImportPrintersDialogProps {
	isOpen: boolean
	onClose: () => void
	printerService: TauriMqttService
	onImportComplete?: (result: ImportResult) => void
}

type ImportStep = 'upload' | 'preview' | 'options' | 'importing' | 'complete'

export const ImportPrintersDialog: React.FC<ImportPrintersDialogProps> = ({
	isOpen,
	onClose,
	printerService,
	onImportComplete,
}) => {
	const [currentStep, setCurrentStep] = useState<ImportStep>('upload')
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [fileContent, setFileContent] = useState<string>('')
	const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
	const [importOptions, setImportOptions] = useState<ImportOptions>({
		skipDuplicates: true,
		overwriteExisting: false,
		validateOnly: false,
	})
	const [importResult, setImportResult] = useState<ImportResult | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const fileInputRef = useRef<HTMLInputElement>(null)
	const importService = useMemo(
		() => new ImportService(printerService),
		[printerService]
	)

	const handleFileSelect = useCallback(
		async (file: File) => {
			setIsLoading(true)
			setError(null)

			try {
				const content = await file.text()
				setSelectedFile(file)
				setFileContent(content)

				// Create preview
				const preview = await importService.createPreview(content, file.name)
				setImportPreview(preview)
				setCurrentStep('preview')
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to read file')
			} finally {
				setIsLoading(false)
			}
		},
		[importService]
	)

	const handleFileUpload = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0]
			if (file) {
				handleFileSelect(file)
			}
		},
		[handleFileSelect]
	)

	const handleDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault()
	}, [])

	const handleDrop = useCallback(
		(event: React.DragEvent) => {
			event.preventDefault()
			const file = event.dataTransfer.files[0]
			if (file) {
				handleFileSelect(file)
			}
		},
		[handleFileSelect]
	)

	const handleImport = useCallback(async () => {
		if (!selectedFile || !fileContent) return

		setIsLoading(true)
		setCurrentStep('importing')

		try {
			const result = await importService.importPrinters(
				fileContent,
				selectedFile.name,
				importOptions
			)

			setImportResult(result)
			setCurrentStep('complete')

			if (onImportComplete) {
				onImportComplete(result)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Import failed')
			setCurrentStep('options')
		} finally {
			setIsLoading(false)
		}
	}, [
		selectedFile,
		fileContent,
		importOptions,
		importService,
		onImportComplete,
	])

	const handleClose = useCallback(() => {
		setCurrentStep('upload')
		setSelectedFile(null)
		setFileContent('')
		setImportPreview(null)
		setImportResult(null)
		setError(null)
		setIsLoading(false)
		onClose()
	}, [onClose])

	const handleReset = useCallback(() => {
		setCurrentStep('upload')
		setSelectedFile(null)
		setFileContent('')
		setImportPreview(null)
		setImportResult(null)
		setError(null)
		setIsLoading(false)
	}, [])

	const renderUploadStep = () => (
		<div className="space-y-4">
			<div className="text-center">
				<p className="text-sm text-muted-foreground mb-4 pt-4">
					Upload a file containing printer configurations in JSON, CSV, YAML, or
					TXT format
				</p>
			</div>

			<div
				className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				onClick={() => fileInputRef.current?.click()}
			>
				<Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
				<p className="text-lg font-medium mb-2">
					Drop your file here or click to browse
				</p>
				<p className="text-sm text-muted-foreground">
					Supports JSON, CSV, YAML, and TXT files
				</p>
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept=".json,.csv,.yaml,.yml,.txt"
				onChange={handleFileUpload}
				className="hidden"
			/>

			<div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
				<div className="flex items-start gap-3">
					<Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
					<div className="text-sm">
						<p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
							Supported File Formats:
						</p>
						<ul className="text-blue-800 dark:text-blue-200 space-y-1">
							<li>
								<strong>JSON:</strong> Array of printer objects or{' '}
								{'{ printers: [...] }'}
							</li>
							<li>
								<strong>CSV:</strong> Header row with columns: name, model, ip,
								accessCode, serial
							</li>
							<li>
								<strong>YAML:</strong> List of printer configurations
							</li>
							<li>
								<strong>TXT:</strong> Key-value pairs separated by blank lines
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	)

	const renderPreviewStep = () => {
		if (!importPreview) return null

		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between pt-4">
					<h3 className="text-lg font-semibold">Import Preview</h3>
					<Badge className={getFormatColor(importPreview.format)}>
						{getFormatIcon(importPreview.format)}
					</Badge>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<Card>
						<CardContent className="p-4 text-center">
							<div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
								{importPreview.totalRecords}
							</div>
							<div className="text-sm text-muted-foreground">Total Records</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 text-center">
							<div className="text-2xl font-bold text-green-600 dark:text-green-400">
								{importPreview.validRecords}
							</div>
							<div className="text-sm text-muted-foreground">Valid</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 text-center">
							<div className="text-2xl font-bold text-red-600 dark:text-red-400">
								{importPreview.invalidRecords}
							</div>
							<div className="text-sm text-muted-foreground">Invalid</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 text-center">
							<div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
								{importPreview.existingSerials.length}
							</div>
							<div className="text-sm text-muted-foreground">Existing</div>
						</CardContent>
					</Card>
				</div>

				{importPreview.duplicateSerials.length > 0 && (
					<Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
						<CardHeader>
							<CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
								<AlertTriangle className="w-5 h-5" />
								Duplicate Serial Numbers
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2">
								{importPreview.duplicateSerials.map(serial => (
									<Badge key={serial} variant="secondary">
										{serial}
									</Badge>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{importPreview.existingSerials.length > 0 && (
					<Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
						<CardHeader>
							<CardTitle className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
								<Info className="w-5 h-5" />
								Existing Printers
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
								These printers already exist in your system:
							</p>
							<div className="flex flex-wrap gap-2">
								{importPreview.existingSerials.map(serial => (
									<Badge key={serial} variant="secondary">
										{serial}
									</Badge>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{importPreview.sampleData.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Eye className="w-5 h-5" />
								Sample Data ({importPreview.sampleData.length} of{' '}
								{importPreview.validRecords})
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{importPreview.sampleData.map((printer, index) => (
									<div
										key={index}
										className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
									>
										<div className="grid grid-cols-2 gap-2 text-sm">
											<div>
												<strong>Name:</strong> {printer.name}
											</div>
											<div>
												<strong>Model:</strong> {printer.model}
											</div>
											<div>
												<strong>IP:</strong> {printer.ip}
											</div>
											<div>
												<strong>Serial:</strong> {printer.serial}
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				<div className="flex justify-between">
					<Button variant="outline" onClick={handleReset}>
						<Upload className="w-4 h-4 mr-2" />
						Choose Different File
					</Button>
					<Button
						onClick={() => setCurrentStep('options')}
						disabled={importPreview.validRecords === 0}
					>
						Continue to Import Options
					</Button>
				</div>
			</div>
		)
	}

	const renderOptionsStep = () => (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold pt-4">Import Options</h3>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<h4 className="text-sm font-medium">Skip Duplicates</h4>
						<p className="text-sm text-muted-foreground">
							Skip printers with serial numbers that already exist
						</p>
					</div>
					<Switch
						checked={importOptions.skipDuplicates}
						onCheckedChange={checked =>
							setImportOptions(prev => ({ ...prev, skipDuplicates: checked }))
						}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<h4 className="text-sm font-medium">Overwrite Existing</h4>
						<p className="text-sm text-muted-foreground">
							Update existing printers with new information
						</p>
					</div>
					<Switch
						checked={importOptions.overwriteExisting}
						onCheckedChange={checked =>
							setImportOptions(prev => ({
								...prev,
								overwriteExisting: checked,
							}))
						}
						disabled={importOptions.skipDuplicates}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<h4 className="text-sm font-medium">Validate Only</h4>
						<p className="text-sm text-muted-foreground">
							Test the import without actually adding printers
						</p>
					</div>
					<Switch
						checked={importOptions.validateOnly}
						onCheckedChange={checked =>
							setImportOptions(prev => ({ ...prev, validateOnly: checked }))
						}
					/>
				</div>
			</div>

			<div className="flex justify-between">
				<Button
					variant="outline"
					onClick={() => setCurrentStep('preview')}
					className="border-gray-300 dark:border-gray-600"
				>
					Back to Preview
				</Button>
				<Button onClick={handleImport} disabled={isLoading}>
					{isLoading ? (
						<Loader2 className="w-4 h-4 mr-2 animate-spin" />
					) : (
						<Download className="w-4 h-4 mr-2" />
					)}
					{importOptions.validateOnly ? 'Validate' : 'Import'} Printers
				</Button>
			</div>
		</div>
	)

	const renderImportingStep = () => (
		<div className="text-center space-y-4">
			<Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600 dark:text-blue-400" />
			<h3 className="text-lg font-semibold">
				{importOptions.validateOnly ? 'Validating' : 'Importing'} Printers...
			</h3>
			<p className="text-sm text-muted-foreground">
				Please wait while we process your file
			</p>
		</div>
	)

	const renderCompleteStep = () => {
		if (!importResult) return null

		return (
			<div className="space-y-4">
				<div className="text-center pt-4">
					{importResult.success ? (
						<CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
					) : (
						<XCircle className="w-16 h-16 mx-auto mb-4 text-red-600 dark:text-red-400" />
					)}
					<h3 className="text-lg font-semibold mb-2">
						{importOptions.validateOnly ? 'Validation' : 'Import'}{' '}
						{importResult.success ? 'Complete' : 'Failed'}
					</h3>
				</div>

				<div className="grid grid-cols-3 gap-4">
					<Card>
						<CardContent className="p-4 text-center">
							<div className="text-2xl font-bold text-green-600 dark:text-green-400">
								{importResult.imported}
							</div>
							<div className="text-sm text-muted-foreground">
								{importOptions.validateOnly ? 'Valid' : 'Imported'}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 text-center">
							<div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
								{importResult.skipped}
							</div>
							<div className="text-sm text-muted-foreground">Skipped</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 text-center">
							<div className="text-2xl font-bold text-red-600 dark:text-red-400">
								{importResult.errors.length}
							</div>
							<div className="text-sm text-muted-foreground">Errors</div>
						</CardContent>
					</Card>
				</div>

				{importResult.errors.length > 0 && (
					<Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
						<CardHeader>
							<CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
								<XCircle className="w-5 h-5" />
								Errors
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2 max-h-40 overflow-y-auto">
								{importResult.errors.map((error, index) => (
									<div key={index} className="text-sm">
										{error.line && (
											<span className="font-medium">Line {error.line}:</span>
										)}{' '}
										{error.message}
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				<div className="flex justify-between">
					<Button variant="outline" onClick={handleReset}>
						Import Another File
					</Button>
					<Button onClick={handleClose}>Close</Button>
				</div>
			</div>
		)
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose} className="max-w-3xl">
			<DialogContent className="max-h-[90vh] overflow-y-auto p-6">
				<DialogHeader>
					<DialogTitle>Import Printer Settings</DialogTitle>
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

					{currentStep === 'upload' && renderUploadStep()}
					{currentStep === 'preview' && renderPreviewStep()}
					{currentStep === 'options' && renderOptionsStep()}
					{currentStep === 'importing' && renderImportingStep()}
					{currentStep === 'complete' && renderCompleteStep()}
				</div>
			</DialogContent>
		</Dialog>
	)
}
