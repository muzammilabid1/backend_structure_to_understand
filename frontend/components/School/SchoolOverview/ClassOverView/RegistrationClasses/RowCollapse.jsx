/* eslint-disable react/prop-types */
import { gql, useQuery } from '@apollo/client';
import { Alert, Box, Divider, TableCell, TableRow } from '@mui/material';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect, useState } from 'react';

import { showDate, showDateTooltip, ThemeContext } from '../../../../../shared/Services/handler';
import CommonLoading from '../../../../Shared/CommonLoading';
import CommonPopOver from '../../../../Shared/CommonPopOver';
import CommonTable from '../../../../Shared/CommonTable';
import SubjectTags from '../../../../Shared/SubjectTags';
import Heading1 from '../../../../Shared/Typography/Heading1';
import Heading3 from '../../../../Shared/Typography/Heading3';
import Paragraph from '../../../../Shared/Typography/Paragraph';

const getClassGroups = gql`
    query getClassGroups($classId: String!) {
        getClassGroups(classId: $classId) {
            id
            name
            IsReadingLogsEnabled
            subjects {
                name
            }
            currentTopic {
                releaseDate
                dueDate
                topic {
                    teacherTopicName
                }
            }
            upcomingTopic {
                releaseDate
                dueDate
                topic {
                    teacherTopicName
                }
            }
        }
    }
`;

const RowCollapse = ({ teacherLastAccess, item, index }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const [isAccordionAlert, setIsAccordionAlert] = useState(true);

    const {
        loading: classGroupsLoading,
        error: classGroupsError,
        data: classGroups
    } = useQuery(getClassGroups, {
        variables: { classId: item?.id }
    });

    useEffect(() => {
        classGroupsError?.message && callSnackbar(classGroupsError, 'error');
    }, [classGroupsError]);

    const head = ['Group name', 'Group type', 'Current topics', 'Upcoming topic'];

    const getNameWithCalendar = (topic) => {
        if (!topic?.topic?.teacherTopicName) {
            return '-';
        }

        return (
            <div className="name_with_calendar">
                <Paragraph text={topic?.topic?.teacherTopicName} isTruncate />

                <CommonPopOver hover childrenClass="total-students-popover" element={<span className="material-icons">date_range</span>}>
                    {showDate({ date: topic?.releaseDate, short: true })}{' '}
                    {topic?.dueDate && `- ${showDate({ date: topic?.dueDate, short: true })}`}
                </CommonPopOver>
            </div>
        );
    };

    return (
        <Box sx={{ margin: 1 }}>
            <div className="school-overview-classDetail-top-section">
                <Heading1
                    dataTest={
                        item?.isPreAdmissionClass ? `active-ready-teddy-class-name-heading` : `active-registration-class-name-heading`
                    }
                    text={item?.name}
                />
                <Paragraph>
                    {item?.isFullProgramme ? 'Full programme class' : 'Reading only class'} - Class size: {item.classSize} students
                </Paragraph>
                <Divider />
            </div>
            <div className={`school-overview-classDetail-bottom-section ${classGroups?.getClassGroups?.length === 0 && 'mb6'}`}>
                <div className="classDetail-bottom-left">
                    <div className="classDetail-bottom-top">
                        <Heading3 text={'Main class teacher'} />
                        <Paragraph
                            text={
                                item?.mainTeacher?.firstname && item?.mainTeacher?.lastname
                                    ? `${item.mainTeacher?.firstname} ${item.mainTeacher?.lastname}`
                                    : '-'
                            }
                        />
                    </div>
                    <div>
                        <Heading3 text={'Current topic'} />
                        {getNameWithCalendar(item?.currentTopic)}
                    </div>
                </div>

                <div className="classDetail-bottom-right">
                    <div className="classDetail-bottom-top">
                        <Heading3 text={'Last teacher access'} />
                        <Paragraph text={item?.mainTeacher?.lastAccess ? showDateTooltip(item.mainTeacher.lastAccess) : '-'} />
                    </div>
                    <div>
                        <Heading3 text={'Upcoming topic'} />
                        {getNameWithCalendar(item?.upcomingTopic)}
                    </div>
                </div>
            </div>

            <div className="row_collapse_table">
                {classGroups?.getClassGroups?.length > 0 && <Heading3 text={'Class groups'} />}
                {classGroupsLoading ? (
                    <CommonLoading />
                ) : classGroups?.getClassGroups?.length > 0 ? (
                    <CommonTable head={head}>
                        {classGroups?.getClassGroups?.map((row) => {
                            return (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <Paragraph
                                            customClass="cp underline"
                                            onClick={() => router?.push(`/class/${row.id}/readingweek`)}
                                            text={row?.name}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <SubjectTags type={row?.subjects} isReadingClass={row?.IsReadingLogsEnabled} />
                                    </TableCell>
                                    <TableCell>{getNameWithCalendar(row?.currentTopic)}</TableCell>
                                    <TableCell>{getNameWithCalendar(row?.upcomingTopic)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </CommonTable>
                ) : null}
            </div>

            {isAccordionAlert && teacherLastAccess && (
                <div className="school-overview-classDetail-bottom-section-alert">
                    <Alert onClose={() => setIsAccordionAlert(false)} severity="error">
                        The teacher for this class hasn’t logged in for over 14 days.
                    </Alert>
                </div>
            )}
        </Box>
    );
};

export default RowCollapse;
