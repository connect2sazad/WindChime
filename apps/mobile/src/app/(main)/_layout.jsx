import { ActivityIndicator, Text, View } from 'react-native';
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
            tabBarStyle: { height: 66, paddingTop: 5, paddingBottom: 6, backgroundColor: colors.white, borderTopColor: colors.border },
            tabBarLabelStyle: { fontSize: 9, fontWeight: '700' },
            tabBarIconStyle: { marginBottom: -3 },
        }}>
            <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>⌂</Text> }} />
            <Tabs.Screen name="connections" options={{ title: 'People', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>♧</Text> }} />
            <Tabs.Screen name="create" options={{ title: 'Create', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>＋</Text> }} />
            <Tabs.Screen name="chats" options={{ title: 'Messages', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>◌</Text> }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>♙</Text> }} />
            <Tabs.Screen name="notifications" options={{ href: null }} />
        </Tabs>
    );
}
