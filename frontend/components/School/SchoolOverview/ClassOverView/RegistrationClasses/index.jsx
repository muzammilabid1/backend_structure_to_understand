/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/prop-types */
import { gql, useMutation, useQuery } from '@apollo/client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
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
import React, { useContext, useEffect, useState } from 'react';

import { isActiveStaticTrophyExist } from '../../../../../graphQl/queries';
import { getProgressBarStats } from '../../../../../lib/statuses/pupilStatus';
import { MINIO_PUBLIC_PATHS, SchoolClassStatus } from '../../../../../shared/Constant';
import { isReadyTeddyNonPreadmission, isSameOrAfter14Days, renderClassIcon, ThemeContext } from '../../../../../shared/Services/handler';
import LWPButton from '../../../../Shared/Button/LWPButton';
import CommonDot from '../../../../Shared/CommonDot';
import CommonList from '../../../../Shared/CommonList';
import CommonListWithIcon from '../../../../Shared/CommonListWithIcon';
import CommonPopOver from '../../../../Shared/CommonPopOver';
import CommonProgressBar from '../../../../Shared/CommonProgressBar';
import CommonStatus from '../../../../Shared/CommonStatus';
import Heading1 from '../../../../Shared/Typography/Heading1';
import Heading3 from '../../../../Shared/Typography/Heading3';
import Paragraph from '../../../../Shared/Typography/Paragraph';
import RowCollapse from './RowCollapse';

// Mutation
const hideSchoolClassForActivateClass = gql`
    mutation hideSchoolClass($schoolId: String!, $classId: String!) {
        hideSchoolClass(schoolId: $schoolId, classId: $classId)
    }
`;

