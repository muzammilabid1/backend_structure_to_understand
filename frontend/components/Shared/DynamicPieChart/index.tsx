/* eslint-disable react/prop-types */
interface DataPoint {
    value: number;
    color: string;
}

interface DynamicPieChartProps {
    data: DataPoint[];
    size?: number;
}

const DynamicPieChart: React.FC<DynamicPieChartProps> = ({ data = [], size = 100 }) => {
    // Calculate the total value of the data
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Keep track of the cumulative value to calculate start and end angles
    let cumulativeValue = 0;
    const convertSize = size / 2;

    // Define the center and radius of the pie chart
    const cx = convertSize;
    const cy = convertSize;
    const radius = convertSize;

    // Function to convert polar coordinates to cartesian coordinates
    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians)
        };
    };

    // Function to describe an arc path for a slice
    const describeArc = (x, y, radius, startAngle, endAngle) => {
        // Check if the arc is a full circle
        if (Math.abs(endAngle - startAngle) >= 360) {
            return ['M', x, y - radius, 'A', radius, radius, 0, 1, 1, x, y + radius, 'A', radius, radius, 0, 1, 1, x, y - radius, 'Z'].join(
                ' '
            );
        }

        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);

        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

        const d = ['M', x, y, 'L', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');

        return d;
    };

    // Generate SVG paths for each data point
    const slices = data.map((item, index) => {
        const value = item.value;

        const startAngle = (cumulativeValue / total) * 360;
        const endAngle = ((cumulativeValue + value) / total) * 360;

        const pathData = describeArc(cx, cy, radius, startAngle, endAngle);

        cumulativeValue += value;

        // Use the label as the fill color
        const fillColor = item.color;

        return <path key={index} d={pathData} fill={fillColor} />;
    });

    return (
        <svg width={2 * radius} height={2 * radius} viewBox={`0 0 ${2 * radius} ${2 * radius}`}>
            {slices}
        </svg>
    );
};

export default DynamicPieChart;
