import PropTypes from 'prop-types';
import React from 'react';

import { getProgressBarStats } from '../../../../lib/statuses/pupilStatus';
import ProgressBarCard from '../ProgressBarCard';

const ClassStatsCard = ({ cardData }) => {
    const classStats = getProgressBarStats(cardData);

    return <ProgressBarCard statistics={classStats.data} footer={classStats.presentation} showPopper />;
};

ClassStatsCard.propTypes = {
    classSize: PropTypes.number.isRequired,
    isGroup: PropTypes.bool,
    cardData: PropTypes.shape({
        active: PropTypes.number,
        registered: PropTypes.number,
        missing: PropTypes.number
    })
};

ClassStatsCard.defaultProps = {
    isGroup: false
};

export default ClassStatsCard;
