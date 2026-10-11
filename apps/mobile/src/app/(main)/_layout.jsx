import { ActivityIndicator, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';

export default function MainLayout() {
    const { session, ready } = useSession();
    if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}><ActivityIndicator color={colors.green} /></View>;
    if (!session) return <Redirect href="/login" />;
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.ink,
            tabBarInactiveTintColor: colors.muted,
            tabBarStyle: { height: 62, paddingTop: 7, paddingBottom: 7, backgroundColor: colors.white, borderTopColor: colors.border },
            tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        }}>
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="chats" options={{ title: 'Messages' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        </Tabs>
    );
}
