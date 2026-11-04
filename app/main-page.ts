import { EventData, Page } from '@nativescript/core';
import { KeyboardNavigationHelper } from './utils/keyboard-navigation.utils';
import { MainViewModel } from './main-view-model';

// Lazy loading – view-model se vytvoří až při první navigaci
// a další navigace používají již existující (cached) instanci.
let viewModel: MainViewModel | null = null;

/**
 * Obsluha navigace na stránku: vytvoří (lazy) nebo použije cached view-model
 * a naváže ho na bindingContext stránky.
 */
export function navigatingTo(args: EventData) {
    const page = <Page>args.object;
    if (!viewModel) {
        viewModel = new MainViewModel();
    }
    page.bindingContext = viewModel;

    // Hardwarová klávesnice / D-pad (Android TV, accessibility ovladače)
    KeyboardNavigationHelper.attach(page);
}

/**
 * Zahodí cached view-model (např. pro testování nebo úplný refresh stránky).
 */
export function resetViewModel(): void {
    viewModel = null;
}
