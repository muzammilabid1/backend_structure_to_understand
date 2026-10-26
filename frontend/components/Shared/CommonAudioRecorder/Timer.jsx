import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import CommonSnackbar from '../CommonSnackbar';

const Timer = ({ isRecording, limitTime }) => {
    const [time, setTime] = useState(0);
    const [alertOpen, setAlertOpen] = useState(false);
    const alertTimeLimit = Math.floor(time / 1000) > limitTime - 30;

    useEffect(() => {
        let interval;

        if (isRecording) {
            interval = setInterval(() => {
                setTime((prevTime) => prevTime + 10);
            }, 10);
        } else if (!isRecording) {
            clearInterval(interval);
            setTime(0);
        }

        return () => clearInterval(interval);
    }, [isRecording]);

    const playAudio = () => {
        const audio = new Audio('/assets/audio/audio_limit.mp3');

        audio.play();
    };

    const triggerVibration = () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(1000);
        }
    };

    const scrollToButton = () => {
        const getButton = document.getElementById('simple-popover');

        if (getButton) {
            const buttonPosition = getButton.getBoundingClientRect();
            const isVisible = buttonPosition.top >= 0 && buttonPosition.bottom <= window.innerHeight;

            if (!isVisible) {
                getButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const addBlinkClass = () => {
        const timeRecorder = document.getElementById('time_recorder');

        if (timeRecorder) {
            const spans = timeRecorder.getElementsByTagName('span');

            for (const span of spans) {
                span.classList.add('blink');
            }
        }
    };

    const message = (limitTime) => {
        const duration = moment.duration(limitTime, 'seconds');
        const minutes = Math.floor(duration.asMinutes());
        const remainingSeconds = duration.seconds();

        const timeString =
            minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : `${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;

        return (
            <span>
                Time is running out. The maximum recording limit is <strong>{timeString}</strong>.
            </span>
        );
    };

    useEffect(() => {
        if (alertTimeLimit && isRecording) {
            setAlertOpen(true);
            playAudio();
            triggerVibration();
            scrollToButton();
            addBlinkClass();
        }
    }, [alertTimeLimit, isRecording]);

    return (
        <div>
            <CommonSnackbar
                open={alertOpen}
                type="error"
                autoHideDuration={30000}
                message={message(limitTime)}
                onClose={() => setAlertOpen(false)}
                showSnackbar={true}
            />

            {!isRecording && !time && <span className="material-icons mic-icon">mic</span>}
            {isRecording && (
                <div className="recorder-countdown" id="time_recorder">
                    <span className="dot" />
                    <span>{('0' + Math.floor((time / 60000) % 60)).slice(-2)}:</span>
                    <span>{('0' + Math.floor((time / 1000) % 60)).slice(-2)}</span>
                </div>
            )}
        </div>
    );
};

Timer.propTypes = {
    isRecording: PropTypes.bool.isRequired,
    limitTime: PropTypes.string
};

export default Timer;
