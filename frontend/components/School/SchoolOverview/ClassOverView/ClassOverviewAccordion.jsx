import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import Paper from '@mui/material/Paper';
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

function ClassOverviewAccordion({ children, className }) {
    const classes = useStyles();

    return (
        <div className={`common_accordion school-overview-classes ${classes.root} ${className}`}>
            <Paper className="school-overview-classes-paper">
                <Accordion defaultExpanded>
                    <AccordionDetails className={classes.details}>{children}</AccordionDetails>
                </Accordion>
            </Paper>
        </div>
    );
}

ClassOverviewAccordion.propTypes = { headings: PropTypes.array, children: PropTypes.element, className: PropTypes.string };

export default ClassOverviewAccordion;
