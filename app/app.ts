import { Application } from '@nativescript/core';
import './app.css';
import { ThemeService } from './services/theme.service';
import { serviceRegistry } from './services/service-registry';

// Initialize theme service
const themeService = new ThemeService();

// Apply theme based on saved settings
const settings = themeService.getSettings();
if (settings.mode === 'dark' || (settings.mode === 'system' && themeService.isSystemDarkMode())) {
    document.documentElement?.classList.add('dark');
} else {
    document.documentElement?.classList.remove('dark');
}

// Register cleanup on application exit
Application.on(Application.exitEvent, () => {
    console.log('Application exiting. Cleaning up resources...');
    serviceRegistry.disposeAll();
});

// Export theme service and service registry for use in other modules
export { themeService, serviceRegistry };

Application.run({ moduleName: 'app-root' });
