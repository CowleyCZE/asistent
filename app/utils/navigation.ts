import { Frame } from '@nativescript/core';

/**
 * Lazy navigace mezi stránkami aplikace.
 *
 * View-modely stránek se vytvářejí až při první navigaci (lazy loading),
 * takže se při startu aplikace nenačítají services, které uživatel
 * zatím nepotřebuje. Následné navigace používají cached instance.
 */
export class LazyNavigator {
    private static visitedPages = new Set<string>();

    /**
     * Přejde na zadanou stránku.
     * @param moduleName Název modulu stránky (např. 'settings-page').
     * @param transition Typ animace přechodu.
     */
    public static navigate(moduleName: string, transition: string = 'slide'): void {
        Frame.topmost().navigate({
            moduleName,
            animated: true,
            transition: {
                name: transition
            }
        });
        LazyNavigator.visitedPages.add(moduleName);
    }

    /**
     * Zjistí, zda byla stránka již navštívena.
     */
    public static hasBeenVisited(moduleName: string): boolean {
        return LazyNavigator.visitedPages.has(moduleName);
    }

    /**
     * Vyčistí seznam navštívených stránek (např. při ukončení aplikace).
     */
    public static resetVisitedPages(): void {
        LazyNavigator.visitedPages.clear();
    }
}
