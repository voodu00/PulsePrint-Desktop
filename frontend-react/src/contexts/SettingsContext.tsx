import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { SettingsState } from '../types/settings';
import { TauriMqttService } from '../services/TauriMqttService';

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (newSettings: Partial<SettingsState>) => Promise<void>;
  updateSetting: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => Promise<void>;
  hasUnsavedChanges: boolean;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const [settings, setSettings] = useState<SettingsState>({
    darkMode: false,
    showTemperatures: true,
    idleNotifications: true,
    errorNotifications: true,
    soundNotifications: false,
    showProgress: true,
    compactView: false,
    viewMode: 'card',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<SettingsState>({
    darkMode: false,
    showTemperatures: true,
    idleNotifications: true,
    errorNotifications: true,
    soundNotifications: false,
    showProgress: true,
    compactView: false,
    viewMode: 'card',
  });

  const mqttService = TauriMqttService.getInstance();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await mqttService.getSettings();
        setSettings(savedSettings);
        setOriginalSettings(savedSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [mqttService]);

  // Apply dark mode to document element
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const updateSettings = async (newSettings: Partial<SettingsState>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    await mqttService.saveSettings(updatedSettings);
    setOriginalSettings(updatedSettings);
    setHasUnsavedChanges(false);
  };

  const updateSetting = async <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    setHasUnsavedChanges(true);
  };

  const saveSettings = async () => {
    await mqttService.saveSettings(settings);
    setOriginalSettings(settings);
    setHasUnsavedChanges(false);
  };

  const resetSettings = async () => {
    setSettings(originalSettings);
    setHasUnsavedChanges(false);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateSetting,
        hasUnsavedChanges,
        saveSettings,
        resetSettings,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
