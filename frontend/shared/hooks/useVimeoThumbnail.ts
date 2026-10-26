import { useEffect, useState } from 'react';

// One lookup per video for the whole session, however many cards show it.
const thumbnails = new Map<string, Promise<string | null>>();

const fetchVimeoThumbnail = (videoLink: string): Promise<string | null> => {
    if (!thumbnails.has(videoLink)) {
        thumbnails.set(
            videoLink,
            fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoLink)}&width=640`)
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => data?.thumbnail_url ?? null)
                .catch(() => {
                    thumbnails.delete(videoLink);

                    return null;
                })
        );
    }

    return thumbnails.get(videoLink);
};

export function useVimeoThumbnail(videoLink?: string | null) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

    useEffect(() => {
        setThumbnailUrl(null);

        if (!videoLink) return;

        let active = true;

        fetchVimeoThumbnail(videoLink).then((url) => {
            if (active) setThumbnailUrl(url);
        });

        return () => {
            active = false;
        };
    }, [videoLink]);

    return thumbnailUrl;
}
