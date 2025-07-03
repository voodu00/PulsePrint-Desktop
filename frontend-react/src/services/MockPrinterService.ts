import {
	Printer,
	PrinterStatistics,
	PrinterServiceEvent,
	AddPrinterParams
} from '../types/printer'

export class MockPrinterService {
	private printers: Printer[] = []
	private listeners: ((event: PrinterServiceEvent) => void)[] = []
	private updateInterval: NodeJS.Timeout | null = null

	constructor() {
		this.generateMockData()
	}

	private generateMockData(): void {
		this.printers = [
			{
				id: 'printer-001',
				name: 'X1 Carbon - Workshop',
				model: 'X1 Carbon',
				ip: '192.168.1.100',
				accessCode: '12345678',
				serial: '01S00A123456789',
				status: 'printing',
				temperatures: {
					nozzle: 245,
					bed: 60,
					chamber: 35
				},
				print: {
					progress: 67,
					fileName: 'benchy_v2.3mf',
					layerCurrent: 142,
					layerTotal: 210,
					timeRemaining: 2340, // 39 minutes
					estimatedTotalTime: 6900 // 115 minutes
				},
				filament: {
					type: 'PLA',
					color: 'Orange',
					remaining: 85
				},
				error: null,
				lastUpdate: new Date()
			},
			{
				id: 'printer-002',
				name: 'P1S - Office',
				model: 'P1S',
				ip: '192.168.1.101',
				accessCode: '87654321',
				serial: '01P00B987654321',
				status: 'idle',
				temperatures: {
					nozzle: 28,
					bed: 25,
					chamber: 24
				},
				print: null,
				filament: {
					type: 'PETG',
					color: 'Teal',
					remaining: 92
				},
				error: null,
				lastUpdate: new Date()
			},
			{
				id: 'printer-003',
				name: 'A1 Mini - Lab',
				model: 'A1 Mini',
				ip: '192.168.1.102',
				accessCode: '11223344',
				serial: '01A00C111222333',
				status: 'error',
				temperatures: {
					nozzle: 35,
					bed: 30,
					chamber: 0
				},
				print: {
					progress: 23,
					fileName: 'phone_case.3mf',
					layerCurrent: 45,
					layerTotal: 195,
					timeRemaining: 0,
					estimatedTotalTime: 4200
				},
				filament: {
					type: 'ABS',
					color: 'Dark Blue',
					remaining: 12
				},
				error: {
					printError: 1,
					errorCode: 1203,
					stage: 2,
					lifecycle: 'error',
					gcodeState: 'FAILED',
					message: 'Filament runout detected'
				},
				lastUpdate: new Date()
			},
			{
				id: 'printer-004',
				name: 'X1E - Production',
				model: 'X1E',
				ip: '192.168.1.103',
				accessCode: '55667788',
				serial: '01E00D555666777',
				status: 'paused',
				temperatures: {
					nozzle: 220,
					bed: 80,
					chamber: 45
				},
				print: {
					progress: 89,
					fileName: 'large_prototype.3mf',
					layerCurrent: 456,
					layerTotal: 512,
					timeRemaining: 1560, // 26 minutes
					estimatedTotalTime: 14400 // 240 minutes
				},
				filament: {
					type: 'PETG',
					color: 'Purple',
					remaining: 67
				},
				error: null,
				lastUpdate: new Date()
			},
			{
				id: 'printer-005',
				name: 'P1P - Backup',
				model: 'P1P',
				ip: '192.168.1.104',
				accessCode: '99887766',
				serial: '01P00E999888777',
				status: 'offline',
				temperatures: {
					nozzle: 0,
					bed: 0,
					chamber: 0
				},
				print: null,
				filament: null,
				error: null,
				lastUpdate: new Date(Date.now() - 300000) // 5 minutes ago
			},
			{
				id: 'printer-006',
				name: 'A1 - Testing',
				model: 'A1',
				ip: '192.168.1.105',
				accessCode: '33445566',
				serial: '01A00F333444555',
				status: 'connecting',
				temperatures: {
					nozzle: 0,
					bed: 0,
					chamber: 0
				},
				print: null,
				filament: {
					type: 'TPU',
					color: 'Orange',
					remaining: 78
				},
				error: null,
				lastUpdate: new Date()
			}
		]
	}

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

	async initialize(): Promise<void> {
		// Simulate initialization delay
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Notify listeners that printers are initialized
		this.notifyListeners({
			type: 'initialized',
			data: [...this.printers]
		})

		// Start periodic updates
		this.startPeriodicUpdates()
	}

