import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { getConnections } from '../../modules/social/api/connections.js';
import { getUserPosts } from '../../modules/social/api/feed.js';
import { updateCurrentProfile } from '../../modules/identity/api/auth.js';
import { IDENTITY_API } from '../../shared/config/services.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import styles from '../../styles/profile.styles.js';

export default function ProfileScreen() {
    const { session, signOut, authenticate } = useSession();
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState({ posts: 0, friends: 0, followers: 0, following: 0 });
    const [form, setForm] = useState({ name: '', username: '', bio: '' });
    const [avatarFailed, setAvatarFailed] = useState(false);

    const load = useCallback(async (signal) => {
        setLoading(true);
        const [postResult, friendResult, followerResult, followingResult] = await Promise.allSettled([
            getUserPosts(session.token, session.user.id, signal),
            getConnections(session.token, 'friends', '', signal),
            getConnections(session.token, 'followers', '', signal),
            getConnections(session.token, 'following', '', signal),
        ]);
        if (signal?.aborted) return;
        const postResponse = postResult.status === 'fulfilled' ? postResult.value : null;
        setPosts(postResponse?.data || []);
        setStats({
            posts: postResponse?.pagination?.total ?? postResponse?.data?.length ?? 0,
            friends: friendResult.status === 'fulfilled' ? friendResult.value.pagination?.total || 0 : 0,
            followers: followerResult.status === 'fulfilled' ? followerResult.value.pagination?.total || 0 : 0,
            following: followingResult.status === 'fulfilled' ? followingResult.value.pagination?.total || 0 : 0,
        });
        setLoading(false);
    }, [session.token, session.user.id]);

    useFocusEffect(useCallback(() => {
        const controller = new AbortController();
        setForm({ name: session.user.name || '', username: session.user.username || '', bio: session.user.bio || '' });
        load(controller.signal);
        return () => controller.abort();
    }, [load, session.user.bio, session.user.name, session.user.username]));

    if (!session) return <Redirect href="/login" />;

    async function saveProfile() {
        const changes = Object.fromEntries(Object.entries(form).filter(([key, value]) => value !== (session.user[key] || '')));
        if (!Object.keys(changes).length) { setEditing(false); return; }
        setBusy(true); setError('');
        try {
            const updated = await updateCurrentProfile(session.token, changes);
            await authenticate({ token: session.token, user: updated });
            setForm({ name: updated.name || '', username: updated.username || '', bio: updated.bio || '' });
            setEditing(false);
        } catch (cause) { setError(cause.message || 'Profile changes could not be saved.'); }
        finally { setBusy(false); }
    }

    async function leave() {
        setBusy(true); setError('');
        try { await signOut(); }
        catch (cause) { setError(cause.message || 'Signed out locally, but the server could not be reached.'); }
        finally { setBusy(false); }
    }

    const user = session.user;
    const picture = user.avatar_version && !avatarFailed ? `${IDENTITY_API}/users/${user.id}/picture?v=${encodeURIComponent(user.avatar_version)}` : null;

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.top}><Text style={styles.brand}>windchime <Text style={styles.mark}>✳</Text></Text><Pressable style={styles.topAction} onPress={() => router.push('/(main)/notifications')}><Text style={styles.topActionText}>Notifications</Text></Pressable></View>
                <View style={styles.cover}><Text style={styles.coverEyebrow}>YOUR LITTLE CORNER OF WINDCHIME</Text><Text style={styles.coverMark}>✳</Text></View>
                <View style={styles.profileCard}>
                    <View style={styles.identityRow}>
                        <View style={styles.avatar}>{picture ? <Image source={{ uri: picture, headers: { Authorization: `Bearer ${session.token}` } }} onError={() => setAvatarFailed(true)} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(user.name || 'W').trim().slice(0, 1).toUpperCase()}</Text>}</View>
                        <View style={styles.identity}><Text style={styles.name} numberOfLines={1}>{user.name || 'WindChime member'}</Text><Text style={styles.username}>@{user.username || 'member'}</Text></View>
                        <Pressable style={styles.editButton} onPress={() => { setError(''); setEditing((value) => !value); }}><Text style={styles.editButtonText}>{editing ? 'Cancel' : 'Edit profile'}</Text></Pressable>
                    </View>
                    {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : <Text style={styles.bio}>Your corner, your people, your moments.</Text>}
                    <View style={styles.stats}>
                        <Stat count={stats.posts} label="Posts" />
                        <Stat count={stats.friends} label="Friends" />
                        <Stat count={stats.followers} label="Followers" />
                        <Stat count={stats.following} label="Following" />
                    </View>
                    <View style={styles.links}>
                        <Pressable style={styles.link} onPress={() => router.push('/(main)/connections')}><Text style={styles.linkText}>Your people</Text></Pressable>
                        <Pressable style={styles.link} onPress={() => router.push('/(main)/chats')}><Text style={styles.linkText}>Messages</Text></Pressable>
                    </View>
                </View>
                {editing ? <View style={styles.editCard}>
                    <Field label="Full name" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} />
                    <Field label="Username" value={form.username} onChangeText={(username) => setForm((current) => ({ ...current, username }))} autoCapitalize="none" />
                    <Field label="Bio" value={form.bio} onChangeText={(bio) => setForm((current) => ({ ...current, bio }))} multiline maxLength={500} />
                    <Pressable disabled={busy} onPress={saveProfile} style={[styles.button, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Save changes</Text>}</Pressable>
                </View> : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Your moments</Text><Text style={styles.sectionHint}>{stats.posts} shared</Text></View>
                {loading ? <View style={styles.empty}><ActivityIndicator color={colors.green} /></View> : posts.length ? posts.map((post) => <View key={post.id} style={styles.post}><Text style={styles.postText} numberOfLines={4}>{post.content || (post.media?.length ? 'Shared a photo or video' : 'Shared a moment')}</Text><Text style={styles.postMeta}>{new Date(post.created_at).toLocaleDateString()} · {post.kind === 'reel' ? 'Reel' : 'Post'}</Text></View>) : <Text style={styles.empty}>Your first shared moment will appear here.</Text>}
                <Pressable disabled={busy} onPress={leave} style={[styles.signOut, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.signOutText}>Sign out</Text>}</Pressable>
            </ScrollView>
        </View>
    );
}

function Stat({ count, label }) {
    return <View style={styles.stat}><Text style={styles.statValue}>{count}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Field({ label, value, onChangeText, ...props }) {
    return <><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, props.multiline && styles.bioInput]} value={value} onChangeText={onChangeText} autoCorrect={false} {...props} /></>;
}
