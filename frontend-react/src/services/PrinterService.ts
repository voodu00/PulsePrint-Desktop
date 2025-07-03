import {
	Printer,
	PrinterStatistics,
	PrinterServiceEvent
} from '../types/printer'

export class PrinterService {
	private printers: Map<string, Printer> = new Map()
	private updateInterval: NodeJS.Timeout | null = null
	private listeners: Set<(event: PrinterServiceEvent) => void> = new Set()

	constructor() {
		this.generateMockData()
	}

	private generateMockData(): void {
		const mockPrinters: Printer[] = [
			{
				id: 'printer-1',
				name: 'Bambu X1 Carbon',
				status: 'idle',
				temperatures: { nozzle: 0, bed: 0, chamber: 0 },
				print: null,
				filament: { type: 'PLA', color: '#ff6b6b', remaining: 85 },
				error: null,
				lastUpdate: new Date()
			},
			{
				id: 'printer-2',
				name: 'Bambu P1P',
				status: 'printing',
				temperatures: { nozzle: 210, bed: 60, chamber: 0 },
				print: {
					progress: 45,
					fileName: 'phone_case.3mf',
					layerCurrent: 120,
					layerTotal: 250,
					timeRemaining: 3600,
					estimatedTotalTime: 7200
				},
				filament: { type: 'PETG', color: '#4ecdc4', remaining: 67 },
				error: null,
				lastUpdate: new Date()
			},
			{
				id: 'printer-3',
				name: 'Bambu A1 Mini',
				status: 'error',
				temperatures: { nozzle: 0, bed: 0, chamber: 0 },
				print: null,
				filament: { type: 'ABS', color: '#45b7d1', remaining: 23 },
				error: {
					printError: 1,
					errorCode: 5678,
					stage: 1,
					lifecycle: 'error',
					gcodeState: 'FAILED',
					message: 'Hotend temperature error'
				},
				lastUpdate: new Date()
			}
		]

		mockPrinters.forEach((printer) => {
			this.printers.set(printer.id, printer)
		})
	}

	async initialize(): Promise<Printer[]> {
		// Simulate API call delay
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Start update interval
		this.startUpdateInterval()

		const printers = Array.from(this.printers.values())
		this.notifyListeners({ type: 'initialized', data: printers })

		return printers
	}

	getAllPrinters(): Printer[] {
		return Array.from(this.printers.values())
	}

	getPrinter(id: string): Printer | undefined {
		return this.printers.get(id)
	}

	getStatistics(): PrinterStatistics {
		const printers = Array.from(this.printers.values())

		return {
			total: printers.length,
			online: printers.filter((p) => p.status !== 'offline').length,
			printing: printers.filter((p) => p.status === 'printing').length,
			idle: printers.filter((p) => p.status === 'idle').length,
			error: printers.filter((p) => p.status === 'error').length
		}
	}

	async pausePrint(
		printerId: string
	): Promise<{ success: boolean; message: string }> {
		const printer = this.printers.get(printerId)
		if (printer && printer.status === 'printing') {
			printer.status = 'paused'
			printer.lastUpdate = new Date()
			this.notifyListeners({ type: 'printer_paused', data: printer })
			return { success: true, message: 'Print paused successfully' }
		}
		return { success: false, message: 'Cannot pause print' }
	}

	async resumePrint(
		printerId: string
	): Promise<{ success: boolean; message: string }> {
		const printer = this.printers.get(printerId)
		if (printer && printer.status === 'paused') {
			printer.status = 'printing'
			printer.lastUpdate = new Date()
			this.notifyListeners({ type: 'printer_resumed', data: printer })
			return { success: true, message: 'Print resumed successfully' }
		}
		return { success: false, message: 'Cannot resume print' }
	}

	async stopPrint(
		printerId: string
	): Promise<{ success: boolean; message: string }> {
		const printer = this.printers.get(printerId)
		if (
			printer &&
			(printer.status === 'printing' || printer.status === 'paused')
		) {
			printer.status = 'idle'
			printer.print = null
			printer.lastUpdate = new Date()
			this.notifyListeners({ type: 'printer_stopped', data: printer })
			return { success: true, message: 'Print stopped successfully' }
		}
		return { success: false, message: 'Cannot stop print' }
	}

