import { View } from '@nativescript/core';

/**
 * Třída s animačními utilitami pro konzistentní animace napříč aplikací.
 *
 * Zapouzdřuje NativeScript View.animate() do znovupoužitelných statických
 * metod, aby všechny interakce měly jednotný vizuální styl a délku trvání.
 *
 * @example
 * // snímek stisku tlačítka
 * AnimationUtils.pressFeedback(args.object as View);
 */
export class AnimationUtils {

    /** Výchozí délka animace v ms. */
    private static readonly DEFAULT_DURATION: number = 300;

    /** Délka krátké (mikro) animace v ms. */
    private static readonly FAST_DURATION: number = 150;

    private constructor() {
        // statická třída – instanci nelze vytvořit
    }

    /**
     * Plynule zobrazí pohled (opacity 0 -> 1).
     * @param view Pohled k animaci.
     * @param duration Délka animace v ms (výchozí 300).
     */
    static fadeIn(view: View, duration: number = AnimationUtils.DEFAULT_DURATION): Promise<void> {
        return view.animate({ opacity: 1, duration });
    }

    /**
     * Plynule skryje pohled (opacity -> 0).
     * @param view Pohled k animaci.
     * @param duration Délka animace v ms (výchozí 300).
     */
    static fadeOut(view: View, duration: number = AnimationUtils.DEFAULT_DURATION): Promise<void> {
        return view.animate({ opacity: 0, duration });
    }

    /**
     * Zobrazí pohled sjížděním zdola nahoru.
     * @param view Pohled k animaci.
     * @param duration Délka animace v ms (výchozí 300).
     */
    static slideInFromBottom(view: View, duration: number = AnimationUtils.DEFAULT_DURATION): Promise<void> {
        return view
            .animate({ translate: { x: 0, y: 40 }, opacity: 0, duration: 0 })
            .then(() => view.animate({ translate: { x: 0, y: 0 }, opacity: 1, duration }));
    }

    /**
     * Zobrazí pohled příjezdem zleva.
     * @param view Pohled k animaci.
     * @param duration Délka animace v ms (výchozí 300).
     */
    static slideInFromLeft(view: View, duration: number = AnimationUtils.DEFAULT_DURATION): Promise<void> {
        return view
            .animate({ translate: { x: -40, y: 0 }, opacity: 0, duration: 0 })
            .then(() => view.animate({ translate: { x: 0, y: 0 }, opacity: 1, duration }));
    }

    /**
     * Zobrazí pohled příjezdem zprava.
     * @param view Pohled k animaci.
     * @param duration Délka animace v ms (výchozí 300).
     */
    static slideInFromRight(view: View, duration: number = AnimationUtils.DEFAULT_DURATION): Promise<void> {
        return view
            .animate({ translate: { x: 40, y: 0 }, opacity: 0, duration: 0 })
            .then(() => view.animate({ translate: { x: 0, y: 0 }, opacity: 1, duration }));
    }

    /**
     * Vizuální odezva na stisk tlačítka: krátké zmenšení a zpětné zvětšení.
     * @param view Stisknutý pohled (obvykle args.object).
     */
    static async pressFeedback(view: View): Promise<void> {
        await view.animate({ scale: { x: 0.95, y: 0.95 }, duration: AnimationUtils.FAST_DURATION });
        await view.animate({ scale: { x: 1, y: 1 }, duration: AnimationUtils.FAST_DURATION });
    }

    /**
     * Zvýraznění chyby krátkým otřesením pohledu do stran.
     * @param view Pohled k otřesení (např. pole s nevalidním vstupem).
     */
    static async shake(view: View): Promise<void> {
        await view.animate({ translate: { x: -8, y: 0 }, duration: 50 });
        await view.animate({ translate: { x: 8, y: 0 }, duration: 50 });
        await view.animate({ translate: { x: -4, y: 0 }, duration: 50 });
        await view.animate({ translate: { x: 0, y: 0 }, duration: 50 });
    }

    /**
     * "Pop" animace – rychlé zvětšení pro výrazné zvýraznění (např. nová karta).
     * @param view Pohled k animaci.
     */
    static async popIn(view: View): Promise<void> {
        await view.animate({ scale: { x: 0.8, y: 0.8 }, opacity: 0, duration: 0 });
        await view.animate({ scale: { x: 1.05, y: 1.05 }, opacity: 1, duration: AnimationUtils.FAST_DURATION });
        await view.animate({ scale: { x: 1, y: 1 }, duration: AnimationUtils.FAST_DURATION });
    }

    /**
     * Postupné odhalení sekce s malým posunem nahoru (používá fade + slide).
     * @param view Pohled k animaci.
     * @param duration Délka animace v ms (výchozí 300).
     */
    static revealSection(view: View, duration: number = AnimationUtils.DEFAULT_DURATION): Promise<void> {
        return view
            .animate({ translate: { x: 0, y: 20 }, opacity: 0, duration: 0 })
            .then(() => view.animate({ translate: { x: 0, y: 0 }, opacity: 1, duration }));
    }
}
