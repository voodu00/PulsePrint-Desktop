export interface SettingsState {
	idleNotifications: boolean
	errorNotifications: boolean
	darkMode: boolean
	autoRefresh: boolean
	soundNotifications: boolean
	refreshInterval: number
	showTemperatures: boolean
	showProgress: boolean
	compactView: boolean
}

export const defaultSettings: SettingsState = {
	idleNotifications: false,
	errorNotifications: true,
	darkMode: false,
	autoRefresh: true,
	soundNotifications: false,
	refreshInterval: 30,
	showTemperatures: true,
	showProgress: true,
	compactView: false,
}
