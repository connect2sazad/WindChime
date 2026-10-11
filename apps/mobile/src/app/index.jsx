import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../shared/session/useSession.js';
import colors from '../styles/colors.js';

export default function Index() {
    const { session, ready } = useSession();
    if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}><ActivityIndicator color={colors.primary} /></View>;
    return <Redirect href={session ? '/(main)' : '/login'} />;
}
