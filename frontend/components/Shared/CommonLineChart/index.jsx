import { Paper } from '@mui/material';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import sharedJson from '../../../shared/json/index.json';
import CommonSelectField from './../CommonSelectField';

// eslint-disable-next-line no-unused-vars
const CommonLineChart = ({ schoolId, lineChartData }) => {
    const [input, setInput] = useState(1);
    const options = {
        title: {
            text: ''
        },

        subtitle: {
            text: ''
        },

        yAxis: {
            max: 100,
            title: {
                text: ''
            }
        },

        xAxis: {
            categories: [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December'
            ]
        },

        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle'
        },

        plotOptions: {
            series: {
                label: {
                    connectorAllowed: false
                },
                pointStart: 0
            }
        },

        series: lineChartData,

        responsive: {
            rules: [
                {
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        legend: {
                            layout: 'horizontal',
                            align: 'center',
                            verticalAlign: 'bottom'
                        }
                    }
                }
            ]
        }
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

CommonLineChart.propTypes = { schoolId: PropTypes.number, lineChartData: PropTypes.array.isRequired };

export default CommonLineChart;
