import { Printer, PrinterStatus } from '../types/printer'

export type PrinterServiceEventType =
	| 'initialized'
	| 'updated'
	| 'printer_added'
	| 'printer_removed'
	| 'printer_paused'
	| 'printer_resumed'
	| 'printer_stopped'

export interface PrinterServiceEvent {
	type: PrinterServiceEventType
	data: Printer | Printer[]
}

export interface PrinterStatistics {
	total: number
	online: number
	offline: number
	printing: number
	idle: number
	error: number
}

export interface PrinterConfig {
	id: string
	name: string
	model: string
	ip: string
	access_code: string
	serial: string
}

export class PrinterService {
	private printers: Printer[] = []
	private listeners: ((event: PrinterServiceEvent) => void)[] = []
	private updateInterval: NodeJS.Timeout | null = null
	private isInitialized = false
	private databaseInstance: any = null

	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return
		}

		try {
			// Ensure database is loaded and available
			console.log('Initializing database connection...')
			await this.getDatabase()
			console.log('Database connection established')

			// Load printer configurations from database
			await this.loadPrinterConfigs()

			// Load last known states from database
			await this.loadPrinterStates()

			// Register all printers with backend MQTT service
			await this.registerPrintersWithBackend()

			// Start monitoring printers
			this.startMonitoring()

			this.isInitialized = true

			this.notifyListeners({
				type: 'initialized',
				data: [...this.printers],
			})
		} catch (error) {
			console.error('Failed to initialize PrinterService:', error)
			throw error
		}
	}

	private async loadPrinterConfigs(): Promise<void> {
		try {
			const db = await this.getDatabase()
			const configs = (await db.select(
				'SELECT id, name, model, ip, access_code, serial, created_at, updated_at FROM printers ORDER BY name'
			)) as Array<{
				id: string
				name: string
				model: string
				ip: string
				access_code: string
				serial: string
				created_at: string
				updated_at: string
			}>

			// Convert configs to printer objects with offline status initially
			this.printers = configs.map((config: any) => ({
				id: config.id,
				name: config.name,
				model: config.model,
				status: 'offline' as PrinterStatus,
				ip: config.ip,
				accessCode: config.access_code,
				serial: config.serial,
				temperatures: {
					nozzle: 0,
					bed: 0,
					chamber: 0,
				},
				print: null,
				filament: null,
				error: null,
				lastUpdate: new Date(),
			}))
		} catch (error) {
			console.error('Failed to load printer configs:', error)
			this.printers = []
		}
	}

	private async loadPrinterStates(): Promise<void> {
		try {
			const db = await this.getDatabase()
			const states = (await db.select(`
				SELECT printer_id, status, nozzle_temp, bed_temp, chamber_temp, print_progress,
				       print_filename, layer_current, layer_total, time_remaining, filament_type,
				       filament_color, error_message, error_code, last_seen, updated_at
				FROM printer_states ORDER BY last_seen DESC
			`)) as Array<{
				printer_id: string
				status: string
				nozzle_temp: number
				bed_temp: number
				chamber_temp: number
				print_progress: number | null
				print_filename: string | null
				layer_current: number | null
				layer_total: number | null
				time_remaining: number | null
				filament_type: string | null
				filament_color: string | null
				error_message: string | null
				error_code: number | null
				last_seen: string
				updated_at: string
			}>

			// Merge states with printer configs
			for (const state of states) {
				const printer = this.printers.find(p => p.id === state.printer_id)
				if (printer) {
					printer.status = state.status as PrinterStatus
					printer.temperatures = {
						nozzle: state.nozzle_temp || 0,
						bed: state.bed_temp || 0,
						chamber: state.chamber_temp || 0,
					}

					if (state.print_progress !== null) {
						printer.print = {
							fileName: state.print_filename || 'Unknown',
							progress: state.print_progress,
							timeRemaining: state.time_remaining || 0,
							layerCurrent: state.layer_current || 0,
							layerTotal: state.layer_total || 0,
							estimatedTotalTime: state.time_remaining || 0,
						}
					}

					if (state.filament_type || state.filament_color) {
						printer.filament = {
							type: state.filament_type || 'Unknown',
							color: state.filament_color || 'Unknown',
							remaining: 100, // Default value since we don't track this yet
						}
					}

					if (state.error_message) {
						printer.error = {
							printError: state.error_code || 0,
							errorCode: state.error_code || 0,
							stage: 0,
							lifecycle: 'unknown',
							gcodeState: 'unknown',
							message: state.error_message || 'Unknown error',
						}
					}

					printer.lastUpdate = new Date(state.last_seen)
				}
			}
		} catch (error) {
			console.error('Failed to load printer states:', error)
		}
	}

	private async registerPrintersWithBackend(): Promise<void> {
		try {
			const { invoke } = await import('@tauri-apps/api/core')

			// Register each printer with the backend MQTT service
			for (const printer of this.printers) {
				try {
					// Skip printers that don't have required fields
					if (
						!printer.model ||
						!printer.ip ||
						!printer.accessCode ||
						!printer.serial
					) {
						console.warn(
							'Skipping printer with missing required fields:',
							printer.name
						)
						continue
					}

					const config: PrinterConfig = {
						id: printer.id,
						name: printer.name,
						model: printer.model!,
						ip: printer.ip!,
						access_code: printer.accessCode!,
						serial: printer.serial!,
					}

					await invoke('add_printer', { config })
					console.log('Registered printer with backend:', printer.name)
				} catch (error) {
					console.error(
						'Failed to register printer with backend:',
						printer.name,
						error
					)
					// Continue with other printers
				}
			}
		} catch (error) {
			console.error('Failed to register printers with backend:', error)
		}
	}

	private startMonitoring(): void {
		// Start periodic connectivity checks every 5 minutes (much less aggressive)
		// Real-time updates should come via MQTT events, not polling
		this.updateInterval = setInterval(() => {
			this.checkPrinterConnectivity()
		}, 300000) // 5 minutes instead of 5 seconds
	}

	private async checkPrinterConnectivity(): Promise<void> {
		try {
			// Only check basic connectivity, don't poll for full state updates
			// Real-time updates should come via MQTT events
			const promises = this.printers.map(async printer => {
				try {
					const isOnline = await this.checkPrinterOnline(printer)
					const wasOffline = printer.status === 'offline'

					if (!isOnline && printer.status !== 'offline') {
						printer.status = 'offline'
						printer.error = {
							printError: 500,
							errorCode: 500,
							stage: 0,
							lifecycle: 'communication',
							gcodeState: 'unknown',
							message: 'Printer not reachable',
						}
						printer.lastUpdate = new Date()
					} else if (isOnline && wasOffline) {
						// Printer came back online, clear error and set to idle
						printer.status = 'idle'
						printer.error = null
						printer.lastUpdate = new Date()
					}
				} catch (error) {
					console.error(
						`Failed to check connectivity for ${printer.name}:`,
						error
					)
					printer.status = 'offline'
					printer.error = {
						printError: 500,
						errorCode: 500,
						stage: 0,
						lifecycle: 'communication',
						gcodeState: 'unknown',
						message: 'Communication error',
					}
				}
			})

			await Promise.all(promises)

			// Only save and notify if there were connectivity changes
			const hasOfflineChanges = this.printers.some(p => p.status === 'offline')
			if (hasOfflineChanges) {
				await this.savePrinterStates()
				this.notifyListeners({
					type: 'updated',
					data: [...this.printers],
				})
			}
		} catch (error) {
			console.error('Failed to check printer connectivity:', error)
		}
	}

	private async checkPrinterOnline(printer: Printer): Promise<boolean> {
		// Basic connectivity check - ping the printer IP
		// This is lightweight and won't interfere with printer operations
		if (!printer.ip) {
			return false
		}

		try {
			// Simple HTTP HEAD request to check if printer is reachable
			// Most 3D printers have a web interface that responds to basic requests
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

			const response = await fetch(`http://${printer.ip}`, {
				method: 'HEAD',
				signal: controller.signal,
			})

			clearTimeout(timeoutId)
			return response.ok || response.status < 500 // Consider 4xx as "online but auth needed"
		} catch (error) {
			// Network error means printer is offline
			return false
		}
	}

	private updatePrinterFromState(printer: Printer, state: any): void {
		printer.status = state.status
		printer.temperatures = {
			nozzle: state.nozzle_temp || 0,
			bed: state.bed_temp || 0,
			chamber: state.chamber_temp || 0,
		}

		if (state.print_progress !== null) {
			printer.print = {
				fileName: state.print_filename || 'Unknown',
				progress: state.print_progress,
				timeRemaining: state.time_remaining || 0,
				layerCurrent: state.layer_current || 0,
				layerTotal: state.layer_total || 0,
				estimatedTotalTime: state.time_remaining || 0,
			}
		} else {
			printer.print = null
		}

		if (state.filament_type || state.filament_color) {
			printer.filament = {
				type: state.filament_type || 'Unknown',
				color: state.filament_color || 'Unknown',
				remaining: 100, // Default value since we don't track this yet
			}
		} else {
			printer.filament = null
		}

		if (state.error_message || state.error_code) {
			printer.error = {
				printError: state.error_code || 0,
				errorCode: state.error_code || 0,
				stage: 0,
				lifecycle: 'unknown',
				gcodeState: 'unknown',
				message: state.error_message || 'Unknown error',
			}
		} else {
			printer.error = null
		}

		printer.lastUpdate = new Date()
	}

	private async savePrinterStates(): Promise<void> {
		try {
			const db = await this.getDatabase()

			for (const printer of this.printers) {
				await db.execute(
					`
					INSERT OR REPLACE INTO printer_states 
					(printer_id, status, nozzle_temp, bed_temp, chamber_temp, print_progress, 
					 print_filename, layer_current, layer_total, time_remaining, filament_type, 
					 filament_color, error_message, error_code, last_seen, updated_at)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
				`,
					[
						printer.id,
						printer.status,
						printer.temperatures.nozzle,
						printer.temperatures.bed,
						printer.temperatures.chamber,
						printer.print?.progress || null,
						printer.print?.fileName || null,
						printer.print?.layerCurrent || null,
						printer.print?.layerTotal || null,
						printer.print?.timeRemaining || null,
						printer.filament?.type || null,
						printer.filament?.color || null,
						printer.error?.message || null,
						null, // error_code (not used in current types)
					]
				)
			}
		} catch (error) {
			console.error('Failed to save printer states:', error)
		}
	}

	private async getDatabase() {
		// Return existing instance if available
		if (this.databaseInstance) {
			return this.databaseInstance
		}

		// Import Database dynamically to avoid issues in development
		const Database = (await import('@tauri-apps/plugin-sql')).default

		try {
			// Load the database (this will create it if it doesn't exist and run migrations)
			console.log('Loading database sqlite:printpulse.db')
			this.databaseInstance = await Database.load('sqlite:printpulse.db')
			console.log('Database loaded successfully')
			return this.databaseInstance
		} catch (error) {
			console.error('Failed to load database:', error)
			throw new Error(
				`Database connection failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			)
		}
	}

	async addPrinter(config: PrinterConfig): Promise<void> {
		try {
			console.log('Adding printer config:', config)

			// Save config to database
			const db = await this.getDatabase()
			console.log('Database connection obtained')

			await db.execute(
				`
				INSERT OR REPLACE INTO printers (id, name, model, ip, access_code, serial, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
			`,
				[
					config.id,
					config.name,
					config.model,
					config.ip,
					config.access_code,
					config.serial,
				]
			)
			console.log('Database insert completed for:', config.name)

			// Register with backend MQTT service
			try {
				const { invoke } = await import('@tauri-apps/api/core')
				await invoke('add_printer', { config })
				console.log(
					'Printer registered with backend MQTT service:',
					config.name
				)
			} catch (error) {
				console.error('Failed to register printer with backend:', error)
				// Continue anyway - the printer is saved in the database
			}

			// Create printer object
			const newPrinter: Printer = {
				id: config.id,
				name: config.name,
				model: config.model,
				status: 'offline',
				ip: config.ip,
				accessCode: config.access_code,
				serial: config.serial,
				temperatures: {
					nozzle: 0,
					bed: 0,
					chamber: 0,
				},
				print: null,
				filament: null,
				error: null,
				lastUpdate: new Date(),
			}

			this.printers.push(newPrinter)

			// Notify listeners
			this.notifyListeners({
				type: 'printer_added',
				data: newPrinter,
			})

			this.notifyListeners({
				type: 'updated',
				data: [...this.printers],
			})
		} catch (error) {
			console.error('Failed to add printer:', config.name, error)

			// Provide more specific error information
			if (error instanceof Error) {
				throw new Error(`Database error: ${error.message}`)
			} else {
				throw new Error(`Database error: ${JSON.stringify(error)}`)
			}
		}
	}

	async removePrinter(printerId: string): Promise<void> {
		try {
			// Remove from database
			const db = await this.getDatabase()
			await db.execute('DELETE FROM printers WHERE id = $1', [printerId])

			// Remove from backend MQTT service
			try {
				const { invoke } = await import('@tauri-apps/api/core')
				await invoke('remove_printer', { printer_id: printerId })
				console.log('Removed printer from backend:', printerId)
			} catch (error) {
				console.error('Failed to remove printer from backend:', error)
				// Continue anyway - the printer is removed from the database
			}

			// Remove from memory
			const index = this.printers.findIndex(p => p.id === printerId)
			if (index !== -1) {
				const removedPrinter = this.printers.splice(index, 1)[0]

				// Notify listeners
				this.notifyListeners({
					type: 'printer_removed',
					data: removedPrinter,
				})

				this.notifyListeners({
					type: 'updated',
					data: [...this.printers],
				})
			}
		} catch (error) {
			console.error('Failed to remove printer:', error)
			throw error
		}
	}

	async pausePrint(printerId: string): Promise<void> {
		const printer = this.printers.find(p => p.id === printerId)
		if (printer && printer.status === 'printing') {
			// Send pause command to actual printer
			const { invoke } = await import('@tauri-apps/api/core')
			await invoke('pause_printer', { printer_id: printerId })

			printer.status = 'paused'
			printer.lastUpdate = new Date()

			this.notifyListeners({
				type: 'printer_paused',
				data: printer,
			})
		}
	}

	async resumePrint(printerId: string): Promise<void> {
		const printer = this.printers.find(p => p.id === printerId)
		if (printer && printer.status === 'paused') {
			// Send resume command to actual printer
			const { invoke } = await import('@tauri-apps/api/core')
			await invoke('resume_printer', { printer_id: printerId })

			printer.status = 'printing'
			printer.lastUpdate = new Date()

			this.notifyListeners({
				type: 'printer_resumed',
				data: printer,
			})
		}
	}

	async stopPrint(printerId: string): Promise<void> {
		const printer = this.printers.find(p => p.id === printerId)
		if (
			printer &&
			(printer.status === 'printing' || printer.status === 'paused')
		) {
			// Send stop command to actual printer
			const { invoke } = await import('@tauri-apps/api/core')
			await invoke('stop_printer', { printer_id: printerId })

			printer.status = 'idle'
			printer.print = null
			printer.error = null
			printer.lastUpdate = new Date()

			this.notifyListeners({
				type: 'printer_stopped',
				data: printer,
			})
		}
	}

	getPrinters(): Printer[] {
		return [...this.printers]
	}

	getPrinter(id: string): Printer | undefined {
		return this.printers.find(p => p.id === id)
	}

	getStatistics(): PrinterStatistics {
		const total = this.printers.length
		const online = this.printers.filter(p => p.status !== 'offline').length
		const offline = total - online
		const printing = this.printers.filter(p => p.status === 'printing').length
		const idle = this.printers.filter(p => p.status === 'idle').length
		const error = this.printers.filter(p => p.status === 'error').length

		return {
			total,
			online,
			offline,
			printing,
			idle,
			error,
		}
	}

	// Manual refresh method for user-initiated updates
	async refreshPrinterStates(): Promise<void> {
		try {
			await this.checkPrinterConnectivity()
			// In a real implementation, this would also trigger MQTT state refresh
			// or make direct API calls to get current printer states
		} catch (error) {
			console.error('Failed to refresh printer states:', error)
		}
	}

	addEventListener(listener: (event: PrinterServiceEvent) => void): void {
		this.listeners.push(listener)
	}

	removeEventListener(listener: (event: PrinterServiceEvent) => void): void {
		const index = this.listeners.indexOf(listener)
		if (index !== -1) {
			this.listeners.splice(index, 1)
		}
	}

	private notifyListeners(event: PrinterServiceEvent): void {
		this.listeners.forEach(listener => {
			try {
				listener(event)
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

		this.listeners = []
		this.printers = []
		this.isInitialized = false
	}
}
