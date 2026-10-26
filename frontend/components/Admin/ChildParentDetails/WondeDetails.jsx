import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import React from 'react';

import CommonAccordion from '../../Shared/CommonAccordion';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import Divider from '../../Shared/Divider';
import Heading2 from '../../Shared/Typography/Heading2';

const useStyles = makeStyles({
    column: {
        flexBasis: '33.33%'
    },
    iconColor: {
        color: '#E8492A'
    },
    summaryParent: {
        display: 'flex',
        width: '100%'
    },
    unlinked: {
        cursor: 'default'
    },
    accordionDetail: {
        marginRight: 0,
        marginLeft: 0
    }
});

// const useStyles = makeStyles(() => ({
//     column: {
//         flexBasis: '33.33%'
//     },
//     doneIconColor: {
//         color: '#65B32E'
//     },
//     removeIconColor: {
//         color: '#00303C'
//     },
//     margin: {
//         marginRight: '11px'
//     }
// }));

const WondeDetails = ({ wondeInfo }) => {
    const classes = useStyles();

    const accordionHead = ['id', 'full name', 'email'];

    const heading = ['id', 'relationship', 'priority', 'email notification', 'court order'];

    const head = heading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Created at') {
            rowHead.width = '400';
        }

        return rowHead;
    });

    return (
        <div className="parent_visibility">
            <Divider customClass="mtb-20" />
            <Heading2 text="Import Details" />
            <br />
            <CommonAccordion headings={accordionHead} expanded>
                {wondeInfo.map((wondeParent) => {
                    const row = ((!!wondeParent?.importedStudentContacts?.length && wondeParent?.importedStudentContacts) || []).map(
                        (importedStudent) => {
                            return {
                                id: importedStudent?.id,
                                col1: importedStudent.id,
                                col2: importedStudent.relationship,
                                col3: importedStudent?.priority,
                                col4: importedStudent?.email_notification ? 'true' : 'false',
                                col5: importedStudent?.court_order ? 'true' : 'false'
                            };
                        }
                    );

                    return (
                        <Accordion key={wondeParent?.id}>
                            <AccordionSummary style={{ padding: 0 }} expandIcon={<ExpandMore className="expand-icon" />}>
                                <div className={classes.summaryParent} onClick={(event) => event.stopPropagation()}>
                                    <div className={classes.column}>{wondeParent?.id}</div>
                                    <div
                                        className={
                                            classes.column
                                        }>{`${wondeParent?.title} ${wondeParent?.forename} ${wondeParent?.surname}`}</div>
                                    <div className={classes.column}>{wondeParent?.email}</div>
                                </div>
                            </AccordionSummary>

                            <AccordionDetails className={`secondary-accordion-details ${classes.accordionDetail}`}>
                                <CommonDraggableTable rows={row} columns={head} customClass="row-height" />
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </CommonAccordion>
        </div>
    );
};

WondeDetails.propTypes = { wondeInfo: PropTypes.object };

export default WondeDetails;
