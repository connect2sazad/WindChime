const activeTypers = new Map();
const key = (conversationId, userId) => `${conversationId}:${userId}`;

export function setTyping(conversationId, userId, active, now = Date.now()) {
    const id = key(conversationId, userId);
    const previous = activeTypers.get(id);
    if (previous?.timer) clearTimeout(previous.timer);
    if (!active) {
        activeTypers.delete(id);
        return;
    }
    const entry = { expiresAt: now + 5000, timer: null };
    entry.timer = setTimeout(() => {
        if (activeTypers.get(id) === entry) activeTypers.delete(id);
    }, 5100);
    entry.timer.unref?.();
    activeTypers.set(id, entry);
}

export function isTyping(conversationId, userId, now = Date.now()) {
    const id = key(conversationId, userId);
    const entry = activeTypers.get(id);
    if (!entry) return false;
    if (entry.expiresAt <= now) {
        clearTimeout(entry.timer);
        activeTypers.delete(id);
        return false;
    }
    return true;
}
