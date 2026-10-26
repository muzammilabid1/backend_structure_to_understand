import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Chip,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React from 'react';

import LWPButton from '../../../Shared/Button/LWPButton';
import Heading1 from '../../../Shared/Typography/Heading1';
import Paragraph from '../../../Shared/Typography/Paragraph';

const HiddenClasses = ({ hiddenClasses }) => {
    const router = useRouter();

    const headings = ['Class name', 'Year group', 'Academic year', 'Status', ''];

    return (
        <div className="hidden-classes-container">
            <Accordion disableGutters className="hidden-classes-main-accordion">
                <AccordionSummary className="school-overview-classDetail-accordion-header" expandIcon={<ExpandMoreIcon />}>
                    <Heading1>Hidden classes</Heading1>
                    <Chip label={hiddenClasses?.length} size="small" />
                </AccordionSummary>
                {hiddenClasses?.length > 0 && (
                    <AccordionDetails className="secondary-accordion-details">
                        <TableContainer component={Paper}>
                            <Table aria-label="collapsible table">
                                <TableHead className="overview_header">
                                    <TableRow>
                                        {headings.map((item) => (
                                            <TableCell>{item}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {hiddenClasses.map((item) => (
                                        <TableRow className="not-active-class-table">
                                            <TableCell>
                                                <Paragraph
                                                    customClass="cp"
                                                    isTruncate
                                                    onClick={() => router?.push(`/class/${item.id}/activity-grid`)}
                                                    text={item.schoolClassName}
                                                    dataTest="hidden-class-name"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Paragraph>{item.yearGroup?.year}</Paragraph>
                                            </TableCell>
                                            <TableCell>
                                                <Paragraph>{item?.period?.shortName ?? ''}</Paragraph>
                                            </TableCell>
                                            <TableCell>
                                                <div className="not-active-class-progress-bar">
                                                    <Paragraph>Inactive</Paragraph>
                                                </div>
                                            </TableCell>
                                            <TableCell align="right">
                                                <LWPButton
                                                    btnText="Open"
                                                    color="primary"
                                                    onClick={() => router?.push(`/class/${item?.id}/activity-grid`)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </AccordionDetails>
                )}
            </Accordion>
        </div>
    );
};

HiddenClasses.propTypes = {
    hiddenClasses: PropTypes.array
};

export default HiddenClasses;
