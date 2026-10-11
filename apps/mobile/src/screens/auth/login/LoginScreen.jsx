import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../../../shared/session/useSession.js';
import colors from '../../../styles/colors.js';
import styles from './login.styles.js';

export default function LoginScreen() {
    const { session, ready, signIn } = useSession();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (!ready) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
    if (session) return <Redirect href="/(main)" />;

    async function submit() {
        if (!username.trim() || !password) {
            setError('Enter your username and password to continue.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            await signIn(username, password);
        } catch (cause) {
            setError(cause.message || 'Sign in failed. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.content}>
                    <View style={styles.brandRow}>
                        <Text style={styles.brand}>windchime</Text>
                        <Text style={styles.brandMark}>✳</Text>
                    </View>
                    <View style={styles.hero}>
                        <Text style={styles.eyebrow}>A LITTLE CLOSER, EVERY DAY</Text>
                        <Text style={styles.title}>Let the conversation find you.</Text>
                        <Text style={styles.description}>A place for familiar faces, unexpected friendships, and the little things worth sharing.</Text>
                        <View style={styles.orbit}><Text style={styles.orbitText}>hello</Text><View style={styles.orbitDot} /></View>
                    </View>
                    <View style={styles.formCard}>
                        <Text style={styles.formEyebrow}>YOUR CORNER OF THE INTERNET</Text>
                        <Text style={styles.formTitle}>Come on in.</Text>
                        <Text style={styles.formSubtitle}>Sign in to pick up where you left off.</Text>
                        <View style={styles.field}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput style={styles.input} placeholder="Your username" placeholderTextColor={colors.muted} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} textContentType="username" autoComplete="username" returnKeyType="next" />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.passwordRow}>
                                <TextInput style={[styles.input, styles.passwordInput]} placeholder="Your password" placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} secureTextEntry={!passwordVisible} textContentType="password" autoComplete="current-password" onSubmitEditing={submit} returnKeyType="go" />
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                                    onPress={() => setPasswordVisible((visible) => !visible)}
                                    hitSlop={8}
                                    style={styles.passwordToggle}
                                >
                                    <Text style={styles.passwordToggleText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
                                </Pressable>
                            </View>
                        </View>
                        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                        <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={({ pressed }) => [styles.button, pressed && !busy && styles.buttonPressed, busy && styles.buttonDisabled]}>
                            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign in <Text style={styles.buttonArrow}>→</Text></Text>}
                        </Pressable>
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>New to WindChime? </Text>
                            <Link href="/register" style={styles.footerLink}>Create an account</Link>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
