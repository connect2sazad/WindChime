const loadingList = Object.freeze({ rows: [], pagination: null, loading: true, error: '' });
// A tab must never render records, pagination or errors fetched for another view.
export function visibleProfileList(snapshot, key) {
    return snapshot?.key === key ? snapshot : loadingList;
}
