import { Text, View } from 'react-native';

const COLORS = { like: '#467a68', love: '#b95d75', laugh: '#ad8a37', sad: '#5b85a0', angry: '#b56b51' };

export default function ReactionIcon({ type = 'like', size = 22, color }) {
    const tint = color || COLORS[type] || COLORS.like;
    const line = { borderColor: tint, borderWidth: Math.max(1, size * 0.075) };
    const dot = { width: Math.max(2, size * 0.09), height: Math.max(2, size * 0.09), borderRadius: size, backgroundColor: tint };

    if (type === 'love') return <Text accessibilityElementsHidden style={{ color: tint, fontSize: size * 1.16, lineHeight: size * 1.2, fontWeight: '400' }}>♡</Text>;
    if (type === 'like') return <View accessibilityElementsHidden style={{ width: size, height: size, justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: size * 0.08, bottom: size * 0.1, width: size * 0.22, height: size * 0.52, borderRadius: size * 0.05, ...line }} />
        <View style={{ position: 'absolute', left: size * 0.34, bottom: size * 0.1, width: size * 0.53, height: size * 0.48, borderRadius: size * 0.12, borderTopLeftRadius: size * 0.04, ...line }} />
        <View style={{ position: 'absolute', left: size * 0.43, top: size * 0.05, width: size * 0.17, height: size * 0.42, borderRadius: size * 0.1, transform: [{ rotate: '8deg' }], ...line }} />
    </View>;

    return <View accessibilityElementsHidden style={{ width: size, height: size, borderRadius: size, alignItems: 'center', justifyContent: 'center', ...line }}>
        {type === 'angry' ? <View style={{ position: 'absolute', top: size * 0.27, left: size * 0.21, width: size * 0.25, height: 0, borderTopWidth: Math.max(1, size * 0.07), borderColor: tint, transform: [{ rotate: '28deg' }] }} /> : null}
        {type === 'angry' ? <View style={{ position: 'absolute', top: size * 0.27, right: size * 0.21, width: size * 0.25, height: 0, borderTopWidth: Math.max(1, size * 0.07), borderColor: tint, transform: [{ rotate: '-28deg' }] }} /> : null}
        <View style={{ position: 'absolute', top: size * 0.37, left: size * 0.29, ...dot }} />
        <View style={{ position: 'absolute', top: size * 0.37, right: size * 0.29, ...dot }} />
        {type === 'laugh' ? <View style={{ position: 'absolute', bottom: size * 0.19, width: size * 0.48, height: size * 0.25, borderBottomWidth: Math.max(1, size * 0.075), borderColor: tint, borderRadius: size, backgroundColor: 'transparent' }} /> : null}
        {type === 'sad' ? <View style={{ position: 'absolute', bottom: size * 0.18, width: size * 0.38, height: size * 0.19, borderTopWidth: Math.max(1, size * 0.075), borderColor: tint, borderRadius: size, backgroundColor: 'transparent' }} /> : null}
        {type === 'angry' ? <View style={{ position: 'absolute', bottom: size * 0.22, width: size * 0.43, height: 0, borderTopWidth: Math.max(1, size * 0.075), borderColor: tint, borderRadius: size }} /> : null}
    </View>;
}
