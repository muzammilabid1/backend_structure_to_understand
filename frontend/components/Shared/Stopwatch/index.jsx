import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import CommonIconButton from '../Button/CommonIconButton';

const Stopwatch = ({ includeSeconds }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [time, setTime] = useState(0);

    useEffect(() => {
        let interval;

        if (isPlaying) {
            interval = setInterval(() => {
                setTime((prevTime) => prevTime + 10);
            }, 10);
        } else if (!isPlaying) {
            clearInterval(interval);
        }

        return () => clearInterval(interval);
    }, [isPlaying]);

    return (
        <div className="activity-step-stopwatch">
            <div
                className="activity-step-stopwatch-numbers"
                style={{ width: includeSeconds ? '160px' : '100px' }}
                onClick={() => (isPlaying ? setIsPlaying(false) : setIsPlaying(true))}>
                <span>{('0' + Math.floor((time / 60000) % 60)).slice(-2)}:</span>
                <span>{('0' + Math.floor((time / 1000) % 60)).slice(-2)}</span>
                {includeSeconds && <span>.{('0' + ((time / 10) % 100)).slice(-2)}</span>}
            </div>
            <div className="activity-step-stopwatch-buttons">
                <CommonIconButton
                    toolTipTitle={isPlaying ? 'Pause' : 'Play'}
                    onClick={() => (isPlaying ? setIsPlaying(false) : setIsPlaying(true))}
                    icon={isPlaying ? 'pause' : 'play_arrow'}
                />
                <CommonIconButton
                    toolTipTitle="Reset"
                    onClick={() => {
                        setTime(0);
                        setIsPlaying(false);
                    }}
                    icon="replay"
                />
            </div>
        </div>
    );
};

Stopwatch.propTypes = { includeSeconds: PropTypes.bool };

export default Stopwatch;
