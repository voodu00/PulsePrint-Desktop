import React from 'react'
import {
	Printer,
	Thermometer,
	Layers,
	Clock,
	AlertTriangle,
	Pause,
	Play,
	Square,
	Wifi,
	WifiOff,
	Loader2
} from 'lucide-react'
import { Printer as PrinterType } from '../types/printer'
import { formatTime } from '../utils/formatTime'
import { useSettings } from '../contexts/SettingsContext'

interface PrinterCardProps {
	printer: PrinterType
	onPause: (printerId: string) => void
	onResume: (printerId: string) => void
	onStop: (printerId: string) => void
}

const PrinterCard: React.FC<PrinterCardProps> = ({
	printer,
	onPause,
	onResume,
	onStop
}) => {
	const { settings } = useSettings()
	const isOnline = printer.status !== 'offline'
	const isPrinting = printer.status === 'printing'
	const isPaused = printer.status === 'paused'
	const isError = printer.status === 'error'

	const getStatusIcon = (status: string) => {
		const iconProps = { className: 'w-3 h-3 mr-1' }

		switch (status) {
			case 'idle':
				return <Wifi {...iconProps} />
			case 'printing':
				return <Play {...iconProps} />
			case 'paused':
				return <Pause {...iconProps} />
			case 'error':
				return <AlertTriangle {...iconProps} />
			case 'offline':
				return <WifiOff {...iconProps} />
			case 'connecting':
				return (
					<Loader2
						{...iconProps}
						className="w-3 h-3 mr-1 animate-spin"
					/>
				)
			default:
				return <Wifi {...iconProps} />
		}
	}

	const renderTemperatures = () => {
		if (!settings.showTemperatures) return null

		const hasTemperatures =
			printer.temperatures.nozzle > 0 ||
			printer.temperatures.bed > 0 ||
			printer.temperatures.chamber > 0

		if (!isOnline || !hasTemperatures) return null

		return (
			<div className="space-y-2">
				<div className="flex items-center gap-1 text-sm text-muted-foreground">
					<Thermometer className="w-4 h-4" />
					Temperatures
				</div>
				<div className="temperature-grid">
					{printer.temperatures.nozzle > 0 && (
						<div className="temperature-item">
							<span className="text-muted-foreground">Nozzle:</span>
							<span
								className={`font-medium ${
									printer.temperatures.nozzle > 150
										? 'temperature-hot'
										: printer.temperatures.nozzle > 50
										? 'temperature-warm'
										: ''
								}`}
							>
								{Math.round(printer.temperatures.nozzle)}°C
							</span>
						</div>
					)}
					{printer.temperatures.bed > 0 && (
						<div className="temperature-item">
							<span className="text-muted-foreground">Bed:</span>
							<span
								className={`font-medium ${
									printer.temperatures.bed > 80
										? 'temperature-hot'
										: printer.temperatures.bed > 40
										? 'temperature-warm'
										: ''
								}`}
							>
								{Math.round(printer.temperatures.bed)}°C
							</span>
						</div>
					)}
					{printer.temperatures.chamber > 0 && (
						<div className="temperature-item col-span-2">
							<span className="text-muted-foreground">Chamber:</span>
							<span
								className={`font-medium ${
									printer.temperatures.chamber > 50 ? 'temperature-warm' : ''
								}`}
							>
								{Math.round(printer.temperatures.chamber)}°C
							</span>
						</div>
					)}
				</div>
			</div>
		)
	}

	const renderPrintProgress = () => {
		if (!settings.showProgress) return null
		if (!(isPrinting || isPaused) || !printer.print) return null

		return (
			<>
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Progress</span>
						<span className="font-medium">
							{Math.round(printer.print.progress)}%
						</span>
					</div>
					<div className="progress">
						<div
							className="progress-bar"
							style={{ width: `${Math.round(printer.print.progress)}%` }}
						/>
					</div>
					{printer.print.fileName && (
						<p className="text-sm text-muted-foreground truncate">
							📄 {printer.print.fileName}
						</p>
					)}
				</div>

				<div className="print-info">
					{printer.print.layerCurrent > 0 && printer.print.layerTotal > 0 && (
						<div className="print-info-item">
							<Layers className="w-4 h-4 text-muted-foreground" />
							<span>
								Layer {printer.print.layerCurrent}/{printer.print.layerTotal}
							</span>
						</div>
					)}
					{printer.print.timeRemaining > 0 && (
						<div className="print-info-item">
							<Clock className="w-4 h-4 text-muted-foreground" />
							<span>{formatTime(printer.print.timeRemaining)} left</span>
						</div>
					)}
				</div>
			</>
		)
	}

	const renderFilamentInfo = () => {
		if (!printer.filament?.type) return null

		return (
			<div className="space-y-2">
				<div className="text-sm text-muted-foreground">🧵 Filament</div>
				<div className="flex justify-between text-sm">
					<span>{printer.filament.type}</span>
					{printer.filament.color && (
						<span className="flex items-center gap-1">
							<div
								className="w-3 h-3 rounded-full border"
								style={{ backgroundColor: printer.filament.color }}
							/>
							{printer.filament.color}
						</span>
					)}
				</div>
			</div>
		)
	}

	const renderErrorInfo = () => {
		if (!printer.error) return null

		return (
			<div className="space-y-2">
				<div className="flex items-center gap-1 text-sm text-red-500">
					<AlertTriangle className="w-4 h-4" />
					{isError ? 'Active Error' : 'Error Condition'}
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2 dark:bg-red-950/20 dark:border-red-800/50">
					<p className="text-sm font-medium text-red-800 dark:text-red-400">
						{printer.error.message}
					</p>
					<div className="grid grid-cols-2 gap-2 text-xs text-red-600 dark:text-red-500">
						{printer.error.errorCode && (
							<div>
								<span className="font-medium">Error Code:</span>{' '}
								{printer.error.errorCode}
							</div>
						)}
						{printer.error.stage !== undefined && (
							<div>
								<span className="font-medium">Stage:</span>{' '}
								{printer.error.stage}
							</div>
						)}
					</div>
				</div>
			</div>
		)
	}

	const renderControlButtons = () => {
		if (!isOnline || !(isPrinting || isPaused)) return null

		return (
			<div className="control-buttons">
				{isPrinting && (
					<button
						className="btn btn-outline btn-sm"
						onClick={() => onPause(printer.id)}
					>
						<Pause className="w-4 h-4 mr-1" />
						Pause
					</button>
				)}
				{isPaused && (
					<button
						className="btn btn-default btn-sm"
						onClick={() => onResume(printer.id)}
					>
						<Play className="w-4 h-4 mr-1" />
						Resume
					</button>
				)}
				<button
					className="btn btn-destructive btn-sm"
					onClick={() => onStop(printer.id)}
				>
					<Square className="w-4 h-4 mr-1" />
					Stop
				</button>
			</div>
		)
	}

	// Determine flash classes based on settings
	const getFlashClasses = () => {
		const classes = []
		if (settings.idleNotifications && printer.status === 'idle') {
			classes.push('printer-card-idle-flash')
		}
		if (settings.errorNotifications && printer.status === 'error') {
			classes.push('printer-card-error-flash')
		}
		return classes.join(' ')
	}

	return (
		<div
			className={`card printer-card status-${
				printer.status
			} ${getFlashClasses()}`}
			id={`printer-${printer.id}`}
		>
			<div className="card-header">
				<div className="flex items-center justify-between">
					<h3 className="card-title flex items-center gap-2 text-base">
						<Printer className="w-5 h-5" />
						{printer.name}
					</h3>
					<div className={`badge badge-${printer.status}`}>
						{getStatusIcon(printer.status)}
						{printer.status.charAt(0).toUpperCase() + printer.status.slice(1)}
					</div>
				</div>
			</div>

			<div className="card-content space-y-4">
				{renderPrintProgress()}
				{renderTemperatures()}
				{renderFilamentInfo()}
				{renderErrorInfo()}
				{renderControlButtons()}

				<div className="text-xs text-muted-foreground">
					Last update: {printer.lastUpdate.toLocaleTimeString()}
				</div>
			</div>
		</div>
	)
}

export default PrinterCard
