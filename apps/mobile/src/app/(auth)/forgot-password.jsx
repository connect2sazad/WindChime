import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../../shared/session/useSession.js';
import { requestPasswordReset, resetPassword } from '../../modules/identity/api/auth.js';
import colors from '../../styles/colors.js';

export default function ForgotPasswordScreen() {
    const { session } = useSession();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [requested, setRequested] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function sendCode() {
        if (!email.trim()) { setError('Enter the email address on your WindChime account.'); return; }
        setBusy(true); setError(''); setMessage('');
        try { await requestPasswordReset(email); setRequested(true); setMessage('If an account matches that email, a six-digit code has been sent. Check your inbox and spam folder.'); }
        catch (cause) { setError(cause.message || 'Could not request a reset code.'); }
        finally { setBusy(false); }
    }

    async function updatePassword() {
        if (!/^\d{6}$/.test(code.trim())) { setError('Enter the six-digit code from your email.'); return; }
        if (password.length < 8) { setError('Choose a password with at least 8 characters.'); return; }
        if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
        setBusy(true); setError(''); setMessage('');
        try { await resetPassword(email, code, password, confirmPassword); setMessage('Your password has been changed.'); setTimeout(() => router.replace(session ? '/(main)/profile' : '/login'), 900); }
        catch (cause) { setError(cause.message || 'Could not reset the password.'); }
        finally { setBusy(false); }
    }

    const input = { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 13, color: colors.ink, backgroundColor: '#fbfcfa', fontSize: 14, marginTop: 7 };
    const label = { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 17 };
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                <View style={{ width: '100%', maxWidth: 460, alignSelf: 'center', padding: 22, borderRadius: 25, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}>
                    <Pressable onPress={() => router.back()}><Text style={{ color: colors.green, fontWeight: '700' }}>‹  Back to sign in</Text></Pressable>
                    <Text style={{ color: colors.ink, fontSize: 26, fontWeight: '800', marginTop: 26 }}>Reset your password</Text>
                    <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 }}>We’ll email you a one-time code, then you can choose a new password.</Text>
                    <Text style={label}>Email address</Text>
                    <TextInput style={input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!requested} />
                    {requested ? <>
                        <Text style={label}>Six-digit code</Text>
                        <TextInput style={input} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={6} />
                        <Text style={label}>New password</Text>
                        <TextInput style={input} value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} secureTextEntry autoComplete="new-password" />
                        <Text style={label}>Confirm new password</Text>
                        <TextInput style={input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Enter it again" placeholderTextColor={colors.muted} secureTextEntry autoComplete="new-password" onSubmitEditing={updatePassword} />
                    </> : null}
                    {message ? <Text accessibilityRole="alert" style={{ color: colors.green, marginTop: 15, lineHeight: 20 }}>{message}</Text> : null}
                    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginTop: 15, lineHeight: 20 }}>{error}</Text> : null}
                    <Pressable disabled={busy} onPress={requested ? updatePassword : sendCode} style={{ minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginTop: 22, backgroundColor: colors.ink, opacity: busy ? 0.7 : 1 }}>
                        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={{ color: colors.white, fontWeight: '800' }}>{requested ? 'Set new password' : 'Send recovery code'}</Text>}
                    </Pressable>
                    {requested ? <Pressable disabled={busy} onPress={sendCode} style={{ alignItems: 'center', padding: 14 }}><Text style={{ color: colors.green, fontWeight: '700' }}>Send a new code</Text></Pressable> : null}
                    <View style={{ alignItems: 'center', marginTop: 18 }}><Link href="/login" style={{ color: colors.green, fontWeight: '700' }}>Return to sign in</Link></View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>;
}
