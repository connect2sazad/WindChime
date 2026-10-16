import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerAccount, resendRegistration, verifyRegistration } from '../../modules/identity/api/auth.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import styles from '../../register.styles.js';
import Skeleton from '../../shared/components/Skeleton.jsx';

export default function RegisterScreen() {
    const { session, ready, authenticate } = useSession();
    const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirm_password: '' });
    const [verification, setVerification] = useState(null);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    if (!ready) return <View style={[styles.loading, { justifyContent: 'center', padding: 22 }]}><Skeleton variant="profile" /></View>;
    if (session) return <Redirect href="/(main)" />;

    function update(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    async function submitRegistration() {
        setBusy(true); setError(''); setMessage('');
        try {
            const result = await registerAccount(form);
            setVerification(result);
            setMessage(`We sent a verification code to ${result.email || form.email}.`);
        } catch (cause) {
            setError(cause.message || 'We could not create your account.');
        } finally { setBusy(false); }
    }

    async function submitCode() {
        if (!code.trim()) { setError('Enter the verification code from your email.'); return; }
        setBusy(true); setError(''); setMessage('');
        try {
            const verified = await verifyRegistration(verification.verification_id, code.trim());
            await authenticate(verified);
        } catch (cause) {
            setError(cause.message || 'That code could not be verified.');
        } finally { setBusy(false); }
    }

    async function resendCode() {
        setBusy(true); setError(''); setMessage('');
        try {
            await resendRegistration(verification.verification_id);
            setMessage('A fresh verification code has been sent.');
        } catch (cause) { setError(cause.message || 'Could not resend the code.'); }
        finally { setBusy(false); }
    }

    const fields = [
        ['name', 'Full name', 'Your name', 'name'],
        ['username', 'Username', 'Choose a username', 'username'],
        ['email', 'Email address', 'you@example.com', 'email-address'],
        ['password', 'Password', 'Create a password', 'new-password'],
        ['confirm_password', 'Confirm password', 'Enter it again', 'new-password'],
    ];

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                    <View style={styles.content}>
                        <View style={styles.brandRow}><Text style={styles.brand}>windchime</Text><Text style={styles.brandMark}>✳</Text></View>
                        <Text style={styles.eyebrow}>{verification ? 'ONE QUICK CHECK' : 'MAKE ROOM FOR YOUR PEOPLE'}</Text>
                        <Text style={styles.title}>{verification ? 'Check your inbox.' : 'Your next hello starts here.'}</Text>
                        <Text style={styles.subtitle}>{verification ? message || `Enter the code sent to ${verification.email || form.email}.` : 'Create your account and find your corner of WindChime.'}</Text>
                        <View style={styles.card}>
                            {verification ? (
                                <>
                                    <Text style={styles.label}>Email verification code</Text>
                                    <TextInput style={styles.input} placeholder="6-digit code" placeholderTextColor={colors.muted} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} autoFocus />
                                    <Pressable style={styles.secondaryButton} onPress={resendCode} disabled={busy}><Text style={styles.secondaryText}>Send a new code</Text></Pressable>
                                </>
                            ) : fields.map(([key, label, placeholder, type]) => {
                                const isPassword = key === 'password' || key === 'confirm_password';
                                const visible = key === 'password' ? passwordVisible : confirmPasswordVisible;
                                const toggle = key === 'password' ? setPasswordVisible : setConfirmPasswordVisible;
                                return <View style={styles.field} key={key}>
                                    <Text style={styles.label}>{label}</Text>
                                    {isPassword ? <View style={styles.passwordRow}>
                                        <TextInput
                                            style={[styles.input, styles.passwordInput]}
                                            placeholder={placeholder}
                                            placeholderTextColor={colors.muted}
                                            value={form[key]}
                                            onChangeText={(value) => update(key, value)}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            secureTextEntry={!visible}
                                            textContentType={type}
                                            autoComplete={type}
                                        />
                                        <Pressable accessibilityRole="button" accessibilityLabel={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onPress={() => toggle((current) => !current)} hitSlop={8} style={styles.passwordToggle}>
                                            <Text style={styles.passwordToggleText}>{visible ? 'Hide' : 'Show'}</Text>
                                        </Pressable>
                                    </View> : <TextInput
                                        style={styles.input}
                                        placeholder={placeholder}
                                        placeholderTextColor={colors.muted}
                                        value={form[key]}
                                        onChangeText={(value) => update(key, value)}
                                        autoCapitalize={key === 'name' ? 'words' : 'none'}
                                        autoCorrect={false}
                                        keyboardType={type === 'email-address' ? 'email-address' : 'default'}
                                        textContentType={type}
                                        autoComplete={type}
                                    />}
                                </View>;
                            })}
                            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                            {!error && message && verification ? null : null}
                            <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={verification ? submitCode : submitRegistration}>
                                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{verification ? 'Verify and continue' : 'Create account'} <Text style={styles.arrow}>→</Text></Text>}
                            </Pressable>
                            <View style={styles.footer}><Text style={styles.footerText}>Already have an account? </Text><Link href="/login" style={styles.footerLink}>Sign in</Link></View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
