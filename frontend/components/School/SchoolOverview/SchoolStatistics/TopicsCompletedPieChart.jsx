import PropTypes from 'prop-types';
import React from 'react';

import sharedJson from '../../../../shared/json/index.json';
import CommonPieChart from '../../../Shared/CommonPieChart';
import Heading1 from '../../../Shared/Typography/Heading1';

// eslint-disable-next-line no-unused-vars
const TopicsCompletedPieChart = ({ schoolId, heading }) => {
    return (
        <div className="school-topics">
            <Heading1 text={heading} />
            <div className="school-statistics-grid">
                <CommonPieChart title={'All pupils'} graphData={sharedJson.pieGraphData_2[0]} />
                <CommonPieChart title={'Pupil premium'} graphData={sharedJson.pieGraphData_2[1]} />
                <CommonPieChart title={'Non pupil premium'} graphData={sharedJson.pieGraphData_2[2]} />
            </div>
        </div>
    );
};

TopicsCompletedPieChart.propTypes = { schoolId: PropTypes.number, heading: PropTypes.string.isRequired };

export default TopicsCompletedPieChart;
