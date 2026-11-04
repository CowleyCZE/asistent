import { SettingsService, Action, ActionType } from '../../app/services/settings.service';
import { ApplicationSettings } from '@nativescript/core';
import { mockReset } from '../mocks/application-settings.mock';

describe('SettingsService', () => {
    let settingsService: SettingsService;

    beforeEach(() => {
        mockReset();
        settingsService = new SettingsService();
    });

    describe('getSettings', () => {
        it('should return default settings when no settings exist', () => {
            const settings = settingsService.getSettings();
            expect(settings.wakePhrases).toEqual(['Hey asistente', 'Pomoc']);
            expect(settings.feedbackEnabled).toBe(true);
            expect(settings.sensitivity).toBe(0.5);
            expect(settings.actions.length).toBeGreaterThan(0);
        });

        it('should return saved settings', () => {
            const customSettings = {
                wakePhrases: ['Custom phrase'],
                feedbackEnabled: false,
                sensitivity: 0.8,
                actions: []
            };
            ApplicationSettings.setString('voice_assistant_settings_v2', JSON.stringify(customSettings));

            const settings = settingsService.getSettings();
            expect(settings.wakePhrases).toEqual(['Custom phrase']);
            expect(settings.feedbackEnabled).toBe(false);
            expect(settings.sensitivity).toBe(0.8);
        });
    });

    describe('updateWakePhrases', () => {
        it('should update wake phrases', () => {
            settingsService.updateWakePhrases(['New phrase 1', 'New phrase 2']);
            const settings = settingsService.getSettings();
            expect(settings.wakePhrases).toEqual(['New phrase 1', 'New phrase 2']);
        });
    });

    describe('updateFeedback', () => {
        it('should update feedback enabled', () => {
            settingsService.updateFeedback(false);
            const settings = settingsService.getSettings();
            expect(settings.feedbackEnabled).toBe(false);
        });
    });

    describe('updateSensitivity', () => {
        it('should update sensitivity', () => {
            settingsService.updateSensitivity(0.8);
            const settings = settingsService.getSettings();
            expect(settings.sensitivity).toBe(0.8);
        });
    });

    describe('Actions management', () => {
        beforeEach(() => {
            mockReset();
            settingsService = new SettingsService();
            // Clear default actions
            settingsService.updateWakePhrases(['Hey asistente', 'Pomoc']);
        });

        it('should get actions', () => {
            const actions = settingsService.getActions();
            expect(Array.isArray(actions)).toBe(true);
        });

        it('should add action', () => {
            const newAction: Action = {
                name: 'New Action',
                phrase: 'new phrase',
                type: 'webhook',
                url: 'https://example.com'
            };
            settingsService.addAction(newAction);
            const actions = settingsService.getActions();
            expect(actions.length).toBeGreaterThan(0);
            expect(actions.some(a => a.name === 'New Action')).toBe(true);
        });

        it('should update action', () => {
            settingsService.addAction({
                name: 'Action to update',
                phrase: 'phrase',
                type: 'webhook',
                url: 'https://example.com'
            });

            const actions = settingsService.getActions();
            const index = actions.findIndex(a => a.name === 'Action to update');

            if (index !== -1) {
                settingsService.updateAction(index, {
                    name: 'Updated Action',
                    phrase: 'updated phrase',
                    type: 'webhook',
                    url: 'https://updated.com'
                });

                const updatedActions = settingsService.getActions();
                expect(updatedActions[index].name).toBe('Updated Action');
            }
        });

        it('should delete action', () => {
            settingsService.addAction({
                name: 'Action to delete',
                phrase: 'phrase',
                type: 'webhook',
                url: 'https://example.com'
            });

            const actions = settingsService.getActions();
            const index = actions.findIndex(a => a.name === 'Action to delete');

            if (index !== -1) {
                settingsService.deleteAction(index);
                const updatedActions = settingsService.getActions();
                expect(updatedActions.some(a => a.name === 'Action to delete')).toBe(false);
            }
        });
    });

    describe('TTS Settings', () => {
        beforeEach(() => {
            mockReset();
            settingsService = new SettingsService();
        });

        it('should get TTS config', () => {
            const config = settingsService.getTTSConfig();
            expect(config.enabled).toBe(true);
            expect(config.language).toBe('cs-CZ');
            expect(config.pitch).toBe(1.0);
            expect(config.rate).toBe(1.0);
        });

        it('should update TTS enabled', () => {
            settingsService.updateTTSEnabled(false);
            const config = settingsService.getTTSConfig();
            expect(config.enabled).toBe(false);
        });

        it('should update TTS language', () => {
            settingsService.updateTTSLanguage('en-US');
            const config = settingsService.getTTSConfig();
            expect(config.language).toBe('en-US');
        });

        it('should update TTS pitch', () => {
            settingsService.updateTTSPitch(1.5);
            const config = settingsService.getTTSConfig();
            expect(config.pitch).toBe(1.5);
        });

        it('should update TTS rate', () => {
            settingsService.updateTTSRate(0.8);
            const config = settingsService.getTTSConfig();
            expect(config.rate).toBe(0.8);
        });

        it('should clamp TTS pitch to valid range', () => {
            settingsService.updateTTSPitch(3.0);
            const config = settingsService.getTTSConfig();
            expect(config.pitch).toBe(2.0);

            settingsService.updateTTSPitch(0.1);
            const config2 = settingsService.getTTSConfig();
            expect(config2.pitch).toBe(0.5);
        });

        it('should clamp TTS rate to valid range', () => {
            settingsService.updateTTSRate(3.0);
            const config = settingsService.getTTSConfig();
            expect(config.rate).toBe(2.0);

            settingsService.updateTTSRate(0.1);
            const config2 = settingsService.getTTSConfig();
            expect(config2.rate).toBe(0.5);
        });
    });

    describe('Speech Recognition Language', () => {
        beforeEach(() => {
            mockReset();
            settingsService = new SettingsService();
        });

        it('should return default speech language cs-CZ', () => {
            expect(settingsService.getSpeechLanguage()).toBe('cs-CZ');
        });

        it('should update speech language to supported language', () => {
            settingsService.updateSpeechLanguage('en-US');
            expect(settingsService.getSpeechLanguage()).toBe('en-US');
        });

        it('should reject unsupported language', () => {
            settingsService.updateSpeechLanguage('fr-FR');
            expect(settingsService.getSpeechLanguage()).toBe('cs-CZ');
        });

        it('should list supported recognition languages', () => {
            expect(SettingsService.SUPPORTED_RECOGNITION_LANGUAGES).toContain('cs-CZ');
            expect(SettingsService.SUPPORTED_RECOGNITION_LANGUAGES).toContain('en-US');
            expect(SettingsService.SUPPORTED_RECOGNITION_LANGUAGES).toContain('de-DE');
            expect(SettingsService.SUPPORTED_RECOGNITION_LANGUAGES).toContain('sk-SK');
        });
    });

    describe('Migration', () => {
        beforeEach(() => {
            mockReset();
        });

        it('should migrate old settings with webhooks', () => {
            const oldSettings = {
                wakePhrases: ['Old phrase'],
                feedbackEnabled: true,
                sensitivity: 0.5,
                webhooks: [
                    { name: 'webhook1', phrase: 'phrase1', url: 'url1' }
                ]
            };
            ApplicationSettings.setString('voice_assistant_settings', JSON.stringify(oldSettings));

            settingsService = new SettingsService();
            const settings = settingsService.getSettings();

            expect(settings.wakePhrases).toEqual(['Old phrase']);
            expect(settings.actions.length).toBe(1);
            expect(settings.actions[0].type).toBe('webhook');
        });
    });
});
