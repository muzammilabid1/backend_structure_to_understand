import { Paper } from '@mui/material';
import Highcharts, { SeriesOptionsType } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import React from 'react';

interface LineGraphProps {
    series: Array<SeriesOptionsType>;
    title: string;
    categories: string[];
    hasStripedPattern?: boolean;
    graphName?: string;
    graphUniqueIdentifier?: string;
}

const LineGraph = ({ series, title, categories, hasStripedPattern, graphName, graphUniqueIdentifier }: LineGraphProps) => {
    const options: Highcharts.Options = {
        chart: {
            type: 'line',
            className: graphName,
            renderTo: graphUniqueIdentifier
        },
        title: {
            text: ''
        },
        xAxis: {
            categories,
            title: {
                text: title,
                style: {
                    fontWeight: 'bold',
                    fontSize: '14px'
                }
            },
            min: 0.4,
            max: categories?.length - 1
        },
        accessibility: {
            enabled: false
        },
        yAxis: {
            max: 100,
            min: 0,
            title: null,
            labels: {
                format: '{text}%'
            }
        },
        series,
        plotOptions: {
            line: {
                dataLabels: {
                    enabled: true
                },
                marker: {
                    enabled: true // Enable markers for clarity
                }
            }
        },
        tooltip: {
            pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y:.0f}%</b> of total<br/>'
        },
        caption: hasStripedPattern
            ? {
                  text: 'Striped lines indicate that this data is based on a small number of pupils (4 or fewer)',
                  style: {
                      fontSize: '12px',
                      color: '#666'
                  },
                  align: 'left',
                  verticalAlign: 'bottom'
              }
            : null
    };

    return (
        <Paper>
            <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ id: 'hello-world' }} />
        </Paper>
    );
};

export default LineGraph;
