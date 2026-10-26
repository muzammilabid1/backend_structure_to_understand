import PropTypes from 'prop-types';
import React, { useState } from 'react';

import sharedJson from '../../../../shared/json/index.json';
import CommonBarChart from './../../../Shared/CommonBarChart';
import CommonCheckBox from './../../../Shared/CommonCheckBox';
import CommonPopOver from './../../../Shared/CommonPopOver';
import Paragraph from './../../../Shared/Typography/Paragraph';

// eslint-disable-next-line no-unused-vars
const ClassesSignupBarChart = ({ schoolId, title }) => {
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
                barChartData={option === 'By year group' ? sharedJson.signUpBarChartData : sharedJson.signUpBarChartData_2}
            />
        </div>
    );
};

ClassesSignupBarChart.propTypes = { schoolId: PropTypes.number, title: PropTypes.string.isRequired };
ClassesSignupBarChart.defaultProps = { title: 'Total signups across classes per year group compared with average' };

export default ClassesSignupBarChart;
