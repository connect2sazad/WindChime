import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { getDisplayUser } from '../../modules/social/api/feed.js';
import { listBlocks, unblockUser } from '../../modules/safety/api/safety.js';
import Avatar from '../../shared/components/Avatar.jsx';
import Skeleton from '../../shared/components/Skeleton.jsx';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';

export default function BlockedAccountsScreen() {
    const { session } = useSession();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState('');
    useFocusEffect(useCallback(() => {
        const controller = new AbortController(); let active = true;
        setLoading(true); setError('');
        (async () => {
            try {
                const result = await listBlocks(session.token, 1, controller.signal);
                const blocked = await Promise.all((result.data || []).map(async (row) => ({ ...row, user: await getDisplayUser(session.token, row.user_id, controller.signal).catch(() => null) })));
                if (active) setRows(blocked);
            } catch (cause) { if (active) setError(cause.message || 'Blocked accounts could not be loaded.'); }
            finally { if (active) setLoading(false); }
        })();
        return () => { active = false; controller.abort(); };
    }, [session.token]));
    async function unblock(id) {
        setBusyId(id); setError('');
        try { await unblockUser(session.token, id); setRows((items) => items.filter((item) => item.user_id !== id)); }
        catch (cause) { setError(cause.message || 'Could not unblock this account.'); }
        finally { setBusyId(null); }
    }
    return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.paper }}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
            <Pressable onPress={() => router.back()} accessibilityLabel="Go back" style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={colors.ink} size={19} /></Pressable>
            <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '800', marginTop: 18 }}>Blocked accounts</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 18 }}>People you block can’t interact with you or see your moments. Unblocking doesn’t restore previous connections.</Text>
            {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
            {loading ? <Skeleton count={4} /> : rows.length ? rows.map((row) => <View key={row.id} style={{ minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.white, borderRadius: 17, borderWidth: 1, borderColor: colors.border, marginBottom: 9 }}>
                <Avatar user={row.user || { id: row.user_id, name: 'WindChime member' }} token={session.token} size={46} />
                <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: '800' }}>{row.user?.name || 'Unavailable account'}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{row.user?.username ? `@${row.user.username}` : 'Account unavailable'}</Text></View>
                <Pressable disabled={busyId === row.user_id} onPress={() => unblock(row.user_id)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: '#edf3e8' }}><Text style={{ color: colors.ink, fontSize: 12, fontWeight: '800' }}>{busyId === row.user_id ? '…' : 'Unblock'}</Text></Pressable>
            </View>) : <View style={{ backgroundColor: colors.white, borderRadius: 18, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}><SymbolView name={{ ios: 'hand.raised', android: 'block', web: 'block' }} tintColor={colors.green} size={28} /><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 10 }}>No blocked accounts</Text><Text style={{ color: colors.muted, marginTop: 5 }}>Accounts you block will appear here.</Text></View>}
        </ScrollView>
    </SafeAreaView>;
}
