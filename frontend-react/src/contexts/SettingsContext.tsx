import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react'
import { SettingsState, defaultSettings } from '../types/settings'

interface SettingsContextType {
	settings: SettingsState
	updateSetting: <K extends keyof SettingsState>(
		key: K,
		value: SettingsState[K]
	) => void
	resetSettings: () => void
	hasUnsavedChanges: boolean
	saveSettings: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(
	undefined
)

export const useSettings = () => {
	const context = useContext(SettingsContext)
	if (!context) {
		throw new Error('useSettings must be used within a SettingsProvider')
	}
	return context
}

interface SettingsProviderProps {
	children: ReactNode
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
	children,
}) => {
	const [settings, setSettings] = useState<SettingsState>(defaultSettings)
	const [savedSettings, setSavedSettings] =
		useState<SettingsState>(defaultSettings)
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

	// Load settings from localStorage on mount
	useEffect(() => {
		const savedSettingsStr = localStorage.getItem('printpulse-desktop-settings')
		if (savedSettingsStr) {
			try {
				const parsed = JSON.parse(savedSettingsStr)
				const mergedSettings = { ...defaultSettings, ...parsed }
				setSettings(mergedSettings)
				setSavedSettings(mergedSettings)
				// Apply dark mode immediately on load
				applyDarkMode(mergedSettings.darkMode)
			} catch (error) {
				console.error('Failed to load settings:', error)
			}
		}
	}, [])

	// Apply dark mode to document
	const applyDarkMode = (isDark: boolean) => {
		if (isDark) {
			document.documentElement.classList.add('dark')
		} else {
			document.documentElement.classList.remove('dark')
		}
	}

	// Watch for dark mode changes and apply them immediately
	useEffect(() => {
		applyDarkMode(settings.darkMode)
	}, [settings.darkMode])

	// Check for unsaved changes
	useEffect(() => {
		const hasChanges =
			JSON.stringify(settings) !== JSON.stringify(savedSettings)
		setHasUnsavedChanges(hasChanges)
	}, [settings, savedSettings])

	const updateSetting = <K extends keyof SettingsState>(
		key: K,
		value: SettingsState[K]
	) => {
		setSettings(prev => ({ ...prev, [key]: value }))
	}

	const saveSettings = () => {
		localStorage.setItem(
			'printpulse-desktop-settings',
			JSON.stringify(settings)
		)
		setSavedSettings(settings)
		setHasUnsavedChanges(false)

		// Dispatch custom event to notify other components
		window.dispatchEvent(
			new CustomEvent('settingsChanged', { detail: settings })
		)
	}

	const resetSettings = () => {
		setSettings(defaultSettings)
	}

	return (
		<SettingsContext.Provider
			value={{
				settings,
				updateSetting,
				resetSettings,
				hasUnsavedChanges,
				saveSettings,
			}}
		>
			{children}
		</SettingsContext.Provider>
	)
}
