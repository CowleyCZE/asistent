/**
 * Konfigurace externích API.
 *
 * POZOR: V NativeScript runtime neexistuje globální proměnná `process`
 * (na rozdíl od Node.js) – přímý přístup k `process.env` by způsobil
 * ReferenceError a crash celé aplikace hned při importu tohoto modulu.
 * Proto se hodnota env proměnné čte bezpečně přes `global` s ověřením dostupnosti.
 */

/** Bezpečně přečte hodnotu z process.env (pokud runtime existuje). */
function readEnvVar(name: string): string {
    try {
        const g: any = global;
        const env = g?.process?.env;
        const value = env ? env[name] : undefined;
        return typeof value === 'string' ? value : '';
    } catch (error) {
        // Runtime bez process.env (NativeScript na Androidu) – vrátíme prázdný klíč.
        console.warn(`Proměnná ${name} není v tomto runtime dostupná.`);
        return '';
    }
}

export const API_CONFIG = {
    GOOGLE_TRANSLATE_API_KEY: readEnvVar('GOOGLE_TRANSLATE_API_KEY'),
    GOOGLE_TRANSLATE_API_URL: 'https://translation.googleapis.com/language/translate/v2'
};
