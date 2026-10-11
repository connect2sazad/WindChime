import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import styles from '../../styles/profile.styles.js';

export default function ProfileScreen() {
    const { session, signOut } = useSession();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (!session) return <Redirect href="/login" />;

    async function leave() {
        setBusy(true); setError('');
        try { await signOut(); }
        catch (cause) { setError(cause.message || 'Signed out locally, but the server could not be reached.'); }
        finally { setBusy(false); }
    }

    const name = session.user.name || 'WindChime member';
    return (
        <View style={styles.screen}>
            <View style={styles.top}><Text style={styles.brand}>windchime <Text style={styles.mark}>✳</Text></Text><Text style={styles.eyebrow}>YOUR SPACE</Text></View>
            <View style={styles.cover}><Text style={styles.coverEyebrow}>A LITTLE CORNER OF WINDCHIME</Text><Text style={styles.coverMark}>✳</Text></View>
            <View style={styles.profileCard}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{name.trim().slice(0, 1).toUpperCase()}</Text></View>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.username}>@{session.user.username}</Text>
                <View style={styles.divider} />
                <Text style={styles.message}>Your mobile profile is connected to your WindChime account.</Text>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable disabled={busy} onPress={leave} style={styles.button}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign out</Text>}</Pressable>
            </View>
            <Text style={styles.version}>WINDCHIME · A PLACE FOR THE LITTLE THINGS WORTH SHARING</Text>
        </View>
    );
}
