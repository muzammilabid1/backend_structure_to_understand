import PropTypes from 'prop-types';
import React, { useState } from 'react';

import sharedJson from '../../../../shared/json/index.json';
import CommonCheckBox from './../../../Shared/CommonCheckBox';
import CommonLineChart from './../../../Shared/CommonLineChart';
import CommonPopOver from './../../../Shared/CommonPopOver';
import Paragraph from './../../../Shared/Typography/Paragraph';

// eslint-disable-next-line no-unused-vars
const ClassesSignupLineChart = ({ schoolId, title }) => {
    const [option, setOption] = useState('By class');
    const yearOptions = ['By class', 'By year group'];

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
            <CommonLineChart lineChartData={sharedJson.lineChartData} />
        </div>
    );
};

ClassesSignupLineChart.propTypes = { schoolId: PropTypes.number, title: PropTypes.string.isRequired };
ClassesSignupLineChart.defaultProps = { title: 'Total signups across the year' };

export default ClassesSignupLineChart;
