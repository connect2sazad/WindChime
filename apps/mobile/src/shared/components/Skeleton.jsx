import { View } from 'react-native';
import colors from '../../styles/colors.js';

// Reusable content placeholder; keep the shape close to the content being loaded.
export default function Skeleton({ variant = 'list', count = 3, style }) {
    const tone = '#e6ece3';
    const block = (width, height, radius = 9, extra = {}) => <View style={[{ width, height, borderRadius: radius, backgroundColor: tone }, extra]} />;
    if (variant === 'inline') return <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={[{ alignSelf: 'center' }, style]}>{block(72, 11, 6)}</View>;
    if (variant === 'profile') return <View accessibilityRole="progressbar" accessibilityLabel="Loading profile" style={[{ padding: 16, backgroundColor: colors.white, borderRadius: 20, gap: 16 }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>{block(68, 68, 34)}<View style={{ gap: 9 }}>{block(145, 16)}{block(95, 12)}</View></View>
        {block('78%', 12)}{block('55%', 12)}<View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>{[1, 2, 3, 4].map((key) => <View key={key} style={{ gap: 8, alignItems: 'center' }}>{block(28, 15)}{block(46, 10)}</View>)}</View>
    </View>;
    if (variant === 'reel') return <View accessibilityRole="progressbar" accessibilityLabel="Loading Reels" style={[{ flex: 1, minHeight: 420, backgroundColor: '#05090a', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 19, overflow: 'hidden' }, style]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ width: 76, height: 20, borderRadius: 8, backgroundColor: '#1a2c2e' }} /><View style={{ width: 42, height: 42, borderRadius: 22, backgroundColor: '#152628' }} /></View>
        <View style={{ position: 'absolute', right: 18, top: '34%', gap: 23, alignItems: 'center' }}>{[1, 2, 3, 4].map((key) => <View key={key} style={{ width: 42, height: 42, borderRadius: 22, backgroundColor: '#142628', borderWidth: 1, borderColor: '#263b3d' }} />)}</View>
        <View style={{ position: 'absolute', left: 18, right: 82, bottom: 48, gap: 10 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}><View style={{ width: 38, height: 38, borderRadius: 20, backgroundColor: '#1b3032' }} /><View style={{ gap: 7, flex: 1 }}><View style={{ width: '58%', height: 11, borderRadius: 6, backgroundColor: '#1b3032' }} /><View style={{ width: '38%', height: 9, borderRadius: 5, backgroundColor: '#16282a' }} /></View></View><View style={{ width: '92%', height: 10, borderRadius: 5, backgroundColor: '#16282a' }} /><View style={{ width: '64%', height: 10, borderRadius: 5, backgroundColor: '#16282a' }} /></View>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: '#1b2d2f', marginBottom: 3 }}><View style={{ width: '24%', height: 3, borderRadius: 2, backgroundColor: '#758c7d' }} /></View>
    </View>;
    return <View accessibilityRole="progressbar" accessibilityLabel="Loading content" style={[{ gap: 12 }, style]}>{Array.from({ length: count }, (_, index) => <View key={index} style={{ backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 13 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{block(42, 42, 21)}<View style={{ gap: 8 }}>{block(122, 12)}{block(78, 9)}</View></View>
        {variant === 'feed' ? block('100%', 210, 14) : null}{block('92%', 11)}{block('65%', 11)}{block('42%', 11)}
    </View>)}</View>;
}
