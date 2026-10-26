import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';

import CommonIconButton from '../Button/CommonIconButton';
import CommonLoading from '../CommonLoading';

const TimerActivity = ({ timerDuration, timerEndString, showTimerInSeconds }) => {
    const renderTime = ({ remainingTime }) => {
        if (remainingTime === 0) {
            return <div className="timerEndString">{timerEndString}</div>;
        }

        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        const remainingMinutes = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        return (
            <div className="timer">
                <div className="text">Remaining</div>
                <div className="value">{showTimerInSeconds || !minutes ? remainingTime : remainingMinutes}</div>
                <div className="text">
                    {showTimerInSeconds || !minutes ? `second${remainingTime > 1 ? 's' : ''}` : `minute${minutes > 1 ? 's' : ''}`}
                </div>
            </div>
        );
    };

    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(null);
    const [key, setKey] = useState(false);

    useEffect(() => {
        if (timerDuration) {
            setDuration(timerDuration);
        }
    }, [timerDuration]);

    if (!duration) return <CommonLoading />;

    return (
        <div className="activity-step-timer">
            <CountdownCircleTimer
                isPlaying={isPlaying}
                key={key}
                duration={duration}
                colors={['#f28d00']}
                colorsTime={[duration]}
                onComplete={() => {
                    setIsPlaying(false);
                }}>
                {renderTime}
            </CountdownCircleTimer>
            <div className="activity-step-timer-buttons">
                <CommonIconButton
                    toolTipTitle={isPlaying ? 'Pause' : 'Play'}
                    onClick={() => (isPlaying ? setIsPlaying(false) : setIsPlaying(true))}
                    icon={isPlaying ? 'pause' : 'play_arrow'}
                />
                <CommonIconButton
                    toolTipTitle="Reset"
                    onClick={() => {
                        setKey((k) => !k);
                        setIsPlaying(false);
                    }}
                    icon="replay"
                />
            </div>
        </div>
    );
};

TimerActivity.propTypes = {
    timerDuration: PropTypes.number,
    timerEndString: PropTypes.string,
    showTimerInSeconds: PropTypes.bool
};

export default TimerActivity;
