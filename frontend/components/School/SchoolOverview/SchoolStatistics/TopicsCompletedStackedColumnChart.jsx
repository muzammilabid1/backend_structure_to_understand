import PropTypes from 'prop-types';
import React, { useState } from 'react';

import sharedJson from '../../../../shared/json/index.json';
import CommonCheckBox from './../../../Shared/CommonCheckBox';
import CommonPopOver from './../../../Shared/CommonPopOver';
import CommonStackedColumnChart from './../../../Shared/CommonStackedColumnChart';
import Paragraph from './../../../Shared/CommonStackedColumnChart';
// eslint-disable-next-line no-unused-vars
const TopicsCompletedStackedColumnChart = ({ schoolId, title }) => {
    const [option, setOption] = useState('All Years');
    const yearOptions = ['EYFS', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'All Years'];

    return (
        <div className="classes-sign-up-chart">
            <div className="classes-sign-up-chart-header">
                <Paragraph text={title} />
                <CommonPopOver bold icon="expand_more" text={'Options'}>
                    <div>
                        {yearOptions.map((opt, idx) => (
                            <>
                                {idx !== 0 && <br />}
                                <CommonCheckBox
                                    onClick={(e) => setOption(e.target.value)}
                                    checked={option === opt}
                                    value={opt}
                                    name="option"
                                    label={opt}
                                />
                            </>
                        ))}
                    </div>
                </CommonPopOver>
            </div>
            <CommonStackedColumnChart stackedColumnChartData={sharedJson.stackedColumnChartData} />
        </div>
    );
};

TopicsCompletedStackedColumnChart.propTypes = { schoolId: PropTypes.number, title: PropTypes.string.isRequired };
TopicsCompletedStackedColumnChart.defaultProps = { title: 'Total topics completed across classes' };

export default TopicsCompletedStackedColumnChart;
