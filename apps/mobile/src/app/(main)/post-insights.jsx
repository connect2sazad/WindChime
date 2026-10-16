import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { getPostInsights } from '../../modules/social/api/feed.js';
import { useSession } from '../../shared/session/useSession.js';
import Skeleton from '../../shared/components/Skeleton.jsx';
import colors from '../../styles/colors.js';

export default function PostInsightsScreen() {
    const { postId } = useLocalSearchParams();
    const { session } = useSession();
    const [insights, setInsights] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!session?.token || !postId) return;
        let active = true;
        setLoading(true);
        getPostInsights(session.token, String(postId)).then((data) => { if (active) setInsights(data); })
            .catch((cause) => { if (active) setError(cause.message || 'Insights could not be loaded.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [postId, session?.token]);
    const metric = (title, value, note, icon) => <View key={title} style={styles.metric}><View style={styles.metricIcon}><SymbolView name={icon} tintColor={colors.green} size={20} /></View><Text style={styles.metricValue}>{value ?? 0}</Text><Text style={styles.metricTitle}>{title}</Text>{note ? <Text style={styles.metricNote}>{note}</Text> : null}</View>;
    const stats = insights ? [
        ['Views', insights.views?.total, `${insights.views?.unique_viewers || 0} unique viewers`, { ios: 'eye', android: 'visibility', web: 'visibility' }],
        ['Profile opens', insights.profile_opens, 'People who visited from this post', { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }],
        ['Sent in messages', insights.message_shares, 'Direct message shares', { ios: 'paperplane', android: 'send', web: 'send' }],
        ['Saves', insights.saves?.total, `${insights.saves?.current || 0} currently saved`, { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }],
        ['Reshares', insights.reshares?.total, `${insights.reshares?.current || 0} currently active`, { ios: 'arrow.2.squarepath', android: 'repeat', web: 'repeat' }],
        ['Comments', insights.comments?.total, `${insights.comments?.current || 0} currently visible`, { ios: 'bubble.left', android: 'chat_bubble_outline', web: 'chat_bubble_outline' }],
        ['Reactions', insights.reactions?.total, `${insights.reactions?.current || 0} currently active`, { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }],
        ['Engaged accounts', insights.engaged_accounts, 'People who interacted', { ios: 'person.2', android: 'groups', web: 'groups' }],
    ] : [];
    return <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}><Pressable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.back}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={colors.ink} size={21} /></Pressable><View><Text style={styles.title}>Post insights</Text><Text style={styles.subtitle}>Understand how this moment reached people</Text></View></View>
        {loading ? <Skeleton count={4} style={{ padding: 18, marginTop: 14 }} /> : error ? <Text style={styles.error}>{error}</Text> : <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}><Text style={styles.eyebrow}>YOUR MOMENT, IN CONTEXT</Text><Text style={styles.heroTitle}>{insights?.views?.total || 0} views</Text><Text style={styles.heroText}>Views include the recorded lifetime total. Unique viewers and action details are available from when detailed insights tracking was enabled.</Text></View>
            <Text style={styles.sectionTitle}>Reach and activity</Text><View style={styles.grid}>{stats.map(([title, value, note, icon]) => metric(title, value, note, icon))}</View>
            <View style={styles.panel}><Text style={styles.sectionTitle}>Reaction mix</Text>{Object.entries(insights?.reactions?.by_type || {}).length ? Object.entries(insights.reactions.by_type).map(([type, count]) => <View key={type} style={styles.breakdown}><Text style={styles.breakdownName}>{type[0].toUpperCase() + type.slice(1)}</Text><View style={styles.track}><View style={[styles.fill, { width: `${insights.reactions.current ? Math.max(4, count / insights.reactions.current * 100) : 0}%` }]} /></View><Text style={styles.breakdownCount}>{count}</Text></View>) : <Text style={styles.muted}>No reactions yet.</Text>}</View>
            <View style={styles.panel}><Text style={styles.sectionTitle}>Where views came from</Text>{Object.entries(insights?.views?.by_source || {}).length ? Object.entries(insights.views.by_source).map(([source, count]) => <View key={source} style={styles.sourceRow}><Text style={styles.sourceName}>{source[0].toUpperCase() + source.slice(1)}</Text><Text style={styles.sourceCount}>{count}</Text></View>) : <Text style={styles.muted}>Detailed source tracking starts as people view this moment.</Text>}</View>
            <View style={styles.note}><Text style={styles.noteTitle}>Audience demographics</Text><Text style={styles.muted}>Age, gender, and country aren’t shown because WindChime does not currently collect verified demographic information. Guesses based on device or behavior would be misleading.</Text></View>
        </ScrollView>}
    </SafeAreaView>;
}

const styles = {
    safe: { flex: 1, backgroundColor: colors.paper },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white },
    back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#edf3e9' },
    title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
    subtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
    content: { padding: 16, paddingBottom: 30, gap: 14 },
    hero: { backgroundColor: colors.ink, borderRadius: 22, padding: 20 },
    eyebrow: { color: '#d7f2a7', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
    heroTitle: { color: colors.white, fontSize: 34, fontWeight: '900', marginTop: 11 },
    heroText: { color: '#d4e0dc', fontSize: 12, lineHeight: 18, marginTop: 5 },
    sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metric: { width: '48%', minHeight: 130, flexGrow: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14 },
    metricIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#edf3e9', alignItems: 'center', justifyContent: 'center' },
    metricValue: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: 9 },
    metricTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 2 },
    metricNote: { color: colors.muted, fontSize: 10, marginTop: 4 },
    panel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 },
    breakdown: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 30 },
    breakdownName: { color: colors.ink, width: 74, fontSize: 12 },
    track: { flex: 1, height: 7, borderRadius: 5, backgroundColor: '#edf2e8', overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: colors.green, borderRadius: 5 },
    breakdownCount: { color: colors.ink, width: 24, textAlign: 'right', fontWeight: '700', fontSize: 11 },
    sourceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    sourceName: { color: colors.ink, fontSize: 13 },
    sourceCount: { color: colors.ink, fontWeight: '800' },
    note: { padding: 16, borderRadius: 16, backgroundColor: '#edf3e9' },
    noteTitle: { color: colors.ink, fontWeight: '800', marginBottom: 6 },
    muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    error: { color: colors.danger, padding: 20 },
};
