import { EventData, Page } from '@nativescript/core';
import { HistoryViewModel } from './history-view-model';

// Lazy loading – view-model se vytvoří až při první navigaci
// a další navigace používají již existující (cached) instanci.
let viewModel: HistoryViewModel | null = null;

export function navigatingTo(args: EventData) {
    const page = <Page>args.object;
    if (!viewModel) {
        viewModel = new HistoryViewModel();
    }
    page.bindingContext = viewModel;
}

/**
 * Zahodí cached view-model (např. pro testování nebo úplný refresh stránky).
 */
export function resetViewModel(): void {
    viewModel = null;
}
