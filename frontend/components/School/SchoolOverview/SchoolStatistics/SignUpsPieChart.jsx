import PropTypes from 'prop-types';
import React from 'react';

import sharedJson from '../../../../shared/json/index.json';
import CommonPieChart from './../../../Shared/CommonPieChart';
import Heading1 from './../../../Shared/Typography/Heading1';

// eslint-disable-next-line no-unused-vars
const SignUpsPieChart = ({ schoolId, heading }) => {
    return (
        <div className="signups-chart">
            <Heading1 text={heading} />
            <div className="school-statistics-grid">
                <CommonPieChart title={'All pupils'} graphData={sharedJson.pieGraphData_1[0]} />
                <CommonPieChart title={'Pupil premium'} graphData={sharedJson.pieGraphData_1[1]} />
                <CommonPieChart title={'Non pupil premium'} graphData={sharedJson.pieGraphData_1[2]} />
            </div>
        </div>
    );
};

SignUpsPieChart.propTypes = { schoolId: PropTypes.number, heading: PropTypes.string.isRequired };

export default SignUpsPieChart;
