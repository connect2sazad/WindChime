import { SymbolView } from 'expo-symbols';

const ICONS = {
    like: { ios: 'hand.thumbsup.fill', android: 'thumb_up', web: 'thumb_up' },
    love: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
    laugh: { ios: 'face.smiling', android: 'sentiment_very_satisfied', web: 'sentiment_very_satisfied' },
    sad: { ios: 'face.frowning', android: 'sentiment_dissatisfied', web: 'sentiment_dissatisfied' },
    angry: { ios: 'face.angry', android: 'mood_bad', web: 'mood_bad' },
};
const COLORS = { like: '#467a68', love: '#b95d75', laugh: '#ad8a37', sad: '#5b85a0', angry: '#b56b51' };

export default function ReactionIcon({ type = 'like', size = 22, color }) {
    return <SymbolView name={ICONS[type] || ICONS.like} tintColor={color || COLORS[type] || COLORS.like} size={size} />;
}
