import PropTypes from 'prop-types';
import React, { useState } from 'react';

import sharedJson from '../../../../shared/json/index.json';
import CommonBarChart from './../../../Shared/CommonBarChart';
import CommonCheckBox from './../../../Shared/CommonCheckBox';
import CommonPopOver from './../../../Shared/CommonPopOver';
import Paragraph from './../../../Shared/Typography/Paragraph';
// eslint-disable-next-line no-unused-vars
const TopicsCompletedBarChart = ({ schoolId, title }) => {
    const [option, setOption] = useState('By year group');
    const yearOptions = ['By year group', 'By pupil premium'];

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
            <CommonBarChart
                categories={option === 'By year group' ? sharedJson.barChartOptions : sharedJson.barChartOptions_2}
                barChartData={option === 'By year group' ? sharedJson.topicsBarChartData : sharedJson.topicsBarChartData_2}
            />
        </div>
    );
};

TopicsCompletedBarChart.propTypes = { schoolId: PropTypes.number, title: PropTypes.string.isRequired };
TopicsCompletedBarChart.defaultProps = { title: 'Total topics completed compared to national average' };

export default TopicsCompletedBarChart;
