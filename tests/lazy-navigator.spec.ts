import { Frame } from '@nativescript/core';
import { LazyNavigator } from '../../app/utils/navigation';

describe('LazyNavigator', () => {
    let navigateMock: jest.Mock;

    beforeEach(() => {
        LazyNavigator.resetVisitedPages();
        navigateMock = jest.fn();
        jest.spyOn(Frame, 'topmost').mockReturnValue({ navigate: navigateMock } as any);
    });

    it('navigate zavolá Frame.topmost().navigate se správným modulem', () => {
        LazyNavigator.navigate('settings-page');
        expect(navigateMock).toHaveBeenCalledWith(
            expect.objectContaining({ moduleName: 'settings-page', animated: true })
        );
    });

    it('navigate podporuje vlastní transition', () => {
        LazyNavigator.navigate('history-page', 'fade');
        expect(navigateMock).toHaveBeenCalledWith(
            expect.objectContaining({ transition: { name: 'fade' } })
        );
    });

    it('si pamatuje navštívené stránky', () => {
        expect(LazyNavigator.hasBeenVisited('history-page')).toBe(false);
        LazyNavigator.navigate('history-page');
        expect(LazyNavigator.hasBeenVisited('history-page')).toBe(true);
    });

    it('resetVisitedPages vyčistí seznam', () => {
        LazyNavigator.navigate('statistics-page');
        LazyNavigator.resetVisitedPages();
        expect(LazyNavigator.hasBeenVisited('statistics-page')).toBe(false);
    });
});
