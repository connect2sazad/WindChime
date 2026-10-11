import { Dimensions, PanResponder } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';

const TABS = [
    '/(main)',
    '/(main)/connections',
    '/(main)/reels',
    '/(main)/create',
    '/(main)/chats',
    '/(main)/profile',
];

// Let horizontal carousels work normally; page switching starts at either screen edge.
export default function useMainTabSwipe(activeTab) {
    return useMemo(() => {
        const width = Dimensions.get('window').width;
        const index = Math.max(0, TABS.findIndex((route) => route === activeTab));
        return PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponderCapture: (_, gesture) => {
                const startX = gesture.x0;
                const fromEdge = startX < 28 || startX > width - 28;
                return fromEdge && Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4;
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx < -70 && index < TABS.length - 1) router.navigate(TABS[index + 1]);
                if (gesture.dx > 70 && index > 0) router.navigate(TABS[index - 1]);
            },
            onShouldBlockNativeResponder: () => false,
        }).panHandlers;
    }, [activeTab]);
}
