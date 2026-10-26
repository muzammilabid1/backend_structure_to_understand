/* eslint-disable @next/next/no-img-element */
import { Card, CardMedia } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { findDOMNode } from 'react-dom';
import ReactPlayer from 'react-player/lazy';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import VideoTroubleshootingDialog from '../VideoTroubleshootingDialog';

const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleResize = () => {
                setWindowSize({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            };

            window.addEventListener('resize', handleResize);

            handleResize();

            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    return windowSize;
};

const VideoCard = ({
    videoId,
    videoLink,
    controls,
    onPlay,
    onEnded,
    customClass,
    type,
    playing,
    showPlayIcon,
    onClick,
    isShowVideoTroubleshooting
}) => {
    let player = null;
    const ref = (p) => {
        player = p;
    };

    const [isBufferingOrError, setIsBufferingOrError] = useState(false);
    const [showHelpIcon, setShowHelpIcon] = useState(false);

    const size = useWindowSize();

    const onStart = () => {
        if (size.width < 480) {
            -(
                // eslint-disable-next-line react/no-find-dom-node
                findDOMNode(player)
                    .requestFullscreen()
                    .catch((err) => {
                        console.log('Error', err);
                    })
            );
        }

        player
            .getInternalPlayer()
            .getTextTracks()
            .then((tracks) => {
                let trackToUse = tracks.find((track) => track.language.startsWith('en'))?.language;

                if (trackToUse) player.getInternalPlayer().enableTextTrack(trackToUse);
            });
    };

    useEffect(() => {
        let timer;
        if (isShowVideoTroubleshooting) {
            if (isBufferingOrError) {
                timer = setTimeout(() => {
                    setShowHelpIcon(true);
                }, 5000);
            } else {
                clearTimeout(timer);
                setShowHelpIcon(false);
            }
        }

        return () => clearTimeout(timer);
    }, [isBufferingOrError, isShowVideoTroubleshooting]);

    return (
        <Card className={`video-card-container top-${type}-border ${customClass}`}>
            <CardMedia className="video-player">
                <div onClick={onClick} className="wrapper">
                    <ReactPlayer
                        data-test={'video-card'}
                        ref={ref}
                        url={videoLink ? videoLink : `https://player.vimeo.com/video/${videoId}`}
                        // config={{
                        //     vimeo: {
                        //         playerOptions: {
                        //             texttrack: 'en'
                        //         }
                        //     }
                        // }}
                        controls={controls}
                        playing={playing}
                        onError={() => setIsBufferingOrError(true)}
                        onBuffer={() => setIsBufferingOrError(true)}
                        onBufferEnd={() => setIsBufferingOrError(false)}
                        onPause={() => setIsBufferingOrError(false)}
                        // this show play icon
                        light={showPlayIcon}
                        className="player"
                        width="100%"
                        height="100%"
                        onEnded={onEnded}
                        onPlay={onPlay}
                        onStart={onStart}
                        allowFullScreen={true}
                        oEmbedUrl={'https://vimeo.com/api/oembed.json?url={url}'}
                        playIcon={
                            <div className="thumbnail_img_container">
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/play-1.png`}
                                    className="play-icon"
                                    data-test="video-card-play-icon"
                                    alt="Click this button to play the video"
                                />
                            </div>
                        }
                    />
                    {isShowVideoTroubleshooting && showHelpIcon ? (
                        <VideoTroubleshootingDialog handleClose={() => setShowHelpIcon(false)} />
                    ) : null}
                </div>
            </CardMedia>
        </Card>
    );
};

VideoCard.propTypes = {
    height: PropTypes.string.isRequired,
    videoId: PropTypes.string,
    videoLink: PropTypes.string,
    controls: PropTypes.bool,
    customClass: PropTypes.string,
    ratingStar: PropTypes.bool,
    starValue: PropTypes.number,
    readOnly: PropTypes.bool,
    onPlay: PropTypes.func,
    onEnded: PropTypes.func,
    onStart: PropTypes.func,
    stars: PropTypes.number,
    type: PropTypes.string,
    onClick: PropTypes.func,
    playing: PropTypes.bool,
    showPlayIcon: PropTypes.bool,
    isShowVideoTroubleshooting: PropTypes.bool
};
VideoCard.defaultProps = {
    height: '360px',
    videoId: '356432913',
    controls: true,
    customClass: '',
    starValue: 1,
    readOnly: true,
    playing: false,
    showPlayIcon: false,
    isShowVideoTroubleshooting: false
};

export default VideoCard;
