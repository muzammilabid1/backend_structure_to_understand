import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import React from 'react';

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%'
    },
    heading: {
        fontSize: theme.typography.pxToRem(15)
    },
    details: {
        alignItems: 'center'
    },
    column: {
        flexBasis: '33.33%'
    },
    expandAll: {
        textAlign: 'end'
    }
}));

function CommonAccordion({ headings = [], children, className, expanded, summaryClass, bold = false }) {
    const classes = useStyles();

    return (
        <div className={`common_accordion ${classes.root} ${className}`}>
            <Paper>
                <Accordion defaultExpanded expanded={expanded}>
                    <AccordionSummary aria-controls="panel1c-content" id="panel1c-header">
                        {headings.map((heading) => (
                            <div key={heading} className={`${classes.column} ${summaryClass}`}>
                                <Typography className={`${classes.heading}`}>{bold ? <b>{heading}</b> : heading}</Typography>
                            </div>
                        ))}
                    </AccordionSummary>
                    <Divider />
                    <AccordionDetails className={classes.details}>{children}</AccordionDetails>
                </Accordion>
            </Paper>
        </div>
    );
}

CommonAccordion.propTypes = {
    headings: PropTypes.array,
    children: PropTypes.element,
    className: PropTypes.string,
    expanded: PropTypes.bool,
    summaryClass: PropTypes.bool,
    bold: PropTypes.bool
};

export default CommonAccordion;
