import { Paper } from '@mui/material';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import sharedJson from '../../../shared/json/index.json';
import CommonSelectField from './../CommonSelectField';

// eslint-disable-next-line no-unused-vars
const CommonBarChart = ({ schoolId, barChartData, categories }) => {
    const [input, setInput] = useState(1);
    const options = {
        chart: {
            type: 'bar'
        },
        title: {
            text: ''
        },
        subtitle: {
            text: ''
        },
        xAxis: {
            categories: categories,
            title: {
                text: null
            }
        },
        yAxis: {
            max: 100,
            title: {
                text: '',
                align: 'high'
            },
            labels: {
                overflow: 'justify'
            }
        },
        tooltip: {
            valueSuffix: '%'
        },
        credits: {
            enabled: false
        },
        series: barChartData
    };

    return (
        <div className="common-column-chart">
            <Paper className="common-column-chart-paper">
                <HighchartsReact highcharts={Highcharts} options={options} />
                <div className="chart-input-select">
                    <CommonSelectField
                        displayEmpty
                        value={input}
                        options={sharedJson.chartsOptions}
                        onChange={(e) => setInput(e.target.value)}
                    />
                </div>
            </Paper>
        </div>
    );
};

CommonBarChart.propTypes = { schoolId: PropTypes.number, barChartData: PropTypes.array.isRequired, categories: PropTypes.array.isRequired };

export default CommonBarChart;