	private startUpdateInterval(interval: number = 30000): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval)
		}

		this.updateInterval = setInterval(() => {
			this.updatePrinterData()
		}, interval)
	}

	private async updatePrinterData(): Promise<void> {
		const updatedPrinters: Printer[] = []

		this.printers.forEach((printer) => {
			const updated = this.simulateDataUpdate(printer)
			this.printers.set(printer.id, updated)
			updatedPrinters.push(updated)
		})

		this.notifyListeners({ type: 'updated', data: updatedPrinters })
	}

	private simulateDataUpdate(printer: Printer): Printer {
		const updated = { ...printer, lastUpdate: new Date() }

		// Simulate status changes (5% chance)
		if (Math.random() < 0.05) {
			updated.status = this.getRandomStatus()
		}

		// Update temperatures based on status
		if (updated.status === 'printing' || updated.status === 'idle') {
			updated.temperatures = this.updateTemperatures(
				updated.temperatures,
				updated.status
			)
		} else if (updated.status === 'offline' || updated.status === 'error') {
			updated.temperatures = { nozzle: 0, bed: 0, chamber: 0 }
		}

		// Update print progress
		if (updated.status === 'printing' && updated.print) {
			updated.print = this.updatePrintProgress(updated.print)
		}

		// Handle errors
		if (updated.status === 'error' && !updated.error) {
			updated.error = this.generateRandomError()
		} else if (updated.status !== 'error') {
			updated.error = null
		}

		return updated
	}

	private getRandomStatus() {
		const statuses = ['idle', 'printing', 'offline', 'error']
		const weights = [0.4, 0.3, 0.2, 0.1]

		const random = Math.random()
		let cumulative = 0

		for (let i = 0; i < statuses.length; i++) {
			cumulative += weights[i]
			if (random < cumulative) {
				return statuses[i] as any
			}
		}

		return 'idle' as any
	}

	private updateTemperatures(temps: any, status: string) {
		const variation = 5

		if (status === 'printing') {
			return {
				nozzle: Math.max(
					0,
					Math.round(temps.nozzle + (Math.random() - 0.5) * variation)
				),
				bed: Math.max(
					0,
					Math.round(temps.bed + (Math.random() - 0.5) * variation)
				),
				chamber: Math.max(
					0,
					Math.round(temps.chamber + (Math.random() - 0.5) * variation)
				)
			}
		} else if (status === 'idle') {
			return {
				nozzle: Math.max(0, Math.round(temps.nozzle * 0.95)),
				bed: Math.max(0, Math.round(temps.bed * 0.95)),
				chamber: Math.max(0, Math.round(temps.chamber * 0.95))
			}
		}

		return temps
	}

	private updatePrintProgress(print: any) {
		const progressIncrease = Math.random() * 2
		const newProgress = Math.min(100, print.progress + progressIncrease)

		const timeDecrease = Math.random() * 120
		const newTimeRemaining = Math.max(0, print.timeRemaining - timeDecrease)

		const totalLayers = print.layerTotal
		const newCurrentLayer = Math.min(
			totalLayers,
			Math.floor((newProgress / 100) * totalLayers)
		)

		return {
			...print,
			progress: Math.round(newProgress),
			timeRemaining: Math.round(newTimeRemaining),
			layerCurrent: newCurrentLayer
		}
	}

	private generateRandomError() {
		const errors = [
			{
				printError: 1,
				errorCode: 1234,
				stage: 2,
				lifecycle: 'error',
				gcodeState: 'FAILED',
				message: 'Filament runout detected'
			},
			{
				printError: 2,
				errorCode: 5678,
				stage: 1,
				lifecycle: 'error',
				gcodeState: 'FAILED',
				message: 'Hotend temperature error'
			},
			{
				printError: 3,
				errorCode: 9012,
				stage: 0,
				lifecycle: 'error',
				gcodeState: 'FAILED',
				message: 'Bed leveling failed'
			},
			{
				printError: 4,
				errorCode: 3456,
				stage: 3,
				lifecycle: 'error',
				gcodeState: 'FAILED',
				message: 'Print head collision'
			},
			{
				printError: 5,
				errorCode: 7890,
				stage: 1,
				lifecycle: 'error',
				gcodeState: 'FAILED',
				message: 'Power supply issue'
			}
		]

		return errors[Math.floor(Math.random() * errors.length)]
	}

	addEventListener(callback: (event: PrinterServiceEvent) => void): void {
		this.listeners.add(callback)
	}

	removeEventListener(callback: (event: PrinterServiceEvent) => void): void {
		this.listeners.delete(callback)
	}

	private notifyListeners(event: PrinterServiceEvent): void {
		this.listeners.forEach((callback) => {
			try {
				callback(event)
			} catch (error) {
				console.error('Error in printer service listener:', error)
			}
		})
	}

	destroy(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval)
			this.updateInterval = null
		}
		this.listeners.clear()
		this.printers.clear()
	}
}
