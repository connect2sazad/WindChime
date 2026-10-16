import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../shared/session/useSession.js';
import colors from '../styles/colors.js';
import Skeleton from '../shared/components/Skeleton.jsx';

export default function Index() {
    const { session, ready } = useSession();
    if (!ready) return <View style={{ flex: 1, justifyContent: 'center', padding: 22, backgroundColor: colors.paper }}><Skeleton variant="profile" /></View>;
    return <Redirect href={session ? '/(main)' : '/login'} />;
}
