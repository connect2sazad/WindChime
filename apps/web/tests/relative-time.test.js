import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRelativeTime } from '../src/utils/formatRelativeTime.js';
const now = Date.parse('2026-10-07T12:00:00Z');
test('relative time uses compact units and floors elapsed values', () => {
    for (const [seconds, expected] of [
        [0,'now'],[59,'now'],[60,'1m'],[1800,'30m'],[3599,'59m'],
        [3600,'1h'],[86400,'1d'],[14*86400,'2w'],[30*86400,'1mo'],[365*86400,'1y'],
    ]) assert.equal(formatRelativeTime(new Date(now-seconds*1000).toISOString(),now),expected);
});
test('relative time tolerates missing invalid and future dates',()=>{
    for(const value of [undefined,null,'','bad'])assert.equal(formatRelativeTime(value,now),'—');
    assert.equal(formatRelativeTime(now+60000,now),'now');
});
test('equivalent timezone timestamps produce the same result',()=>{
    assert.equal(formatRelativeTime('2026-10-07T17:00:00+05:30',now),'30m');
    assert.equal(formatRelativeTime('2026-10-07T11:30:00Z',now),'30m');
});
