import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
	Printer,
	PrinterServiceEvent,
	AddPrinterParams
} from '../types/printer'

export interface TauriPrinterConfig {
	id: string
	name: string
	model: string
	ip: string
	access_code: string
	serial: string
}

export interface TauriPrintCommand {
	action: string
}

export class TauriMqttService {
	private listeners: ((event: PrinterServiceEvent) => void)[] = []
	private printers: Map<string, Printer> = new Map()
	private static readonly STORAGE_KEY = 'printpulse-printer-configs'

	constructor() {
		this.setupEventListeners()
		this.loadPrintersFromStorage()
	}

	private async setupEventListeners() {
		// Listen for printer updates from Tauri backend
		await listen<Printer>('printer-update', (event) => {
			const printer = this.convertTauriPrinterToFrontend(event.payload)
			this.printers.set(printer.id, printer)

			// Save updated printer state to localStorage
			this.savePrintersToStorage()

			this.notifyListeners({
				type: 'updated',
				data: Array.from(this.printers.values())
			})
		})

		// Listen for printer removal
		await listen<string>('printer-removed', (event) => {
			const printerId = event.payload
			this.printers.delete(printerId)

			// Save updated printer state to localStorage
			this.savePrintersToStorage()

			this.notifyListeners({
				type: 'updated',
				data: Array.from(this.printers.values())
			})
		})
	}

	private convertTauriPrinterToFrontend(tauriPrinter: any): Printer {
		return {
			id: tauriPrinter.id,
			name: tauriPrinter.name,
			model: tauriPrinter.model,
			ip: tauriPrinter.ip,
			accessCode: tauriPrinter.access_code,
			serial: tauriPrinter.serial,
			status: tauriPrinter.status,
			temperatures: {
				nozzle: tauriPrinter.temperatures.nozzle,
				bed: tauriPrinter.temperatures.bed,
				chamber: tauriPrinter.temperatures.chamber
			},
			print: tauriPrinter.print
				? {
						progress: tauriPrinter.print.progress,
						fileName: tauriPrinter.print.file_name,
						layerCurrent: tauriPrinter.print.layer_current,
						layerTotal: tauriPrinter.print.layer_total,
						timeRemaining: tauriPrinter.print.time_remaining,
						estimatedTotalTime: tauriPrinter.print.estimated_total_time
				  }
				: null,
			filament: tauriPrinter.filament
				? {
						type: tauriPrinter.filament.type,
						color: tauriPrinter.filament.color,
						remaining: tauriPrinter.filament.remaining
				  }
				: null,
			error: tauriPrinter.error
				? {
						printError: tauriPrinter.error.print_error,
						errorCode: tauriPrinter.error.error_code,
						stage: tauriPrinter.error.stage,
						lifecycle: tauriPrinter.error.lifecycle,
						gcodeState: tauriPrinter.error.gcode_state,
						message: tauriPrinter.error.message
				  }
				: null,
			lastUpdate: new Date(tauriPrinter.last_update)
		}
	}

	private convertFrontendToTauriConfig(
		params: AddPrinterParams
	): TauriPrinterConfig {
		return {
			id: `printer-${Date.now()}`,
			name: params.name,
			model: params.model || 'Unknown Model',
			ip: params.ip,
			access_code: params.accessCode,
			serial: params.serial
		}
	}

	// localStorage methods for persistent printer state
	private loadPrintersFromStorage(): void {
		try {
			const stored = localStorage.getItem(TauriMqttService.STORAGE_KEY)
			if (stored) {
				const printerConfigs = JSON.parse(stored)
				// Restore printer configurations and reconnect
				printerConfigs.forEach((config: TauriPrinterConfig) => {
					// Create a basic printer object from stored config
					const printer: Printer = {
						id: config.id,
						name: config.name,
						model: config.model,
						ip: config.ip,
						accessCode: config.access_code,
						serial: config.serial,
						status: 'offline',
						temperatures: { nozzle: 0, bed: 0, chamber: 0 },
						print: null,
						filament: null,
						error: null,
						lastUpdate: new Date()
					}
					this.printers.set(config.id, printer)
				})
			}
		} catch (error) {
			console.error('Failed to load printers from localStorage:', error)
		}
	}

