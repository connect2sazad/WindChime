import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { updateCurrentProfile, uploadCurrentProfilePicture } from '../../modules/identity/api/auth.js';
import Avatar from '../../shared/components/Avatar.jsx';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';

export default function ProfileEditScreen() {
    const { session, authenticate } = useSession();
    const [form, setForm] = useState({ name: session?.user?.name || '', username: session?.user?.username || '', bio: session?.user?.bio || '' });
    const [pictureVersion, setPictureVersion] = useState(session?.user?.avatar_version);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    if (!session) return <Redirect href="/login" />;

    async function changePicture() {
        setError('');
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
        const asset = result.assets?.[0];
        if (result.canceled || !asset) return;
        if (asset.fileSize > 5 * 1024 * 1024) { setError('Profile pictures must be 5 MB or smaller.'); return; }
        setBusy(true);
        try { const saved = await uploadCurrentProfilePicture(session.token, asset); setPictureVersion(saved.avatar_version); await authenticate({ token: session.token, user: { ...session.user, avatar_version: saved.avatar_version } }); }
        catch (cause) { setError(cause.message || 'Could not update your profile picture.'); }
        finally { setBusy(false); }
    }

    async function save() {
        const changes = Object.fromEntries(Object.entries(form).filter(([key, value]) => value !== (session.user[key] || '')));
        if (!Object.keys(changes).length) { router.back(); return; }
        setBusy(true); setError('');
        try {
            const updated = await updateCurrentProfile(session.token, changes);
            await authenticate({ token: session.token, user: { ...session.user, ...updated, avatar_version: pictureVersion } });
            router.back();
        } catch (cause) { setError(cause.message || 'Profile changes could not be saved.'); }
        finally { setBusy(false); }
    }

    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top']}><ScrollView contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 620, width: '100%', alignSelf: 'center' }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.green, fontWeight: '800' }}>‹  Back to profile</Text></Pressable>
        <Text style={{ color: colors.ink, fontSize: 26, fontWeight: '800' }}>Edit your profile</Text>
        <Text style={{ color: colors.muted }}>Keep your WindChime details up to date.</Text>
        <View style={{ alignItems: 'center', gap: 10, padding: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20 }}><Avatar user={{ ...session.user, avatar_version: pictureVersion }} token={session.token} size={92} /><Pressable disabled={busy} onPress={changePicture} style={button}><Text style={buttonText}>Change photo</Text></Pressable></View>
        <Field label="Full name" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} />
        <Field label="Username" value={form.username} onChangeText={(username) => setForm((current) => ({ ...current, username }))} autoCapitalize="none" />
        <Field label="Bio" value={form.bio} onChangeText={(bio) => setForm((current) => ({ ...current, bio }))} multiline maxLength={500} />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <Pressable disabled={busy} onPress={save} style={[button, { backgroundColor: colors.ink }]}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={[buttonText, { color: colors.white }]}>Save changes</Text>}</Pressable>
    </ScrollView></SafeAreaView>;
}

function Field({ label, ...props }) { return <View style={{ gap: 6 }}><Text style={{ color: colors.ink, fontWeight: '700' }}>{label}</Text><TextInput {...props} autoCorrect={false} placeholder={label} placeholderTextColor={colors.muted} style={{ minHeight: 48, paddingHorizontal: 13, paddingVertical: 12, color: colors.ink, backgroundColor: colors.white, borderRadius: 13, borderWidth: 1, borderColor: colors.border, textAlignVertical: props.multiline ? 'top' : 'center' }} /></View>; }
const button = { minHeight: 44, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: '#edf3e8' };
const buttonText = { color: colors.ink, fontWeight: '800' };
