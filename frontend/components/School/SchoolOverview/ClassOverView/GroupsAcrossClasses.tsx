/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/prop-types */
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Chip,
    Collapse,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip
} from '@mui/material';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import { getProgressBarStats } from '../../../../lib/statuses/pupilStatus';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { isSameOrAfter14Days, renderClassIcon } from '../../../../shared/Services/handler';
import CommonDot from '../../../Shared/CommonDot';
import CommonList from '../../../Shared/CommonList';
import CommonListWithIcon from '../../../Shared/CommonListWithIcon';
import CommonPopOver from '../../../Shared/CommonPopOver';
import CommonProgressBar from '../../../Shared/CommonProgressBar';
import CommonStatus from '../../../Shared/CommonStatus';
import Heading1 from '../../../Shared/Typography/Heading1';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import RowCollapse from './RegistrationClasses/RowCollapse';

const GroupsAcrossClasses = ({ _classes, schoolId, schoolClasses, title, dataTest }) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const headings = ['Class name', 'Year group', 'Status'];
    const addNewsListItem = [
        {
            text: 'Add a group',
            icon: 'add',
            iconRight: true,
            bold: true,
            dataTest: 'class-overview-add-group-button',
            onClick: () => {
                router?.push(`/school/${schoolId}/add-group`);
            }
        }
    ];

    return (
        <div data-test={dataTest} className="hidden-classes-container school-overview-classes">
            <Accordion defaultExpanded={schoolClasses?.length > 0} disableGutters className="hidden-classes-main-accordion">
                <AccordionSummary
                    className="school-overview-classDetail-accordion-header"
                    expandIcon={<ExpandMoreIcon data-test="group-across-classes-accordion-expand-icon" />}>
                    <Heading1>{title}</Heading1>
                    <Chip label={schoolClasses?.length ?? 0} size="small" />
                </AccordionSummary>

                {schoolClasses?.length ? (
                    <div className="school-overview-add-class-button">
                        <CommonListWithIcon list={addNewsListItem} />
                    </div>
                ) : null}

                {!schoolClasses?.length ? (
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        imageAlt={''}
                        heading={'No groups'}
                        subHeading={'There are currently no groups'}
                        buttonText="Add a new group"
                        buttonDataTest="group-across-classes-add-button"
                        buttonStartIcon="add"
                        onClick={() => router?.push(`/school/${schoolId}/add-group`)}
                    />
                ) : (
                    <AccordionDetails>
                        <TableContainer component={Paper}>
                            <Table aria-label="collapsible table">
                                <TableHead className="overview_header">
                                    <TableRow>
                                        {headings.map((item) => (
                                            <TableCell>{item}</TableCell>
                                        ))}

                                        <TableCell className="cp" align="right">
                                            <Heading3 text={!open ? 'Expand all' : 'Collapse all'} onClick={() => setOpen(!open)} />
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {(schoolClasses || []).map((item, index) => (
                                        <Row key={item.id} item={item} expandAll={open} index={index} _classes={_classes} />
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

GroupsAcrossClasses.propTypes = {
    schoolId: PropTypes.string,
    schoolClasses: PropTypes.array,
    title: PropTypes.string,
    dataTest: PropTypes.string
};

export default GroupsAcrossClasses;

const Row = ({ item, expandAll, index, _classes }) => {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setOpen(expandAll);
    }, [expandAll]);

    const teacherLastAccess = item?.teachers?.length ? item?.teachers?.every((teacher) => isSameOrAfter14Days(teacher?.lastAccess)) : false;

    const pbStats = getProgressBarStats(item.statistics);

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset !important' } }}>
                <TableCell>
                    <Link href={`/class/${item.id}/readingweek`}>
                        <div className={`arrow_cursor class-overview-classname`}>
                            <div
                                className={`cp ${
                                    renderClassIcon(item).isGroupAcrossClasses
                                        ? 'school-overview-isGroupAcrossClasses-container'
                                        : renderClassIcon(item).isFullProgramOrOnlyReadyTeddy
                                          ? 'school-overview-isNotFullProgramme-container'
                                          : 'school-overview-isFullProgramme-container'
                                }`}>
                                <img src={renderClassIcon(item).classIcon} />
                            </div>
                            <Paragraph customClass="cp" dataTest={`group-across-classes-name`} isTruncate>
                                {item.schoolClassName}
                            </Paragraph>
                        </div>
                    </Link>
                </TableCell>
                <TableCell>{item.yearGroup?.year}</TableCell>
                <TableCell className="extra-width">
                    <CommonPopOver hover element={<CommonProgressBar statistics={pbStats.data} />}>
                        <CommonList
                            list={pbStats.presentation.map((presentedStatus) => {
                                return {
                                    text: presentedStatus.text,
                                    icon: <CommonDot color={presentedStatus.color} />
                                };
                            })}
                        />
                    </CommonPopOver>
                </TableCell>
                <TableCell align="right">
                    <div className={`icons-cell class-overview-table-action `}>
                        <div className={`${_classes.column}`} />
                        <Tooltip title={'Edit'}>
                            <span onClick={() => router?.push(`/class/${item.id}/class-details`)} className="material-icons">
                                create
                            </span>
                        </Tooltip>
                        <IconButton
                            aria-label="expand row"
                            data-test={`group-across-classes-expand-icon`}
                            size="small"
                            onClick={() => setOpen(!open)}>
                            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                    </div>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <RowCollapse teacherLastAccess={teacherLastAccess} item={item} index={index} />
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};
