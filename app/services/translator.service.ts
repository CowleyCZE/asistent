import { Http } from '@nativescript/core';
import { API_CONFIG } from '../config/api-config';

/** Překlad textu přes Google Translate API. */
export class TranslatorService {
    /** Přeloží text z češtiny do angličtiny.
     * @returns Při chybě vrací původní text. */
    public async translate(text: string): Promise<string> {
        if (!text) return '';
        
        try {
            const response = await Http.request({
                url: `${API_CONFIG.GOOGLE_TRANSLATE_API_URL}?key=${API_CONFIG.GOOGLE_TRANSLATE_API_KEY}`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                content: JSON.stringify({
                    q: text,
                    source: "cs",
                    target: "en",
                    format: "text"
                })
            });

            if (response.statusCode !== 200) {
                console.error("Translation API error:", response.content?.toString() ?? "");
                return text;
            }

            const result: any = response.content?.toJSON();
            
            if (result?.data && result.data.translations && result.data.translations.length > 0) {
                return result.data.translations[0].translatedText;
            }
            
            return text;
        } catch (error) {
            console.error("Translation error:", error);
            return text; // Vrátíme původní text v případě chyby
        }
    }

    /** Zjistí jazyk textu.
     * @returns Při chybě vrací 'cs'. */
    public async detectLanguage(text: string): Promise<string> {
        if (!text) return 'cs';
        
        try {
            const response = await Http.request({
                url: `${API_CONFIG.GOOGLE_TRANSLATE_API_URL}/detect?key=${API_CONFIG.GOOGLE_TRANSLATE_API_KEY}`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                content: JSON.stringify({
                    q: text
                })
            });

            if (response.statusCode !== 200) {
                console.error("Language detection API error:", response.content?.toString() ?? "");
                return 'cs';
            }

            const result: any = response.content?.toJSON();
            
            if (result?.data && result.data.detections && result.data.detections.length > 0) {
                return result.data.detections[0][0].language;
            }
            
            return 'cs';
        } catch (error) {
            console.error("Language detection error:", error);
            return 'cs';
        }
    }
}