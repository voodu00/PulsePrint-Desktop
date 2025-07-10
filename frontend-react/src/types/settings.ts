export interface SettingsState {
  idleNotifications: boolean;
  errorNotifications: boolean;
  darkMode: boolean;
  soundNotifications: boolean;
  showTemperatures: boolean;
  showProgress: boolean;
  compactView: boolean;
  viewMode: 'card' | 'table';
}

export const defaultSettings: SettingsState = {
  idleNotifications: false,
  errorNotifications: true,
  darkMode: false,
  soundNotifications: false,
  showTemperatures: true,
  showProgress: true,
  compactView: false,
  viewMode: 'card',
};
