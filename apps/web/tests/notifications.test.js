// Notification endpoint, unread-count, and notification destination tests.
import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
    listNotifications,
    unreadCount,
    markRead,
    markAllRead,
} from '../src/modules/notifications/api/index.js';
import { notificationDestination } from '../src/modules/notifications/utils/notificationText.js';
afterEach(() => mock.restoreAll());
test('notification API uses authenticated scope and bounded snapshot read', async () => {
    const requests = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
        requests.push({ url: String(url), options });
        assert.equal(options.headers.Authorization, 'Bearer test');
        return Response.json({
            success: true,
            data: [],
            unread_count: 2,
            pagination: { has_next_page: false },
        });
    });
    await listNotifications('test', { page: 2, unread: true });
    await markRead('test', 3);
    await markAllRead('test', 10);
    assert.match(requests[0].url, /page=2&limit=20&unread=true$/);
    assert.equal(requests[1].options.method, 'PATCH');
    assert.deepEqual(JSON.parse(requests[2].options.body), { through_id: 10 });
});
test('bell rejects malformed counts', async () => {
    mock.method(globalThis, 'fetch', async () =>
        Response.json({ success: true, data: { count: -1 } }),
    );
    await assert.rejects(() => unreadCount('test'), /Unexpected notification count/);
});
test('notification destinations use username profiles and parent posts', () => {
    assert.equal(
        notificationDestination({ target_type: 'conversation', target_id: 4 }),
        '/messages?conversation=4',
    );
    assert.equal(
        notificationDestination({ target_type: 'profile' }, { username: 'tester' }),
        '/profiles/tester',
    );
    assert.equal(
        notificationDestination({ target_type: 'comment', target_id: 7, context: { post_id: 3 } }),
        '/notifications/posts/3',
    );
    assert.equal(
        notificationDestination({ target_type: 'friendship', type: 'friend.request' }),
        '/connections?view=incoming',
    );
});

test('notification post opening hides inactive targets', async () => {
    const { getPost } = await import('../src/modules/posts/api/index.js');
    mock.method(globalThis, 'fetch', async () =>
        Response.json({ success: true, data: { id: 3, status: false } }),
    );
    await assert.rejects(
        () => getPost('test', 3),
        (error) => error.status === 404,
    );
});