const RegistrationClasses = ({
    schoolId,
    setSelectedClass,
    setSelectPupilModal,
    selectPupilModal,
    _classes,
    getSchoolClassesForClassOverView,
    schoolClasses,
    title,
    isVisibleAddClass,
    currentYearClasses = true,
    dataTest
}) => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const [open, setOpen] = useState(false);

    const { error: trophyExistError, data: activeTrophyExist } = useQuery(isActiveStaticTrophyExist);

    useEffect(() => {
        trophyExistError?.message && callSnackbar(trophyExistError, 'error');
    }, [trophyExistError]);

    const addNewsListItem = [
        {
            text: 'Add a class',
            icon: 'add',
            iconRight: true,
            bold: true,
            dataTest: 'class-overview-add-class-button',
            onClick: () => {
                currentYearClasses
                    ? router?.push(`/school/${schoolId}/add-class`)
                    : router?.push(`/school/${schoolId}/add-class?future-ready-teddy-class=true`);
            }
        }
    ];

    const filteredClasses = (() => {
        const combine = (schoolClasses || [])?.reduce(
            (result, item) => {
                if (item.status === SchoolClassStatus.ACTIVE) {
                    result.isActive.push(item);
                } else if ([SchoolClassStatus.IMPORTED, SchoolClassStatus.INACTIVE].includes(item.status)) {
                    result.unActive.push(item);
                }

                return result;
            },
            { isActive: [], unActive: [] }
        );

        return [...combine.isActive, ...combine.unActive];
    })();

    const onSelectPupilModal = (classData) => {
        setSelectedClass(classData);
        setSelectPupilModal(!selectPupilModal);
    };

    let headings = ['Class name', 'Year group', 'Status'];

    return (
        <div data-test={dataTest} className="hidden-classes-container school-overview-classes">
            <Accordion defaultExpanded={schoolClasses?.length > 0} disableGutters className="hidden-classes-main-accordion">
                <AccordionSummary
                    className="school-overview-classDetail-accordion-header"
                    expandIcon={<ExpandMoreIcon data-test="registration-classes-accordion-expand-icon" />}>
                    <Heading1>{title}</Heading1>
                    <Chip label={filteredClasses?.length ?? 0} size="small" />
                </AccordionSummary>

                {isVisibleAddClass && !(currentYearClasses === false && filteredClasses.length > 0) ? (
                    <div className="school-overview-add-class-button">
                        <CommonListWithIcon list={addNewsListItem} />
                    </div>
                ) : null}

                {!schoolClasses?.length ? (
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        imageAlt={''}
                        heading={'No classes found'}
                        subHeading={'Add a class to get started'}
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
                                    {(filteredClasses || []).map((item, index) => (
                                        <Row
                                            key={item.id}
                                            item={item}
                                            expandAll={open}
                                            _classes={_classes}
                                            activeTrophyExist={activeTrophyExist?.isActiveStaticTrophyExist}
                                            onSelectPupilModal={onSelectPupilModal}
                                            schoolId={schoolId}
                                            getSchoolClassesForClassOverView={getSchoolClassesForClassOverView}
                                            index={index}
                                        />
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

RegistrationClasses.propTypes = {
    schoolId: PropTypes.string,
    schoolClasses: PropTypes.array,
    title: PropTypes.string,
    dataTest: PropTypes.string
};

export default RegistrationClasses;

const Row = ({ item, expandAll, _classes, activeTrophyExist, onSelectPupilModal, schoolId, getSchoolClassesForClassOverView, index }) => {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [classId, setClassId] = useState(null);
    const [isAlert, setIsALert] = useState(isReadyTeddyNonPreadmission(item));

    const [hideSchoolClassMutation, { loading: updateClassLoading }] = useMutation(hideSchoolClassForActivateClass, {
        refetchQueries: [{ query: getSchoolClassesForClassOverView, variables: { schoolId } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        setOpen(expandAll);
    }, [expandAll]);

    const teacherLastAccess = item?.teachers?.length ? item?.teachers?.every((teacher) => isSameOrAfter14Days(teacher?.lastAccess)) : false;

    const pbStats = getProgressBarStats(item.statistics);

    return (
        <React.Fragment>
            {item?.status === SchoolClassStatus.ACTIVE ? (
                <>
                    {/* Identified by class rather than by name, so a test can reach one row without
                        matching on rendered text. */}
                    <TableRow data-test={`registration-class-row-${item?.id}`} sx={{ '& > *': { borderBottom: 'unset !important' } }}>
                        <TableCell>
                            <Link href={`/class/${item.id}/readingweek`}>
                                <div className={`arrow_cursor class-overview-classname`}>
                                    <div
                                        className={`cp ${
                                            renderClassIcon(item).isGroupAcrossClasses
                                                ? 'class-register-header-image-group-across-classes'
                                                : renderClassIcon(item).isFullProgramOrOnlyReadyTeddy
                                                  ? 'school-overview-isNotFullProgramme-container'
                                                  : 'school-overview-isFullProgramme-container'
                                        }`}>
                                        <img src={renderClassIcon(item).classIcon} />
                                    </div>
                                    <Paragraph
                                        customClass="cp"
                                        dataTest={
                                            item?.isPreAdmissionClass ? `active-ready-teddy-class-name` : `active-registration-class-name`
                                        }
                                        isTruncate>
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
                                {activeTrophyExist && item?.isRegistrationClass ? (
                                    <Tooltip title={'Certificates'}>
                                        <span
                                            onClick={() =>
                                                onSelectPupilModal({
                                                    name: item?.name,
                                                    mainTeacherId: item?.mainTeacher?.id,
                                                    mainTeacherNameForChildren: item?.mainTeacher?.nameForChildren,
                                                    mainTeacherFirstname: item?.mainTeacher?.firstname,
                                                    mainTeacherLastname: item?.mainTeacher?.lastname,
                                                    id: item?.id,
                                                    schoolId: item?.school?.id,
                                                    pupils: item?.pupils
                                                })
                                            }
                                            className="material-icons">
                                            article
                                        </span>
                                    </Tooltip>
                                ) : (
                                    <div className={`${_classes.column}`} />
                                )}
                                <Tooltip title={'Edit'}>
                                    <span onClick={() => router?.push(`/class/${item.id}/class-details`)} className="material-icons">
                                        create
                                    </span>
                                </Tooltip>
                                {/* On the row itself rather than inside the accordion, so a leader sees
                                    it without opening anything. Offered only to a class that does Money
                                    Skills and has a sequence waiting for its year group:
                                    canAutoScheduleMoneySkills is resolved for every class in one batch,
                                    so this costs nothing per row.

                                    Before the expand icon, not after it as the design has it, because
                                    only some rows carry this button: putting it last would move the
                                    chevron in and out of the right edge from row to row, and the chevron
                                    is the control a leader actually clicks repeatedly. */}
                                {item?.canAutoScheduleMoneySkills ? (
                                    <LWPButton
                                        btnText="Auto-schedule"
                                        customClass="class-overview-auto-schedule-button"
                                        dataTest={`class-auto-schedule-button-${item?.id}`}
                                        onClick={() => router?.push(`/class/${item?.id}/auto-schedule`)}
                                    />
                                ) : null}
                                <IconButton
                                    aria-label="expand row"
                                    data-test={
                                        item?.isPreAdmissionClass ? `active-ready-teddy-expand-icon` : `active-registration-expand-icon`
                                    }
                                    size="small"
                                    onClick={() => setOpen(!open)}>
                                    {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                </IconButton>
                            </div>
                        </TableCell>
                    </TableRow>
                    {isAlert ? (
                        <TableRow>
                            <TableCell style={{ paddingTop: 0, border: 'none', paddingBottom: open ? 0 : 22 }} colSpan={6}>
                                <Alert severity="info" onClose={() => setIsALert(false)} className="enable-other-programmes-alert">
                                    <Paragraph>
                                        You can now{' '}
                                        <Link href={`/class/${item?.id}/class-details`}>start the reading log and other programmes</Link> in
                                        this class.
                                    </Paragraph>
                                </Alert>
                            </TableCell>
                        </TableRow>
                    ) : null}
                    <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                            <Collapse in={open} timeout="auto" unmountOnExit>
                                <RowCollapse teacherLastAccess={teacherLastAccess} item={item} index={index} />
                            </Collapse>
                        </TableCell>
                    </TableRow>
                </>
            ) : (
                <TableRow sx={{ '& > *': { borderBottom: 'unset' } }} className="not-active-class-table">
                    <TableCell>
                        <Paragraph
                            customClass="cp"
                            isTruncate
                            onClick={() => router?.push(`/class/${item.id}/readingweek`)}
                            text={item.name}
                            dataTest={item?.isPreAdmissionClass ? `inactive-ready-teddy-class-name` : `inactive-registration-class-name`}
                        />
                    </TableCell>
                    <TableCell>{item.yearGroup?.year}</TableCell>
                    <TableCell>
                        <div className="not-active-class-progress-bar">
                            <Paragraph>Inactive</Paragraph>
                        </div>
                    </TableCell>
                    <TableCell align="right">
                        <div className={`not-active-class-button-container`}>
                            <LWPButton
                                btnText="Hide"
                                color="inherit"
                                customClass="button_hide"
                                loading={classId === item?.id ? updateClassLoading : false}
                                onClick={async () => {
                                    setClassId(item?.id);

                                    await hideSchoolClassMutation({
                                        variables: {
                                            schoolId: schoolId,
                                            classId: item?.id
                                        }
                                    });
                                }}
                            />
                            <LWPButton
                                btnText="Open"
                                dataTest={
                                    item?.isPreAdmissionClass ? `inactive-ready-teddy-open-button` : `inactive-registration-open-button`
                                }
                                onClick={() => router?.push(`/class/${item?.id}/readingweek`)}
                            />
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};
