import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { IDENTITY_API } from '../config/services.js';
import colors from '../../styles/colors.js';

export default function Avatar({ user, token, size = 42, style }) {
    const [failed, setFailed] = useState(false);
    const id = user?.id;
    const version = user?.avatar_version || user?.picture_version || '';
    const uri = id && version && !failed ? `${IDENTITY_API}/users/${id}/picture?v=${encodeURIComponent(version)}` : null;
    useEffect(() => setFailed(false), [id, version]);
    return <View style={[{ width: size, height: size, borderRadius: size * 0.36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e1eed1', overflow: 'hidden' }, style]}>
        {uri ? <Image source={{ uri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }} style={{ width: size, height: size }} contentFit="cover" onError={() => setFailed(true)} cachePolicy="none" /> : <Text style={{ color: colors.green, fontSize: size * 0.36, fontWeight: '800' }}>{(user?.name || user?.username || 'W').trim().slice(0, 1).toUpperCase()}</Text>}
    </View>;
}
