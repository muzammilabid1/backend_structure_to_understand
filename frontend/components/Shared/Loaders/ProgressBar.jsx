import { LinearProgress } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

const ProgressBar = ({ value, classNames }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress === 100) {
                    return 0;
                }

                const diff = Math.random() * 10;

                return Math.min(oldProgress + diff, 100);
            });
        }, 500);

        return () => {
            clearInterval(timer);
        };
    }, []);

    return (
        <div className="progress-bar">
            <LinearProgress className={classNames} variant="determinate" value={value ? value : progress} />
        </div>
    );
};

ProgressBar.propTypes = {
    value: PropTypes.number,
    classNames: PropTypes.string
};
export default ProgressBar;
