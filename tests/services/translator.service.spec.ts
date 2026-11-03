import { Http } from '@nativescript/core';

jest.mock('../../app/config/api-config', () => ({
    API_CONFIG: {
        GOOGLE_TRANSLATE_API_URL: 'https://test.example/v2',
        GOOGLE_TRANSLATE_API_KEY: 'test-key'
    }
}));

import { TranslatorService } from '../../app/services/translator.service';

describe('TranslatorService', () => {
    let service: TranslatorService;

    beforeEach(() => {
        service = new TranslatorService();
    });

    it('translate vrátí přeložený text', async () => {
        jest.spyOn(Http, 'request').mockResolvedValue({
            statusCode: 200,
            content: { toJSON: () => ({ data: { translations: [{ translatedText: 'hello' }] } }) }
        } as any);
        expect(await service.translate('ahoj')).toBe('hello');
    });

    it('translate vrátí prázdný řetězec pro prázdný vstup', async () => {
        expect(await service.translate('')).toBe('');
    });

    it('translate vrátí původní text při API chybě', async () => {
        jest.spyOn(Http, 'request').mockResolvedValue({
            statusCode: 500,
            content: { toString: () => 'server error' }
        } as any);
        expect(await service.translate('ahoj')).toBe('ahoj');
    });

    it('translate vrátí původní text při výjimce', async () => {
        jest.spyOn(Http, 'request').mockRejectedValue(new Error('network'));
        expect(await service.translate('ahoj')).toBe('ahoj');
    });

    it('detectLanguage rozpozná jazyk', async () => {
        jest.spyOn(Http, 'request').mockResolvedValue({
            statusCode: 200,
            content: { toJSON: () => ({ data: { detections: [[{ language: 'en' }]] } }) }
        } as any);
        expect(await service.detectLanguage('hello')).toBe('en');
    });

    it('detectLanguage vrátí cs jako výchozí při chybě', async () => {
        jest.spyOn(Http, 'request').mockRejectedValue(new Error('network'));
        expect(await service.detectLanguage('text')).toBe('cs');
    });

    it('detectLanguage vrátí cs pro prázdný vstup', async () => {
        expect(await service.detectLanguage('')).toBe('cs');
    });
});
