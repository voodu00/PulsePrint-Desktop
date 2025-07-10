import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import { SettingsProvider } from './contexts/SettingsContext';
import { TauriMqttService } from './services/TauriMqttService';
import './index.css';

type View = 'dashboard' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [printerService] = useState(() => TauriMqttService.getInstance());

  const showSettings = () => setCurrentView('settings');
  const showDashboard = () => setCurrentView('dashboard');

  return (
    <SettingsProvider>
      {currentView === 'dashboard' && (
        <Dashboard
          onShowSettings={showSettings}
          printerService={printerService}
        />
      )}
      {currentView === 'settings' && (
        <Settings onBack={showDashboard} printerService={printerService} />
      )}
    </SettingsProvider>
  );
};

export default App;
