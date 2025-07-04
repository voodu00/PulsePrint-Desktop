import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import {
	ArrowLeft,
	Bell,
	Settings as SettingsIcon,
	Monitor,
	Wifi,
	Save,
	RotateCcw,
	RefreshCw,
	Moon,
	Sun
} from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'

interface SettingsProps {
	onBack: () => void
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
	const {
		settings,
		updateSetting,
		hasUnsavedChanges,
		saveSettings,
		resetSettings
	} = useSettings()

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button
							variant="outline"
							size="sm"
							onClick={onBack}
						>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to Dashboard
						</Button>
						<div>
							<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
								<SettingsIcon className="w-8 h-8" />
								Settings
							</h1>
							<p className="text-muted-foreground">
								Configure your PrintPulse desktop preferences
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{hasUnsavedChanges && (
							<Button
								onClick={saveSettings}
								className="flex items-center gap-2"
							>
								<Save className="w-4 h-4" />
								Save Changes
							</Button>
						)}
						<Button
							variant="outline"
							onClick={resetSettings}
							className="flex items-center gap-2"
						>
							<RotateCcw className="w-4 h-4" />
							Reset
						</Button>
					</div>
				</div>

				{/* Notifications Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Bell className="w-5 h-5" />
							Notifications
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h3 className="text-sm font-medium">Idle Printer Alerts</h3>
								<p className="text-sm text-muted-foreground">
									Make idle printer cards flash slowly to draw attention when
									they're not printing
								</p>
								{settings.idleNotifications && (
									<div className="flex items-center gap-2 mt-2">
										<div className="w-4 h-4 bg-blue-500 rounded idle-flash" />
										<span className="text-xs text-blue-600 font-medium">
											Preview: Idle cards will flash like this
										</span>
									</div>
								)}
							</div>
							<div className="flex items-center gap-2">
								<Switch
									checked={settings.idleNotifications}
									onCheckedChange={(checked: boolean) =>
										updateSetting('idleNotifications', checked)
									}
								/>
								<Badge
									variant={settings.idleNotifications ? 'default' : 'secondary'}
								>
									{settings.idleNotifications ? 'Enabled' : 'Disabled'}
								</Badge>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h3 className="text-sm font-medium">Error Printer Alerts</h3>
								<p className="text-sm text-muted-foreground">
									Make error printer cards flash with red glow to draw attention
									when they have errors
								</p>
								{settings.errorNotifications && (
									<div className="flex items-center gap-2 mt-2">
										<div className="w-4 h-4 bg-red-500 rounded error-flash" />
										<span className="text-xs text-red-600 font-medium">
											Preview: Error cards will flash like this
										</span>
									</div>
								)}
							</div>
							<div className="flex items-center gap-2">
								<Switch
									checked={settings.errorNotifications}
									onCheckedChange={(checked: boolean) =>
										updateSetting('errorNotifications', checked)
									}
								/>
								<Badge
									variant={
										settings.errorNotifications ? 'default' : 'secondary'
									}
								>
									{settings.errorNotifications ? 'Enabled' : 'Disabled'}
								</Badge>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h3 className="text-sm font-medium">Sound Notifications</h3>
								<p className="text-sm text-muted-foreground">
									Play notification sounds for printer status changes
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Switch
									checked={settings.soundNotifications}
									onCheckedChange={(checked: boolean) =>
										updateSetting('soundNotifications', checked)
									}
									disabled
								/>
								<Badge variant="secondary">Coming Soon</Badge>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Display Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Monitor className="w-5 h-5" />
							Display
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h3 className="text-sm font-medium">Show Temperatures</h3>
								<p className="text-sm text-muted-foreground">
									Display temperature information on printer cards
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Switch
									checked={settings.showTemperatures}
									onCheckedChange={(checked: boolean) =>
										updateSetting('showTemperatures', checked)
									}
								/>
								<Badge
									variant={settings.showTemperatures ? 'default' : 'secondary'}
								>
									{settings.showTemperatures ? 'Enabled' : 'Disabled'}
								</Badge>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h3 className="text-sm font-medium">Show Progress Details</h3>
								<p className="text-sm text-muted-foreground">
									Display detailed progress information including layers and
									time
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Switch
									checked={settings.showProgress}
									onCheckedChange={(checked: boolean) =>
										updateSetting('showProgress', checked)
									}
								/>
								<Badge
									variant={settings.showProgress ? 'default' : 'secondary'}
								>
									{settings.showProgress ? 'Enabled' : 'Disabled'}
								</Badge>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h3 className="text-sm font-medium">Compact View</h3>
								<p className="text-sm text-muted-foreground">
									Use a more compact layout for printer cards
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Switch
									checked={settings.compactView}
									onCheckedChange={(checked: boolean) =>
										updateSetting('compactView', checked)
									}
								/>
								<Badge variant={settings.compactView ? 'default' : 'secondary'}>
									{settings.compactView ? 'Enabled' : 'Disabled'}
								</Badge>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h3 className="text-sm font-medium flex items-center gap-2">
									{settings.darkMode ? (
										<Moon className="w-4 h-4" />
									) : (
										<Sun className="w-4 h-4" />
									)}
									Dark Mode
								</h3>
								<p className="text-sm text-muted-foreground">
									Switch between light and dark themes
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Switch
									checked={settings.darkMode}
									onCheckedChange={(checked: boolean) =>
										updateSetting('darkMode', checked)
									}
								/>
								<Badge variant={settings.darkMode ? 'default' : 'secondary'}>
									{settings.darkMode ? 'Dark' : 'Light'}
								</Badge>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* System Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<RefreshCw className="w-5 h-5" />
							System
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h3 className="text-sm font-medium">Auto Refresh</h3>
								<p className="text-sm text-muted-foreground">
									Automatically refresh printer data every{' '}
									{settings.refreshInterval} seconds
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Switch
									checked={settings.autoRefresh}
									onCheckedChange={(checked: boolean) =>
										updateSetting('autoRefresh', checked)
									}
								/>
								<Badge variant={settings.autoRefresh ? 'default' : 'secondary'}>
									{settings.autoRefresh ? 'Enabled' : 'Disabled'}
								</Badge>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h3 className="text-sm font-medium">Refresh Interval</h3>
								<p className="text-sm text-muted-foreground">
									How often to update printer data (in seconds)
								</p>
							</div>
							<div className="flex items-center gap-2">
								<select
									value={settings.refreshInterval}
									onChange={(e) =>
										updateSetting('refreshInterval', Number(e.target.value))
									}
									className="px-3 py-1 border rounded-md bg-background"
									disabled={!settings.autoRefresh}
								>
									<option value={15}>15 seconds</option>
									<option value={30}>30 seconds</option>
									<option value={60}>1 minute</option>
									<option value={120}>2 minutes</option>
									<option value={300}>5 minutes</option>
								</select>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Connection Info */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Wifi className="w-5 h-5" />
							Connection
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
							<div className="space-y-1">
								<p className="font-medium">Connection Type</p>
								<p className="text-muted-foreground">
									Mock Service (Development)
								</p>
							</div>
							<div className="space-y-1">
								<p className="font-medium">Update Method</p>
								<p className="text-muted-foreground">
									Simulated real-time updates
								</p>
							</div>
							<div className="space-y-1">
								<p className="font-medium">Data Source</p>
								<p className="text-muted-foreground">
									Generated mock printer data
								</p>
							</div>
						</div>

						<div className="border-t pt-4">
							<h4 className="font-medium text-sm mb-3">
								MQTT Configuration for Real Printers
							</h4>
							<div className="space-y-2 text-sm text-muted-foreground">
								<p>
									When adding real Bambu Lab printers, you'll need to collect
									these values from each printer:
								</p>
								<ul className="list-disc list-inside space-y-1 ml-2">
									<li>
										<strong>IP Address:</strong> Settings → WLAN → Current
										Status
									</li>
									<li>
										<strong>Access Code:</strong> Settings → WLAN → Access Code
									</li>
									<li>
										<strong>Serial Number:</strong> Settings → Device → Serial
										Number
									</li>
									<li>
										<strong>LAN Mode:</strong> Settings → Network → LAN Mode
										(must be enabled)
									</li>
								</ul>
								<p className="mt-2 text-xs bg-blue-50 dark:bg-blue-950/20 p-2 rounded border border-blue-200 dark:border-blue-800/50">
									<strong>Note:</strong> MQTT connects directly to printers on
									port 8883 (MQTT over TLS) for real-time status updates.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Unsaved Changes Warning */}
				{hasUnsavedChanges && (
					<Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
						<CardHeader>
							<CardTitle className="text-orange-800 dark:text-orange-200">
								Unsaved Changes
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
								You have unsaved changes. Click "Save Changes" to apply them.
							</p>
							<Button
								onClick={saveSettings}
								className="w-full"
							>
								<Save className="w-4 h-4 mr-2" />
								Save Changes
							</Button>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	)
}

export default Settings
