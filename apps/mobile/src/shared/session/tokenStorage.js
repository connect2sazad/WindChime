import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_KEY = 'windchime.session.v1';

// Keep the bearer token in the platform's encrypted key-value storage.
export async function readSession() {
    if (Platform.OS === 'web') {
        const value = globalThis.localStorage?.getItem(SESSION_KEY);
        return value ? JSON.parse(value) : null;
    }
    const value = await SecureStore.getItemAsync(SESSION_KEY);
    return value ? JSON.parse(value) : null;
}

export async function saveSession(session) {
    if (Platform.OS === 'web') {
        globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session));
        return;
    }
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession() {
    if (Platform.OS === 'web') {
        globalThis.localStorage?.removeItem(SESSION_KEY);
        return;
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
}
