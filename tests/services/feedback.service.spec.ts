import { mockReset } from '../mocks/application-settings.mock';

class MockMediaPlayer {
    isPlaying = jest.fn(() => false);
    stop = jest.fn();
    reset = jest.fn();
    setDataSource = jest.fn();
    setOnPreparedListener = jest.fn();
    setOnErrorListener = jest.fn();
    setOnCompletionListener = jest.fn();
    prepareAsync = jest.fn();
    start = jest.fn();
    release = jest.fn();
    static OnPreparedListener: any;
    static OnErrorListener: any;
    static OnCompletionListener: any;
}
(MockMediaPlayer as any).OnPreparedListener = class {
    constructor(cb: any) { if (cb && cb.onPrepared) cb.onPrepared(this); }
};
(MockMediaPlayer as any).OnErrorListener = class {
    constructor(cb: any) { if (cb && cb.onError) cb.onError(this, 1, 1); }
};
(MockMediaPlayer as any).OnCompletionListener = class {
    constructor(cb: any) { if (cb && cb.onCompletion) cb.onCompletion(this); }
};

describe('FeedbackService', () => {
    let service: any;
    let player: MockMediaPlayer;

    beforeAll(() => {
        (global as any).android = { media: { MediaPlayer: MockMediaPlayer } };
        (global as any).java = {
            io: {
                FileInputStream: class {
                    constructor(public p: any) {}
                    getFD() { return { fd: 1 }; }
                }
            }
        };
    });

    afterAll(() => {
        (global as any).android = undefined;
        (global as any).java = undefined;
    });

    beforeEach(() => {
        mockReset();
        const FeedbackService = require('../../app/services/feedback.service').FeedbackService;
        service = new FeedbackService();
        player = service.player;
    });

    it('vytvoří přehrávač v konstruktoru', () => {
        expect(player).toBeInstanceOf(MockMediaPlayer);
    });

    it('playStartSound dokončí přehrávání', async () => {
        await service.playStartSound();
        expect(player.reset).toHaveBeenCalled();
        expect(player.setDataSource).toHaveBeenCalled();
        expect(player.start).toHaveBeenCalled();
    });

    it('playStopSound a playErrorSound projdou bez chyby', async () => {
        await service.playStopSound();
        await service.playErrorSound();
        expect(player.start).toHaveBeenCalledTimes(2);
    });

    it('zastaví přehrávající přehrávač před novým zvukem', async () => {
        player.isPlaying = jest.fn(() => true);
        await service.playStartSound();
        expect(player.stop).toHaveBeenCalled();
    });

    it('dispose uvolní přehrávač', () => {
        service.dispose();
        expect(player.release).toHaveBeenCalled();
    });
});
