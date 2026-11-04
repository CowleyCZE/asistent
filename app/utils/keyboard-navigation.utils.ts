import { Page } from '@nativescript/core';

/** Akce stisku klávesy v Android KeyEvent. */
const ACTION_DOWN = 0;

/** Android kódy kláves (android.view.KeyEvent). */
const KEYCODE_DPAD_UP = 19;
const KEYCODE_DPAD_DOWN = 20;
const KEYCODE_DPAD_LEFT = 21;
const KEYCODE_DPAD_RIGHT = 22;
const KEYCODE_ENTER = 66;
const KEYCODE_SPACE = 62;

/** Směry hledání fokusu (android.view.View). */
const FOCUS_UP = 33;
const FOCUS_DOWN = 130;
const FOCUS_LEFT = 17;
const FOCUS_RIGHT = 66;

/**
 * Pomocná třída pro ovládání aplikace hardwarovou klávesnicí nebo D-padem
 * (Android TV, Bluetooth klávesnice, accessibility ovladače).
 *
 * Šipky/D-pad posouvají fokus mezi fokustovatelnými prvky,
 * Enter/Mezerník aktivují právě zafokussované tlačítko.
 */
export class KeyboardNavigationHelper {

    private constructor() {
        // statická třída – instanci nelze vytvořit
    }

    /**
     * Připojí obsluhu hardwarových kláves na stránku (jen Android;
     * na iOS/jiných platformách je volání bezpečným no-op).
     * @param page Stránka, na kterou se má obsluha napojit.
     */
    public static attach(page: Page): void {
        try {
            const g: any = global;
            if (!g.android || !page.android) {
                return;
            }

            const androidView: any = page.android;
            const listener = new g.android.view.View.OnKeyListener({
                /**
                 * Obsluha stisku hardwarové klávesy.
                 * @param v Android view, který má fokus.
                 * @param keyCode Kód klávesy (android.view.KeyEvent).
                 * @param event Objekt události KeyEvent.
                 * @returns true, pokud byla klávesa zpracována.
                 */
                onKey: (v: any, keyCode: number, event: any): boolean => {
                    if (!event || event.getAction() !== ACTION_DOWN) {
                        return false;
                    }

                    switch (keyCode) {
                        case KEYCODE_DPAD_UP:
                            return KeyboardNavigationHelper.moveFocus(v, FOCUS_UP);
                        case KEYCODE_DPAD_DOWN:
                            return KeyboardNavigationHelper.moveFocus(v, FOCUS_DOWN);
                        case KEYCODE_DPAD_LEFT:
                            return KeyboardNavigationHelper.moveFocus(v, FOCUS_LEFT);
                        case KEYCODE_DPAD_RIGHT:
                            return KeyboardNavigationHelper.moveFocus(v, FOCUS_RIGHT);
                        case KEYCODE_ENTER:
                        case KEYCODE_SPACE:
                            return KeyboardNavigationHelper.activateFocused(v);
                        default:
                            return false;
                    }
                },
            });

            androidView.setFocusableInTouchMode(true);
            androidView.setFocusable(true);
            androidView.setOnKeyListener(listener);
        } catch (error) {
            console.error('KeyboardNavigationHelper.attach selhalo:', error);
        }
    }

    /**
     * Přesune fokus na nejbližší fokustovatelný pohled v daném směru.
     * @param currentView Android view, od kterého se hledá.
     * @param direction Směr hledání (android.view.View.FOCUS_*).
     * @returns true, pokud se fokus přesunul.
     */
    private static moveFocus(currentView: any, direction: number): boolean {
        try {
            const next = currentView.focusSearch(direction);
            if (next) {
                next.requestFocus();
                return true;
            }
        } catch (error) {
            console.error('KeyboardNavigationHelper.moveFocus selhalo:', error);
        }
        return false;
    }

    /**
     * Aktivuje (klikne) zafokussované tlačítko pomocí Enter/Mezerníku.
     * @param focusedView Zafokussovaný Android view.
     * @returns true, pokud byla akce provedena.
     */
    private static activateFocused(focusedView: any): boolean {
        try {
            if (focusedView && typeof focusedView.performClick === 'function') {
                focusedView.performClick();
                return true;
            }
        } catch (error) {
            console.error('KeyboardNavigationHelper.activateFocused selhalo:', error);
        }
        return false;
    }
}
