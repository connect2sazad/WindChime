/* global process */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// In Expo Go over LAN, use the same computer address that served the JS bundle.
// Keep the env override for tunnels and deployments, where Metro's host is not
// the API host. The emulator fallback only applies when no LAN host is known.
const metroHost = Constants.expoConfig?.hostUri?.replace(/^[a-z][a-z\d+.-]*:\/\//i, '').split(':')[0];
const isIpv4Address = (value) => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value || '');
const host = process.env.EXPO_PUBLIC_API_HOST
    || (isIpv4Address(metroHost) ? metroHost : undefined)
    || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const base = (name, port) => (process.env[name] || `http://${host}:${port}/api/v1`).replace(/\/+$/, '');

export const IDENTITY_API = base('EXPO_PUBLIC_IDENTITY_API_URL', 3101);
export const SOCIAL_API = base('EXPO_PUBLIC_SOCIAL_API_URL', 3102);
export const MESSAGES_API = base('EXPO_PUBLIC_MESSAGES_API_URL', 3103);
