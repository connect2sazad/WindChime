import { StyleSheet } from 'react-native';
import colors from './colors.js';

export default StyleSheet.create({
    screen: { flex: 1, justifyContent: 'center', backgroundColor: colors.paper, paddingHorizontal: 20 },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    brand: { color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.8 },
    mark: { color: colors.green },
    eyebrow: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 1.7 },
    cover: { height: 140, justifyContent: 'space-between', overflow: 'hidden', backgroundColor: colors.ink, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
    coverEyebrow: { color: colors.lime, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
    coverMark: { color: '#62887a', fontSize: 77, lineHeight: 80, textAlign: 'right' },
    profileCard: { alignItems: 'center', backgroundColor: colors.white, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, borderWidth: 1, borderTopWidth: 0, borderColor: colors.border, padding: 22 },
    avatar: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e1eed1', borderColor: colors.white, borderWidth: 4, borderRadius: 25, marginTop: -55 },
    avatarText: { color: colors.green, fontSize: 27, fontWeight: '800' },
    name: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 11 },
    username: { color: colors.muted, fontSize: 12, marginTop: 4 },
    divider: { height: 1, alignSelf: 'stretch', backgroundColor: colors.border, marginVertical: 18 },
    message: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
    button: { minHeight: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink, borderRadius: 13, marginTop: 20 },
    buttonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
    error: { color: colors.danger, textAlign: 'center', marginTop: 12, fontSize: 11 },
    version: { color: colors.muted, fontSize: 8, letterSpacing: 1.2, textAlign: 'center', marginTop: 18 },
});