	private savePrintersToStorage(): void {
		try {
			const printerConfigs = Array.from(this.printers.values()).map(
				(printer) => ({
					id: printer.id,
					name: printer.name,
					model: printer.model,
					ip: printer.ip,
					access_code: printer.accessCode,
					serial: printer.serial
				})
			)
			localStorage.setItem(
				TauriMqttService.STORAGE_KEY,
				JSON.stringify(printerConfigs)
			)
		} catch (error) {
			console.error('Failed to save printers to localStorage:', error)
		}
	}

	async addPrinter(params: AddPrinterParams): Promise<void> {
		const config = this.convertFrontendToTauriConfig(params)
		await invoke('add_printer', { config })

		// Save to localStorage immediately
		this.savePrintersToStorage()
	}

	async removePrinter(printerId: string): Promise<void> {
		await invoke('remove_printer', { printerId })
	}

	async getAllPrinters(): Promise<Printer[]> {
		const tauriPrinters = await invoke<any[]>('get_all_printers')
		return tauriPrinters.map((printer) =>
			this.convertTauriPrinterToFrontend(printer)
		)
	}

	async pausePrint(printerId: string): Promise<void> {
		await invoke('pause_printer', { printerId })
	}

	async resumePrint(printerId: string): Promise<void> {
		await invoke('resume_printer', { printerId })
	}

	async stopPrint(printerId: string): Promise<void> {
		await invoke('stop_printer', { printerId })
	}

	async sendCommand(
		printerId: string,
		command: TauriPrintCommand
	): Promise<void> {
		await invoke('send_printer_command', { printerId, command })
	}

	// Event listener management
	addEventListener(listener: (event: PrinterServiceEvent) => void): void {
		this.listeners.push(listener)
	}

	removeEventListener(listener: (event: PrinterServiceEvent) => void): void {
		const index = this.listeners.indexOf(listener)
		if (index > -1) {
			this.listeners.splice(index, 1)
		}
	}

	private notifyListeners(event: PrinterServiceEvent): void {
		this.listeners.forEach((listener) => listener(event))
	}

	// Initialize the service
	async initialize(): Promise<void> {
		// First, restore printer configurations from localStorage
		this.loadPrintersFromStorage()

		// Then, reconnect to any stored printers
		const storedPrinters = Array.from(this.printers.values())
		for (const printer of storedPrinters) {
			try {
				// Re-add the printer to establish MQTT connection
				await invoke('add_printer', {
					config: {
						id: printer.id,
						name: printer.name,
						model: printer.model,
						ip: printer.ip,
						access_code: printer.accessCode,
						serial: printer.serial
					}
				})
			} catch (error) {
				console.error(`Failed to reconnect to printer ${printer.name}:`, error)
			}
		}

		// Don't overwrite real-time states - let MQTT updates populate the actual status
		// The printer-update events will update the states as MQTT data comes in

		this.notifyListeners({
			type: 'initialized',
			data: Array.from(this.printers.values())
		})
	}

	// Get current printer data
	getPrinters(): Printer[] {
		return Array.from(this.printers.values())
	}

	getPrinter(id: string): Printer | undefined {
		return this.printers.get(id)
	}

	// Additional methods expected by Dashboard
	getStatistics() {
		const printers = Array.from(this.printers.values())
		return {
			total: printers.length,
			online: printers.filter((p) => p.status !== 'offline').length,
			printing: printers.filter((p) => p.status === 'printing').length,
			idle: printers.filter((p) => p.status === 'idle').length,
			error: printers.filter((p) => p.status === 'error').length
		}
	}

	// Cleanup method
	destroy() {
		// Clean up any resources if needed
		this.listeners = []
		this.printers.clear()
	}
}
