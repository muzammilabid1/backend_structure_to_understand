import { Paper } from '@mui/material';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import PropTypes from 'prop-types';
import React from 'react';

import Paragraph from './../Typography/Paragraph';

const CommonPieChart = ({ graphData, title }) => {
    const options = {
        chart: {
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false,
            type: 'pie'
        },
        title: {
            text: ''
        },
        tooltip: {
            pointFormat: '<b>{point.percentage:.1f}%</b>'
        },
        accessibility: {
            point: {
                valueSuffix: '%'
            }
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false
                },
                showInLegend: true
            }
        },
        series: [
            {
                name: 'LWP',
                colorByPoint: true,
                data: graphData
            }
        ]
    };

    return (
        <div className="common-pie-chart">
            <Paragraph text={title} />
            <Paper>
                <HighchartsReact highcharts={Highcharts} options={options} />
            </Paper>
        </div>
    );
};

CommonPieChart.propTypes = { graphData: PropTypes.array.isRequired, title: PropTypes.string.isRequired };

export default CommonPieChart;
