import { KeyboardNavigationHelper } from '../../app/utils/keyboard-navigation.utils';

describe('KeyboardNavigationHelper', () => {
    it('attach je bezpečným no-op mimo Android (iOS/jest prostředí)', () => {
        // V testovacím prostředí není k dispozici global.android,
        // metoda musí být tichá, bez výjimky.
        expect(() => KeyboardNavigationHelper.attach({ android: undefined } as any)).not.toThrow();
    });

    it('attach nevyhodí výjimku ani pro stránku bez android view', () => {
        const g: any = global;
        const savedAndroid = g.android;
        g.android = undefined;
        try {
            expect(() => KeyboardNavigationHelper.attach({} as any)).not.toThrow();
        } finally {
            g.android = savedAndroid;
        }
    });
});
