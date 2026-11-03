import { EventData, Page } from '@nativescript/core';
import { MainViewModel } from './main-view-model';

// Lazy loading – view-model se vytvoří až při první navigaci
// a další navigace používají již existující (cached) instanci.
let viewModel: MainViewModel | null = null;

export function navigatingTo(args: EventData) {
    const page = <Page>args.object;
    if (!viewModel) {
        viewModel = new MainViewModel();
    }
    page.bindingContext = viewModel;
}

/**
 * Zahodí cached view-model (např. pro testování nebo úplný refresh stránky).
 */
export function resetViewModel(): void {
    viewModel = null;
}
