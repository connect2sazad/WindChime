import ProfileLink from '../ProfileLink.js';
import ProfileMoreMenu from '../components/ProfileMoreMenu.jsx';
import { visibleProfileList } from '../utils/profileList.js';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
    getProfileByUsername,
    updateProfile,
    getDisplayUser,
    uploadProfilePicture,
    removeProfilePicture,
} from '../api/index.js';
import { getUserPosts, getUserReshares } from '../../posts/api/index.js';
import { listProfileConnections } from '../../connections/api/index.js';
import Avatar from '../Avatar.js';
import ConnectionActions from '../../connections/Actions.js';
import useAvailability from '../../identity/availability.js';
import { PostCard } from '../../posts/PostCard.js';
import Skeleton from '../../../shared/components/Skeleton.jsx';

const TABS = [
    ['all', 'All posts'],
    ['text', 'Text'],
    ['photos', 'Photos'],
    ['videos', 'Videos'],
    ['reels', 'Reels'],
    ['reshares', 'Reshares'],
    ['friends', 'Friends'],
    ['followers', 'Followers'],
    ['following', 'Following'],
];
const PEOPLE = ['friends', 'followers', 'following'];
const POST_TYPES = ['all', 'text', 'photos', 'videos'];
function ProfileEditor({ children, onClose, busy }) {
    const dialog = useRef(null);
    useEffect(() => {
        const element = dialog.current;
        const focus = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        element.showModal();
        return () => {
            element.close();
            document.body.style.overflow = overflow;
            if (focus?.isConnected) focus.focus();
        };
    }, []);
    return (
        <dialog
            ref={dialog}
            className="wc-profile-dialog"
            aria-labelledby="profile-editor-title"
            onCancel={(event) => {
                event.preventDefault();
                if (!busy) onClose();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget && !busy) onClose();
            }}
        >
            <header>
                <div>
                    <p className="wc-overline">YOUR CORNER</p>
                    <h2 id="profile-editor-title">Edit profile</h2>
                </div>
                <button
                    type="button"
                    aria-label="Close profile editor"
                    disabled={busy}
                    onClick={onClose}
                >
                    ×
                </button>
            </header>
            {children}
        </dialog>
    );
}
// Loads a profile and its tabs; profile owners can edit details and their picture.
export default function Profile({ session, onUpdated }) {
    const { username } = useParams();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const selected = params.get('tab') || 'all';
    const tab = TABS.some(([key]) => key === selected) ? selected : 'all';
    const [profile, setProfile] = useState(null);
    const [list, setList] = useState(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const [edit, setEdit] = useState(false);
    const [form, setForm] = useState({ name: '', username: '', bio: '' });
    const [saving, setSaving] = useState(false);
    const [pictureBusy, setPictureBusy] = useState(false);
    const pending = useRef(false);
    const picturePending = useRef(false);
    const chooser = useRef(null);
    const [counts, setCounts] = useState({});
    const [feedback, setFeedback] = useState('');
    const id = profile?.id ?? null;
    const own = id === session.user.id;
    const [profileRevision, setProfileRevision] = useState(0);
    // Hide old rows while a different tab or page is loading.
    const listKey = JSON.stringify([id, session.token, tab, page, revision]);
    const {
        rows,
        pagination,
        loading: listLoading,
        error: listError,
    } = visibleProfileList(list, listKey);
    useEffect(() => {
        const changed = () => setRevision((value) => value + 1);
        window.addEventListener('windchime:safety-changed', changed);
        return () => window.removeEventListener('windchime:safety-changed', changed);
    }, []);
    const availability = useAvailability('username', form.username, own && edit, session.token);
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setLoading(true);
            setError('');
            try {
                if (!username) throw new Error('Invalid profile');
                const data = await getProfileByUsername(session.token, username, controller.signal);
                if (!Number.isSafeInteger(data?.id)) throw new Error('Unexpected profile response');
                if (controller.signal.aborted) return;
                setProfile(data);
                setForm({ name: data.name, username: data.username, bio: data.bio || '' });
            } catch (e) {
                if (!controller.signal.aborted) setError(e.message);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        load();
        return () => controller.abort();
    }, [username, session.token, profileRevision]);
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setList({ key: listKey, rows: [], pagination: null, loading: true, error: '' });
            try {
                if (!Number.isSafeInteger(id) || id < 1) return;
                // Each tab uses a different endpoint; rows then need display names for rendering.
                const result = PEOPLE.includes(tab)
                    ? await listProfileConnections(session.token, id, tab, page, controller.signal)
                    : tab === 'reshares'
                      ? await getUserReshares(session.token, id, page, controller.signal)
                      : await getUserPosts(session.token, id, page, controller.signal, tab);
                if (!Array.isArray(result.data))
                    throw new Error('Unexpected profile list response');
                const data = PEOPLE.includes(tab)
                    ? await Promise.all(
                          result.data.map((row) =>
                              getDisplayUser(session.token, row.user_id, controller.signal),
                          ),
                      )
                    : await Promise.all(
                          result.data.map(async (post) => {
                              const author = await getDisplayUser(
                                  session.token,
                                  post.creator_id,
                                  controller.signal,
                              );
                              return {
                                  ...post,
                                  name: author.name,
                                  username: author.username,
                                  tone: 'lime',
                              };
                          }),
                      );
                if (!controller.signal.aborted)
                    setList({
                        key: listKey,
                        rows: data,
                        pagination: result.pagination,
                        loading: false,
                        error: '',
                    });
            } catch (e) {
                if (!controller.signal.aborted)
                    setList({
                        key: listKey,
                        rows: [],
                        pagination: null,
                        loading: false,
                        error: e.message,
                    });
            }
        }
        load();
        return () => controller.abort();
    }, [id, session.token, tab, page, revision, listKey]);
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            const keys = ['posts', ...PEOPLE];
            const results = await Promise.allSettled([
                getUserPosts(session.token, id, 1, controller.signal),
                ...PEOPLE.map((view) =>
                    listProfileConnections(session.token, id, view, 1, controller.signal),
                ),
            ]);
            if (!controller.signal.aborted)
                setCounts(
                    Object.fromEntries(
                        results.map((result, index) => [
                            keys[index],
                            result.status === 'fulfilled' ? result.value.pagination.total : null,
                        ]),
                    ),
                );
        }
        if (Number.isSafeInteger(id) && id > 0) load();
        return () => controller.abort();
    }, [id, session.token, revision]);
    // Save only when the username availability check allows the submitted name.
    async function save(event) {
        event.preventDefault();
        if (pending.current || availability.status !== 'available') return;
        pending.current = true;
        setSaving(true);
        setError('');
        try {
            const data = await updateProfile(session.token, form);
            setProfile(data);
            onUpdated(data);
            setRevision((value) => value + 1);
            setEdit(false);
            setFeedback('Your profile has been updated.');
            if (data.username !== username)
                navigate(
                    '/profiles/' +
                        encodeURIComponent(data.username) +
                        (params.toString() ? '?' + params.toString() : ''),
                    { replace: true },
                );
        } catch (e) {
            setError(e.message);
        } finally {
            pending.current = false;
            setSaving(false);
        }
    }
    async function changePicture(file, remove = false) {
        if (picturePending.current) return;
        if (
            !remove &&
            (!file ||
                !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
                file.size > 5 * 1024 * 1024)
        ) {
            setError('Choose a JPG, PNG or WebP image up to 5 MB');
            return;
        }
        picturePending.current = true;
        setPictureBusy(true);
        setError('');
        try {
            const data = remove
                ? await removeProfilePicture(session.token)
                : await uploadProfilePicture(session.token, file);
            setProfile((previous) => ({ ...previous, ...data }));
            onUpdated(data);
            setRevision((value) => value + 1);
            setFeedback(remove ? 'Profile picture removed.' : 'Profile picture updated.');
        } catch (e) {
            setError(e.message);
        } finally {
            picturePending.current = false;
            setPictureBusy(false);
            if (chooser.current) chooser.current.value = '';
        }
    }
    async function shareProfile() {
        const url = window.location.origin + '/profiles/' + encodeURIComponent(profile.username);
        try {
            if (navigator.share) {
                await navigator.share({ title: profile.name + ' on WindChime', url });
            } else {
                await navigator.clipboard.writeText(url);
                setFeedback('Profile link copied.');
            }
        } catch (error) {
            if (error.name !== 'AbortError')
                setError(
                    'Could not share automatically. Copy the profile address from your browser.',
                );
        }
    }
    function selectTab(value) {
        setPage(1);
        setParams({ tab: value });
    }
    function openEditor() {
        setForm({ name: profile.name, username: profile.username, bio: profile.bio || '' });
        setError('');
        setEdit(true);
    }
    const group = PEOPLE.includes(tab) ? 'people' : POST_TYPES.includes(tab) ? 'posts' : tab;
    const label = TABS.find(([key]) => key === tab)[1];
    return (
        <main className="wc-profile-page">
            <div className="wc-profile-layout">
                <Link className="wc-profile-back" to="/">
                    ← Back to feed
                </Link>
                {loading ? (
                    <Skeleton variant="profile" count={1} />
                ) : profile ? (
                    <>
                        <section className="wc-profile-card">
                            <div className="wc-profile-cover">
                                <span>YOUR LITTLE CORNER OF WINDCHIME</span>
                                <i aria-hidden="true">✳</i>
                            </div>
                            <div className="wc-profile-details">
                                <div className="wc-profile-picture">
                                    {own ? (
                                        <button
                                            className="wc-avatar-edit"
                                            type="button"
                                            aria-label="Change profile picture"
                                            disabled={pictureBusy}
                                            onClick={() => chooser.current.click()}
                                        >
                                            <Avatar
                                                name={profile.name}
                                                id={id}
                                                token={session.token}
                                                version={profile.avatar_version}
                                                large
                                            />
                                            <span className="wc-picture-badge" aria-hidden="true">
                                                ＋
                                            </span>
                                        </button>
                                    ) : (
                                        <Avatar
                                            name={profile.name}
                                            id={id}
                                            token={session.token}
                                            version={profile.avatar_version}
                                            large
                                        />
                                    )}
                                </div>
                                <div className="wc-profile-identity">
                                    <h1>{profile.name}</h1>
                                    <p>@{profile.username}</p>
                                </div>
                                <div className="wc-profile-header-actions">
                                    {own ? (
                                        <>
                                            <button
                                                className="wc-profile-edit-button"
                                                type="button"
                                                onClick={openEditor}
                                            >
                                                Edit profile
                                            </button>
                                            <Link className="wc-profile-share-button" to="/create">
                                                ＋ Share a moment
                                            </Link>
                                        </>
                                    ) : (
                                        <ConnectionActions
                                            key={id + '-' + revision}
                                            session={session}
                                            userId={id}
                                            onChange={() => setRevision((value) => value + 1)}
                                        />
                                    )}
                                    <ProfileMoreMenu
                                        session={session}
                                        userId={id}
                                        own={own}
                                        onShare={shareProfile}
                                        onChange={() => setRevision((value) => value + 1)}
                                    />
                                </div>
                            </div>
                            {!edit && (
                                <input
                                    ref={chooser}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    hidden
                                    onChange={(event) => {
                                        if (event.target.files[0])
                                            changePicture(event.target.files[0]);
                                    }}
                                />
                            )}
                            <div className="wc-profile-about">
                                <p>
                                    {profile.bio ||
                                        (own
                                            ? 'Tell people a little about yourself. Add a bio in Edit profile.'
                                            : 'A little closer, one hello at a time.')}
                                </p>
                                <span>
                                    Joined{' '}
                                    {new Date(profile.created_at).toLocaleDateString(undefined, {
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </span>
                            </div>
                            <div className="wc-profile-stats" aria-label="Profile statistics">
                                {[
                                    ['posts', 'Posts', 'all'],
                                    ['friends', 'Friends', 'friends'],
                                    ['followers', 'Followers', 'followers'],
                                    ['following', 'Following', 'following'],
                                ].map(([key, title, value]) => (
                                    <button
                                        type="button"
                                        key={key}
                                        onClick={() => selectTab(value)}
                                        aria-label={(counts[key] ?? 'Loading') + ' ' + title}
                                    >
                                        <strong>{counts[key] ?? '—'}</strong>
                                        <span>{title}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                        {pictureBusy && (
                            <p className="wc-profile-feedback" role="status">
                                Updating your picture…
                            </p>
                        )}
                        {feedback && (
                            <p className="wc-profile-feedback" role="status">
                                {feedback}
                            </p>
                        )}
                        {error && !edit && (
                            <p className="wc-profile-error" role="alert">
                                {error}
                            </p>
                        )}
                        <section className="wc-profile-posts">
                            <nav className="wc-profile-primary-tabs" aria-label="Profile sections">
                                {[
                                    ['posts', 'Posts', 'all'],
                                    ['reels', 'Reels', 'reels'],
                                    ['reshares', 'Reshares', 'reshares'],
                                    ['people', 'Connections', 'friends'],
                                ].map(([key, title, value]) => (
                                    <button
                                        type="button"
                                        key={key}
                                        className={group === key ? 'active' : ''}
                                        aria-current={group === key ? 'page' : undefined}
                                        onClick={() => selectTab(value)}
                                    >
                                        {title}
                                    </button>
                                ))}
                            </nav>
                            <div className="wc-profile-content-heading">
                                <div>
                                    <h2>
                                        {group === 'people'
                                            ? label
                                            : group === 'posts'
                                              ? 'Shared moments'
                                              : label}
                                    </h2>
                                    <p>
                                        {group === 'people'
                                            ? 'The people in this corner of WindChime.'
                                            : group === 'reshares'
                                              ? 'Moments worth passing along.'
                                              : group === 'reels'
                                                ? 'Little stories in motion.'
                                                : 'Thoughts, photos, and stories.'}
                                    </p>
                                </div>
                                {!listLoading && pagination && (
                                    <span>
                                        {pagination.total}{' '}
                                        {group === 'people'
                                            ? pagination.total === 1
                                                ? 'person'
                                                : 'people'
                                            : pagination.total === 1
                                              ? 'moment'
                                              : 'moments'}
                                    </span>
                                )}
                            </div>
                            {(group === 'posts' || group === 'people') && (
                                <nav
                                    className="wc-profile-filter-tabs"
                                    aria-label={
                                        group === 'people' ? 'Connection type' : 'Post format'
                                    }
                                >
                                    {(group === 'people'
                                        ? TABS.filter(([key]) => PEOPLE.includes(key))
                                        : TABS.filter(([key]) => POST_TYPES.includes(key))
                                    ).map(([key, title]) => (
                                        <button
                                            type="button"
                                            key={key}
                                            className={tab === key ? 'active' : ''}
                                            aria-current={tab === key ? 'page' : undefined}
                                            onClick={() => selectTab(key)}
                                        >
                                            {key === 'all' ? 'All' : title}
                                        </button>
                                    ))}
                                </nav>
                            )}
                            {listLoading ? (
                                <Skeleton count={4} />
                            ) : listError ? (
                                <div className="wc-profile-empty" role="alert">
                                    <h3>Couldn’t load this section</h3>
                                    <p>{listError}</p>
                                    <button onClick={() => setRevision((value) => value + 1)}>
                                        Try again
                                    </button>
                                </div>
                            ) : rows.length ? (
                                <>
                                    {PEOPLE.includes(tab) ? (
                                        <div className="wc-people-list">
                                            {rows.map((user) => (
                                                <article className="wc-person-card" key={user.id}>
                                                    <ProfileLink
                                                        className="wc-person-identity"
                                                        username={user.username}
                                                        onClick={() => setPage(1)}
                                                    >
                                                        <Avatar
                                                            name={user.name}
                                                            id={user.id}
                                                            token={session.token}
                                                        />
                                                        <div>
                                                            <strong>{user.name}</strong>
                                                            <small>
                                                                {user.username
                                                                    ? '@' + user.username
                                                                    : 'Account unavailable'}
                                                            </small>
                                                        </div>
                                                    </ProfileLink>
                                                    <ConnectionActions
                                                        session={session}
                                                        userId={user.id}
                                                        showRemoveFollower={own && tab === 'followers'}
                                                        onChange={() =>
                                                            setRevision((value) => value + 1)
                                                        }
                                                    />
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        rows.map((post) => (
                                            <div key={post.id}>
                                                {tab === 'reshares' && (
                                                    <p className="wc-reshare-label">
                                                        ↻ {profile.name} reshared this moment
                                                    </p>
                                                )}
                                                <PostCard
                                                    post={post}
                                                    token={session.token}
                                                    currentUser={session.user}
                                                    onUpdated={(data) => {
                                                        setList((previous) =>
                                                            previous?.key === listKey
                                                                ? {
                                                                      ...previous,
                                                                      rows: previous.rows.map(
                                                                          (item) =>
                                                                              item.id === data.id
                                                                                  ? {
                                                                                        ...item,
                                                                                        ...data,
                                                                                    }
                                                                                  : item,
                                                                      ),
                                                                  }
                                                                : previous,
                                                        );
                                                        setFeedback('Post updated.');
                                                    }}
                                                    onDeleted={(postId) => {
                                                        setList((previous) =>
                                                            previous?.key === listKey
                                                                ? {
                                                                      ...previous,
                                                                      rows: previous.rows.filter(
                                                                          (item) =>
                                                                              item.id !== postId,
                                                                      ),
                                                                  }
                                                                : previous,
                                                        );
                                                        setFeedback('Post deleted.');
                                                        if (rows.length === 1 && page > 1)
                                                            setPage((value) => value - 1);
                                                        setRevision((value) => value + 1);
                                                    }}
                                                />
                                            </div>
                                        ))
                                    )}
                                </>
                            ) : (
                                <div className="wc-profile-empty">
                                    <span aria-hidden="true">
                                        {group === 'people' ? '♧' : '✳'}
                                    </span>
                                    <h3>
                                        {group === 'people'
                                            ? 'A little room for connection'
                                            : own
                                              ? 'Your next moment starts here'
                                              : 'No moments here yet'}
                                    </h3>
                                    <p>
                                        {group === 'people'
                                            ? 'No ' + label.toLowerCase() + ' to show yet.'
                                            : 'No ' +
                                              (tab === 'all' ? 'posts' : label.toLowerCase()) +
                                              ' here yet.'}
                                    </p>
                                    {own && (
                                        <Link
                                            to={
                                                group === 'people'
                                                    ? '/connections?view=discover'
                                                    : '/create'
                                            }
                                        >
                                            {group === 'people'
                                                ? 'Find your people'
                                                : 'Share a moment'}{' '}
                                            →
                                        </Link>
                                    )}
                                </div>
                            )}
                            {!listLoading && pagination?.total_pages > 1 && !listError && (
                                <div className="wc-connections-pagination">
                                    <button
                                        disabled={!pagination.has_previous_page}
                                        onClick={() => setPage((value) => value - 1)}
                                    >
                                        Previous
                                    </button>
                                    <span>
                                        Page {page} of {pagination.total_pages}
                                    </span>
                                    <button
                                        disabled={!pagination.has_next_page}
                                        onClick={() => setPage((value) => value + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </section>
                        {own && edit && (
                            <ProfileEditor
                                busy={saving || pictureBusy}
                                onClose={() => setEdit(false)}
                            >
                                <input
                                    ref={chooser}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    hidden
                                    onChange={(event) => {
                                        if (event.target.files[0])
                                            changePicture(event.target.files[0]);
                                    }}
                                />
                                <div className="wc-editor-picture">
                                    <Avatar
                                        name={profile.name}
                                        id={id}
                                        token={session.token}
                                        version={profile.avatar_version}
                                        large
                                    />
                                    <div>
                                        <button
                                            type="button"
                                            disabled={pictureBusy}
                                            onClick={() => chooser.current.click()}
                                        >
                                            {pictureBusy ? 'Updating…' : 'Change picture'}
                                        </button>
                                        <p>JPG, PNG or WebP · up to 5 MB</p>
                                        {profile.avatar_version && (
                                            <button
                                                type="button"
                                                className="wc-remove-picture"
                                                disabled={pictureBusy}
                                                onClick={() => changePicture(null, true)}
                                            >
                                                Remove picture
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <form className="wc-profile-edit" onSubmit={save}>
                                    <label htmlFor="profile-name">Name</label>
                                    <input
                                        id="profile-name"
                                        value={form.name}
                                        onChange={(event) =>
                                            setForm((previous) => ({
                                                ...previous,
                                                name: event.target.value,
                                            }))
                                        }
                                        minLength={3}
                                        maxLength={100}
                                        disabled={saving}
                                        required
                                    />
                                    <label htmlFor="profile-username">Username</label>
                                    <input
                                        id="profile-username"
                                        value={form.username}
                                        onChange={(event) =>
                                            setForm((previous) => ({
                                                ...previous,
                                                username: event.target.value.toLowerCase(),
                                            }))
                                        }
                                        minLength={3}
                                        maxLength={50}
                                        disabled={saving}
                                        required
                                    />
                                    <small
                                        className={'availability ' + availability.status}
                                        role="status"
                                    >
                                        {availability.message}
                                    </small>
                                    <label htmlFor="profile-bio">
                                        Bio <small>{form.bio.length}/500</small>
                                    </label>
                                    <textarea
                                        id="profile-bio"
                                        value={form.bio}
                                        onChange={(event) =>
                                            setForm((previous) => ({
                                                ...previous,
                                                bio: event.target.value,
                                            }))
                                        }
                                        maxLength={500}
                                        placeholder="A few words about you…"
                                        disabled={saving}
                                    />
                                    <p className="wc-profile-private">
                                        Only you can see your email: {profile.email}
                                    </p>
                                    {error && (
                                        <p className="wc-profile-error" role="alert">
                                            {error}
                                        </p>
                                    )}
                                    <footer>
                                        <button
                                            className="secondary"
                                            type="button"
                                            disabled={saving || pictureBusy}
                                            onClick={() => setEdit(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            disabled={
                                                saving ||
                                                pictureBusy ||
                                                availability.status !== 'available'
                                            }
                                        >
                                            {saving ? 'Saving…' : 'Save changes'}
                                        </button>
                                    </footer>
                                </form>
                            </ProfileEditor>
                        )}
                    </>
                ) : (
                    error && (
                        <div className="wc-profile-empty" role="alert">
                            <h3>Couldn’t load this profile</h3>
                            <p>{error}</p>
                            <button onClick={() => setProfileRevision((value) => value + 1)}>
                                Try again
                            </button>
                            <Link to="/connections?view=discover">Find people</Link>
                        </div>
                    )
                )}
            </div>
        </main>
    );
}
