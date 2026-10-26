import { Paper } from '@mui/material';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import sharedJson from '../../../shared/json/index.json';
import CommonSelectField from './../CommonSelectField';

// eslint-disable-next-line no-unused-vars
const CommonColumnChart = ({ schoolId, columnChartData }) => {
    const [input, setInput] = useState(1);
    const options = {
        chart: {
            type: 'column'
        },
        title: {
            text: ''
        },
        accessibility: {
            announceNewData: {
                enabled: true
            }
        },
        xAxis: {
            type: 'category'
        },
        yAxis: {
            max: 100,
            title: {
                text: ''
            }
        },
        legend: {
            enabled: true,
            color: '#F28D00'
        },
        tooltip: {
            pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y:.2f}%</b> of total<br/>'
        },

        series: [
            {
                name: 'Classes',
                color: '#F28D00',
                colorByPoint: false,
                data: columnChartData
            }
        ]
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

CommonColumnChart.propTypes = { schoolId: PropTypes.number, columnChartData: PropTypes.array.isRequired };

export default CommonColumnChart;
