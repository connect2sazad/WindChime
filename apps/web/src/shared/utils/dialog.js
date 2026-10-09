// Shared dialog event helper used to distinguish backdrop clicks from clicks inside.
export function isBackdropClick(event) {
    if (event.target !== event.currentTarget) return false;
    const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
    return (
        event.clientX < left ||
        event.clientX > right ||
        event.clientY < top ||
        event.clientY > bottom
    );
}
