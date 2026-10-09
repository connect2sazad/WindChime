// Photo-upload rules and carousel math, separated from the React components.
export const MAX_POST_PHOTOS = 12;
export async function checkPhoto(file) {
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () =>
                reject(
                    new Error(
                        'Could not read ' + file.name + '. Use a valid JPG, PNG or WebP photo.',
                    ),
                );
            image.src = url;
        });
        const width = image.naturalWidth,
            height = image.naturalHeight;
        if (!width || !height) throw new Error('Could not read ' + file.name);
        if (width * height > 64000000)
            throw new Error(file.name + ' exceeds 64 megapixels. Resize it before uploading.');
        if (width > height)
            throw new Error(
                file.name +
                    ' is landscape (' +
                    width +
                    ' × ' +
                    height +
                    '). Crop it to a square or portrait before uploading.',
            );
        return { width, height };
    } finally {
        URL.revokeObjectURL(url);
    }
}
export function slideFromScroll(scrollLeft, width, count) {
    if (!width || count < 1) return 0;
    return Math.max(0, Math.min(count - 1, Math.round(scrollLeft / width)));
}
