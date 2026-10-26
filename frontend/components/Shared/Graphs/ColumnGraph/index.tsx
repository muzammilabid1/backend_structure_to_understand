import { Paper } from '@mui/material';
import Highcharts, { SeriesOptionsType } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import React, { useState } from 'react';

interface ColumnGraphProps {
    yAxisTitle?: string;
    series: Array<SeriesOptionsType>;
    colorForAll: string;
    title?: string;
    categories: string[];
    yAxisMax?: number;
    percentageOnYAxis?: boolean;
    hasStripedPattern?: boolean;
    isLegendEnabled?: boolean;
    graphName?: string;
    showXAxisBarLabels?: boolean;
    graphUniqueIdentifier?: string;
}

const ColumnGraph = ({
    yAxisTitle,
    series,
    colorForAll,
    title,
    categories,
    percentageOnYAxis = true,
    hasStripedPattern,
    isLegendEnabled = true,
    graphName,
    showXAxisBarLabels = true,
    graphUniqueIdentifier
}: ColumnGraphProps) => {
    const [maxValue, setMaxValue] = useState<number | undefined>(undefined);

    const options: Highcharts.Options = {
        chart: {
            height: 450,
            type: 'column',
            className: graphName,
            renderTo: graphUniqueIdentifier,
            events: {
                render: function () {
                    const yAxis = this.yAxis[0]; // Access the first Y-axis

                    // Set the max value to 5 if the max value is 4 or less than and the graph is not a percentage graph
                    if (!percentageOnYAxis && yAxis.max <= 4) {
                        setMaxValue(5);
                    }

                    // Define the striped pattern if it doesn't exist
                    if (!this.renderer.defs) {
                        this.renderer.defs = this.renderer.createElement('defs').add();
                    }

                    const premiumStripedPattern = this.renderer
                        .createElement('pattern')
                        .attr({
                            id: 'premium-striped-pattern',
                            patternUnits: 'userSpaceOnUse',
                            width: 10,
                            height: 10
                        })
                        .add(this.renderer.defs);

                    this.renderer
                        .createElement('rect')
                        .attr({
                            x: 0,
                            y: 0,
                            width: 10,
                            height: 10,
                            fill: '#f28d00'
                        })
                        .add(premiumStripedPattern);

                    this.renderer
                        .createElement('path')
                        .attr({
                            d: 'M 0 10 L 10 0 M -1 1 L 1 -1 M 9 11 L 11 9',
                            stroke: '#ffffff',
                            'stroke-width': 3
                        })
                        .add(premiumStripedPattern);

                    const normalStripedPattern = this.renderer
                        .createElement('pattern')
                        .attr({
                            id: 'normal-striped-pattern',
                            patternUnits: 'userSpaceOnUse',
                            width: 10,
                            height: 10
                        })
                        .add(this.renderer.defs);

                    this.renderer
                        .createElement('rect')
                        .attr({
                            x: 0,
                            y: 0,
                            width: 10,
                            height: 10,
                            fill: colorForAll
                        })
                        .add(normalStripedPattern);

                    this.renderer
                        .createElement('path')
                        .attr({
                            d: 'M 0 10 L 10 0 M -1 1 L 1 -1 M 9 11 L 11 9',
                            stroke: '#ffffff',
                            'stroke-width': 3
                        })
                        .add(normalStripedPattern);
                }
            }
        },
        title: {
            text: ''
        },
        xAxis: {
            categories,
            labels: {
                enabled: showXAxisBarLabels
            },
            title: {
                text: title,
                style: {
                    fontWeight: 'bold',
                    fontSize: '14px'
                },
                y: 8
            }
        },
        accessibility: {
            enabled: false
        },
        plotOptions: {
            column: {
                minPointLength: 4 // Ensures a minimum height of 5px for bars when the value is 0
            }
        },
        yAxis: {
            max: percentageOnYAxis ? 100 : maxValue,
            title: {
                text: yAxisTitle
            },
            min: 0,
            labels: {
                format: `{text}${percentageOnYAxis ? '%' : ''}`
            }
        },
        series,
        caption: hasStripedPattern
            ? {
                  text: 'Striped bars indicate that this data is based on a small number of pupils (4 or fewer)',
                  style: {
                      fontSize: '12px',
                      color: '#666'
                  },
                  align: 'left',
                  verticalAlign: 'bottom'
              }
            : null,
        legend: {
            enabled: isLegendEnabled
        }
    };

    return (
        <Paper>
            <HighchartsReact highcharts={Highcharts} options={options} />
        </Paper>
    );
};

export default ColumnGraph;
