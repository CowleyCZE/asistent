import { Application } from '@nativescript/core';
import './app.css';
import { ThemeService } from './services/theme.service';
import { serviceRegistry } from './services/service-registry';
import { serviceLocator, ServiceTokens } from './services/service-locator';

// Inicializace motivu. POZOR: v NativeScript runtime neexistuje DOM (document),
// motiv se aplikuje přes CSS třídy (.dark/.light/.high-contrast) na kořenový view.
// ThemeService se získává z serviceLocatoru (singleton) – dříve se zde vytvářela
// nezávislá instance `new ThemeService()`, takže app.ts a stránky aplikovaly
// motiv různými instancemi téže služby.
const themeService = serviceLocator.get<ThemeService>(ServiceTokens.ThemeService);

// Register cleanup on application exit
Application.on(Application.exitEvent, () => {
    console.log('Application exiting. Cleaning up resources...');
    serviceRegistry.disposeAll();
});

// Export theme service and service registry for use in other modules
export { themeService, serviceRegistry };

Application.run({ moduleName: 'app-root' });

// Motiv aplikujeme až po launchEvent – volání hned po Application.run()
// bylo nespolehlivé (kořenový view v tu chvíli ještě nemusí existovat).
// Staré přímé volání jsme proto odstranili, zůstává jediný handler
// na launchEvent, který běží až když kořenový view skutečně existuje.
Application.on(Application.launchEvent, () => themeService.applyThemeToRootView());
