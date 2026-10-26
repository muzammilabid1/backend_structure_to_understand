import { Paper } from '@mui/material';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import sharedJson from '../../../shared/json/index.json';
import CommonSelectField from '../CommonSelectField';

// eslint-disable-next-line no-unused-vars
const CommonStackedColumnChart = ({ schoolId, stackedColumnChartData }) => {
    const [input, setInput] = useState(1);
    const options = {
        chart: {
            type: 'column'
        },

        title: {
            text: ''
        },

        xAxis: {
            categories: ['Test class 1', 'Test class 2', 'Test class 3', 'Test class 4', 'Test class 5', 'Test class 6', 'Test class 7']
        },

        yAxis: {
            allowDecimals: false,
            min: 0,
            title: {
                text: ''
            }
        },

        tooltip: {
            formatter: function () {
                return '<b>' + this?.x + '</b><br/>' + this?.series?.name + ': ' + this?.y + '<br/>' + 'Total: ' + this?.point?.stackTotal;
            }
        },

        plotOptions: {
            column: {
                stacking: 'normal'
            }
        },

        series: stackedColumnChartData
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

CommonStackedColumnChart.propTypes = { schoolId: PropTypes.number, stackedColumnChartData: PropTypes.array.isRequired };

export default CommonStackedColumnChart;
