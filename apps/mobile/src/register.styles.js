import { StyleSheet } from 'react-native';
import colors from './styles/colors.js';

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.paper },
    keyboard: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 22 },
    content: { width: '100%', maxWidth: 500, alignSelf: 'center', paddingHorizontal: 24 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 28 },
    brand: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -1.2 },
    brandMark: { color: colors.green, fontSize: 24, fontWeight: '800' },
    eyebrow: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 2 },
    title: { color: colors.ink, fontSize: 31, lineHeight: 37, fontWeight: '700', letterSpacing: -1.1, marginTop: 9 },
    subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 20 },
    card: { backgroundColor: colors.white, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 21 },
    field: { marginBottom: 13 },
    label: { color: colors.ink, fontSize: 11, fontWeight: '700', marginBottom: 7 },
    input: { minHeight: 47, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 13, color: colors.ink, backgroundColor: '#fbfcf9', fontSize: 14 },
    error: { color: colors.danger, marginTop: 12, fontSize: 12, lineHeight: 18 },
    button: { minHeight: 49, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink, borderRadius: 13, marginTop: 17 },
    disabled: { opacity: 0.65 },
    buttonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
    arrow: { color: colors.lime, fontSize: 17 },
    secondaryButton: { alignSelf: 'flex-start', paddingVertical: 11 },
    secondaryText: { color: colors.green, fontSize: 12, fontWeight: '700' },
    footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 },
    footerText: { color: colors.muted, fontSize: 11 },
    footerLink: { color: colors.green, fontSize: 11, fontWeight: '700' },
});

export default styles;
