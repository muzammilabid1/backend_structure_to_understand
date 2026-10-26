import Tooltip from '@mui/material/Tooltip';
import withStyles from '@mui/styles/withStyles';
import PropTypes from 'prop-types';
import React from 'react';

const HtmlTooltipLocal = withStyles((theme) => ({
    tooltip: {
        backgroundColor: '#f5f5f9',
        color: 'rgba(0, 0, 0, 0.87)',
        maxWidth: 220,
        fontSize: theme.typography.pxToRem(12),
        border: '1px solid #dadde9'
    }
}))(Tooltip);

const HtmlTooltip = ({ title, children }) => {
    return <HtmlTooltipLocal title={title}>{children}</HtmlTooltipLocal>;
};

HtmlTooltip.propTypes = {
    children: PropTypes.element,
    title: PropTypes.string
};

export default HtmlTooltip;
