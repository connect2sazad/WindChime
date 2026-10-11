import { StyleSheet } from 'react-native';
import colors from './colors.js';

export default StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.paper },
    content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brand: { color: colors.ink, fontSize: 18, fontWeight: '800' },
    mark: { color: colors.green },
    title: { color: colors.ink, fontSize: 28, fontWeight: '800', marginTop: 22 },
    subtitle: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 16 },
    clear: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#e9efe4' },
    clearText: { color: colors.green, fontSize: 10, fontWeight: '800' },
    row: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, marginBottom: 9 },
    unreadRow: { backgroundColor: '#f1f6e8', borderColor: '#cfdfbf' },
    avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e1eed1' },
    avatarText: { color: colors.green, fontWeight: '800', fontSize: 15 },
    body: { flex: 1, marginLeft: 11 },
    message: { color: colors.ink, fontSize: 11, lineHeight: 16 },
    time: { color: colors.muted, fontSize: 9, marginTop: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green, marginLeft: 9 },
    loading: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 9 },
    centerText: { color: colors.muted, fontSize: 11 },
    error: { color: colors.danger, backgroundColor: '#fff4f3', padding: 13, borderRadius: 12, fontSize: 11 },
    empty: { alignItems: 'center', padding: 25, backgroundColor: colors.white, borderRadius: 17, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
    emptyMark: { color: colors.green, fontSize: 25 },
    emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 7 },
    emptyText: { color: colors.muted, textAlign: 'center', fontSize: 11, marginTop: 5 },
});