	private startPeriodicUpdates(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval)
		}

		this.updateInterval = setInterval(() => {
			this.updatePrinterData()
		}, 30000) // Update every 30 seconds
	}

	private updatePrinterData(): void {
		this.printers.forEach((printer) => {
			printer.lastUpdate = new Date()

			// Simulate progress updates for printing printers
			if (printer.status === 'printing' && printer.print) {
				const progressIncrement = Math.random() * 2 // 0-2% progress
				printer.print.progress = Math.min(
					100,
					Math.round(printer.print.progress + progressIncrement)
				)

				if (printer.print.layerTotal > 0) {
					const newLayer = Math.floor(
						(printer.print.progress / 100) * printer.print.layerTotal
					)
					printer.print.layerCurrent = Math.max(
						printer.print.layerCurrent,
						newLayer
					)
				}

				// Simulate time remaining decrease
				if (printer.print.timeRemaining > 0) {
					printer.print.timeRemaining = Math.max(
						0,
						Math.round(printer.print.timeRemaining - 30)
					)
				}

				// Small temperature variations
				printer.temperatures.nozzle = Math.round(
					printer.temperatures.nozzle + (Math.random() - 0.5) * 4
				)
				printer.temperatures.bed = Math.round(
					printer.temperatures.bed + (Math.random() - 0.5) * 2
				)
				if (printer.temperatures.chamber > 0) {
					printer.temperatures.chamber = Math.round(
						printer.temperatures.chamber + (Math.random() - 0.5) * 2
					)
				}
			}

			// Simulate idle temperature cooling
			if (printer.status === 'idle') {
				printer.temperatures.nozzle = Math.max(
					20,
					Math.round(printer.temperatures.nozzle - 1)
				)
				printer.temperatures.bed = Math.max(
					20,
					Math.round(printer.temperatures.bed - 0.5)
				)
				printer.temperatures.chamber = Math.max(
					20,
					Math.round(printer.temperatures.chamber - 0.3)
				)
			}
		})

		// Notify listeners of updates
		this.notifyListeners({
			type: 'updated',
			data: [...this.printers]
		})
	}

	getStatistics(): PrinterStatistics {
		const total = this.printers.length
		const online = this.printers.filter((p) => p.status !== 'offline').length
		const printing = this.printers.filter((p) => p.status === 'printing').length
		const idle = this.printers.filter((p) => p.status === 'idle').length
		const error = this.printers.filter((p) => p.status === 'error').length

		return { total, online, printing, idle, error }
	}

	addPrinter(printerData: AddPrinterParams): void {
		const newPrinter: Printer = {
			id: `printer-${Date.now()}`,
			name: printerData.name,
			model: printerData.model || 'Unknown Model',
			ip: printerData.ip,
			accessCode: printerData.accessCode,
			serial: printerData.serial,
			status: 'connecting',
			temperatures: {
				nozzle: 0,
				bed: 0,
				chamber: 0
			},
			print: null,
			filament: null,
			error: null,
			lastUpdate: new Date()
		}

		this.printers.push(newPrinter)

		// Notify listeners
		this.notifyListeners({
			type: 'updated',
			data: [...this.printers]
		})

		// Simulate MQTT connection process
		setTimeout(() => {
			newPrinter.status = 'idle'
			newPrinter.temperatures = {
				nozzle: 25,
				bed: 28,
				chamber: 24
			}
			newPrinter.lastUpdate = new Date()

			this.notifyListeners({
				type: 'updated',
				data: [...this.printers]
			})
		}, 3000) // 3 seconds to "connect" via MQTT
	}

	async pausePrint(printerId: string): Promise<void> {
		const printer = this.printers.find((p) => p.id === printerId)
		if (printer && printer.status === 'printing') {
			printer.status = 'paused'
			printer.lastUpdate = new Date()

			this.notifyListeners({
				type: 'printer_paused',
				data: printer
			})

			// Send updated data
			setTimeout(() => {
				this.notifyListeners({
					type: 'updated',
					data: [...this.printers]
				})
			}, 100)
		}
	}

	async resumePrint(printerId: string): Promise<void> {
		const printer = this.printers.find((p) => p.id === printerId)
		if (printer && printer.status === 'paused') {
			printer.status = 'printing'
			printer.lastUpdate = new Date()

			this.notifyListeners({
				type: 'printer_resumed',
				data: printer
			})

			// Send updated data
			setTimeout(() => {
				this.notifyListeners({
					type: 'updated',
					data: [...this.printers]
				})
			}, 100)
		}
	}

	async stopPrint(printerId: string): Promise<void> {
		const printer = this.printers.find((p) => p.id === printerId)
		if (
			printer &&
			(printer.status === 'printing' || printer.status === 'paused')
		) {
			printer.status = 'idle'
			printer.print = null
			printer.error = null
			printer.lastUpdate = new Date()

			this.notifyListeners({
				type: 'printer_stopped',
				data: printer
			})

			// Send updated data
			setTimeout(() => {
				this.notifyListeners({
					type: 'updated',
					data: [...this.printers]
				})
			}, 100)
		}
	}

	destroy(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval)
			this.updateInterval = null
		}
		this.listeners = []
	}

	// Method to manually trigger status changes for testing
	simulateStatusChange(printerId: string, newStatus: Printer['status']): void {
		const printer = this.printers.find((p) => p.id === printerId)
		if (printer) {
			printer.status = newStatus
			printer.lastUpdate = new Date()

			// Clear print data if going to idle or offline
			if (newStatus === 'idle' || newStatus === 'offline') {
				printer.print = null
				printer.error = null
			}

			// Add error if status is error
			if (newStatus === 'error' && !printer.error) {
				printer.error = {
					printError: 1,
					errorCode: 9999,
					stage: 1,
					lifecycle: 'error',
					gcodeState: 'FAILED',
					message: 'Simulated error condition'
				}
			}

			this.notifyListeners({
				type: 'updated',
				data: [...this.printers]
			})
		}
	}
}
