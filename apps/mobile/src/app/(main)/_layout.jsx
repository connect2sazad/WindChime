import { ActivityIndicator, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';

export default function MainLayout() {
    const insets = useSafeAreaInsets();
    const { session, ready } = useSession();
    if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}><ActivityIndicator color={colors.green} /></View>;
    if (!session) return <Redirect href="/login" />;
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.ink,
            tabBarInactiveTintColor: colors.muted,
            tabBarStyle: { height: 54 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.white, borderTopColor: colors.border },
            tabBarShowLabel: false,
            tabBarIconStyle: { marginBottom: 0 },
        }}>
            <Tabs.Screen name="index" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={23} /> }} />
            <Tabs.Screen name="connections" options={{ title: 'People', tabBarAccessibilityLabel: 'People', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'person.2.fill', android: 'groups', web: 'groups' }} tintColor={color} size={23} /> }} />
            <Tabs.Screen name="create" options={{ title: 'Create', tabBarAccessibilityLabel: 'Create', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'plus.square', android: 'add_box', web: 'add_box' }} tintColor={color} size={23} /> }} />
            <Tabs.Screen name="chats" options={{ title: 'Messages', tabBarAccessibilityLabel: 'Messages', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'chat', web: 'chat' }} tintColor={color} size={23} /> }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' }} tintColor={color} size={23} /> }} />
            <Tabs.Screen name="notifications" options={{ href: null }} />
        </Tabs>
    );
}
