// Tests photo upload validation and carousel index calculations.
import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_POST_PHOTOS, checkPhoto, slideFromScroll } from '../src/modules/posts/utils/photos.js';
afterEach(() => mock.restoreAll());
test('photo upload accepts square and portrait images and rejects landscape with cleanup', async () => {
    const saved = globalThis.Image;
    let dimensions = { width: 800, height: 1000 },
        released = 0;
    mock.method(URL, 'createObjectURL', () => 'blob:photo');
    mock.method(URL, 'revokeObjectURL', () => released++);
    globalThis.Image = class {
        set src(value) {
            assert.equal(value, 'blob:photo');
            this.naturalWidth = dimensions.width;
            this.naturalHeight = dimensions.height;
            queueMicrotask(() => this.onload());
        }
    };
    try {
        assert.equal(MAX_POST_PHOTOS, 12);
        assert.deepEqual(await checkPhoto({ name: 'portrait.png' }), { width: 800, height: 1000 });
        dimensions = { width: 800, height: 800 };
        await checkPhoto({ name: 'square.png' });
        dimensions = { width: 1000, height: 800 };
        await assert.rejects(
            () => checkPhoto({ name: 'wide.png' }),
            /landscape.*square or portrait/,
        );
        assert.equal(released, 3);
    } finally {
        globalThis.Image = saved;
    }
});
test('swipe counter rounds to the visible slide and remains bounded on resize or overscroll', () => {
    assert.equal(slideFromScroll(0, 300, 12), 0);
    assert.equal(slideFromScroll(300, 300, 12), 1);
    assert.equal(slideFromScroll(3299, 300, 12), 11);
    assert.equal(slideFromScroll(-50, 300, 12), 0);
    assert.equal(slideFromScroll(5000, 300, 12), 11);
    assert.equal(slideFromScroll(300, 0, 12), 0);
});
