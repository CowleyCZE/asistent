import { Application } from '@nativescript/core';
import './app.css';
import { ThemeService } from './services/theme.service';
import { serviceRegistry } from './services/service-registry';

// Inicializace motivu. POZOR: v NativeScript runtime neexistuje DOM (document),
// motiv se aplikuje přes CSS třídy (.dark/.light/.high-contrast) na kořenový view.
const themeService = new ThemeService();

/** Aplikuje CSS třídy motivu na kořenový view, jakmile existuje. */
function applyThemeToRootView(): void {
    themeService.applyThemeToRootView();
}

// Register cleanup on application exit
Application.on(Application.exitEvent, () => {
    console.log('Application exiting. Cleaning up resources...');
    serviceRegistry.disposeAll();
});

// Export theme service and service registry for use in other modules
export { themeService, serviceRegistry };

Application.run({ moduleName: 'app-root' });

// Po spuštění aplikace aplikujeme motiv na kořenový view
applyThemeToRootView();
Application.on(Application.launchEvent, () => applyThemeToRootView());
