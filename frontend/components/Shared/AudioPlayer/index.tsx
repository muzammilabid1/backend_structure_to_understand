import 'react-h5-audio-player/lib/styles.css';

import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import ReactH5AudioPlayer from 'react-h5-audio-player';

/**
 * The single audio player for the whole app.
 *
 * `native` renders a plain <audio> element and is the default.
 * `rich` renders react-h5-audio-player, themed by the `.readinglog-audio-player`
 * rules in shared/scss/components/AudioPlayer.scss.
 *
 * Nothing outside this file should import react-h5-audio-player directly.
 */
export type AudioPlayerVariant = 'native' | 'rich';

export interface AudioPlayerProps {
    src: string;
    variant?: AudioPlayerVariant;
    /** Hides the download link. */
    hide?: boolean;
    /** Overrides the default per-variant data-test value. */
    dataTest?: string;
}

const DEFAULT_DATA_TEST: Record<AudioPlayerVariant, string> = {
    native: 'audio-player-preview',
    rich: 'audio-player-for-reading-log-preview'
};

const AudioPlayer = ({ src, variant = 'native', hide = false, dataTest }: AudioPlayerProps) => {
    const nativeRef = useRef<HTMLAudioElement>(null);
    const richRef = useRef<React.ElementRef<typeof ReactH5AudioPlayer>>(null);

    useEffect(() => {
        // Reload whenever the source changes. The old AudioPlayerForReadinLog
        // held a ref it never attached, so this only ever worked on the native
        // player; wiring the library ref makes both behave the same.
        const element = variant === 'rich' ? richRef.current?.audio?.current : nativeRef.current;

        element?.load();
    }, [src, variant]);

    return (
        <div className="audio-player-container" data-test={dataTest ?? DEFAULT_DATA_TEST[variant]}>
            {variant === 'rich' ? (
                <div className="readinglog-audio-player">
                    <ReactH5AudioPlayer ref={richRef} src={src} showJumpControls={false} />
                </div>
            ) : (
                <div className="audio-player">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio id="audio" controls ref={nativeRef} controlsList="nodownload" data-hj-suppress>
                        <source src={src} type="audio/mp3" />
                    </audio>
                </div>
            )}
            {!hide ? (
                <div className="audio-download">
                    <Link passHref href={src}>
                        <span className="material-icons">get_app</span>
                    </Link>
                </div>
            ) : null}
        </div>
    );
};

export default AudioPlayer;
