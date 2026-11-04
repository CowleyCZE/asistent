import { EventData, Page } from '@nativescript/core';
import { SettingsViewModel } from './settings-view-model';

// Lazy loading – view-model se vytvoří až při první navigaci
// a další navigace používají již existující (cached) instanci.
let viewModel: SettingsViewModel | null = null;

/**
 * Obsluha navigace na stránku: vytvoří (lazy) nebo použije cached view-model
 * a naváže ho na bindingContext stránky.
 */
export function navigatingTo(args: EventData) {
    const page = <Page>args.object;
    if (!viewModel) {
        viewModel = new SettingsViewModel();
    }
    page.bindingContext = viewModel;
}

/**
 * Zahodí cached view-model (např. pro testování nebo úplný refresh stránky).
 */
export function resetViewModel(): void {
    viewModel = null;
}
