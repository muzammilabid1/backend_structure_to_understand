import { gql, useQuery } from '@apollo/client';
import { TableCell, TableRow } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useContext, useEffect } from 'react';

import ClassHeader from '../../../components/Class/ClassHeader';
import ShowClassPupil from '../../../components/Class/ShowClassPupil';
import CommonCard from '../../../components/Shared/Cards/CommonCard';
import CommonLoading from '../../../components/Shared/CommonLoading';
import CommonPopOver from '../../../components/Shared/CommonPopOver';
import CommonTable from '../../../components/Shared/CommonTable';
import SubjectTags from '../../../components/Shared/SubjectTags';
import Heading1 from '../../../components/Shared/Typography/Heading1';
import Paragraph from '../../../components/Shared/Typography/Paragraph';
import { getClassGroups } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const getClassDetail = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            schoolClassName
            academicYearInfo {
                shortName
                isInPreviousAcademicYear
            }
        }
    }
`;

const OnlyGroupsPages = () => {
    const { push, query } = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const classId = query?.class_id as string;

    const {
        loading: schoolClassLoading,
        error: schoolClassError,
        data: classDetail
    } = useQuery(getClassDetail, {
        variables: { id: classId },
        skip: !classId
    });

    const {
        loading: classGroupsLoading,
        error: classGroupsError,
        data: classGroups
    } = useQuery(getClassGroups, {
        variables: { classId: classId },
        skip: !classId
    });

    useEffect(() => {
        if (schoolClassError?.message) callSnackbar(schoolClassError, 'error');
        if (classGroupsError?.message) callSnackbar(classGroupsError, 'error');
    }, [schoolClassError, classGroupsError]);

    const head = ['Group name', 'Group type', 'Total students', 'Main teacher'];

    if (schoolClassLoading || classGroupsLoading) return <CommonLoading />;

    return (
        <div className="class-groups-container">
            <ClassHeader schoolClassData={classDetail?.schoolClass} />

            <CommonCard cardClassName="py_40 no-teacher ">
                <Heading1 text="Your groups in this class" centerText />
                <Paragraph centerText>
                    You have been added as a teacher for the groups listed below <br /> (but not for the class itself).
                </Paragraph>
            </CommonCard>

            <CommonTable head={head} bold={false}>
                {classGroups?.getClassGroups?.map((row) => {
                    return (
                        <TableRow key={row.id}>
                            <TableCell>
                                <Paragraph
                                    customClass="cp underline"
                                    onClick={() => push(`/class/${row.id}/readingweek`)}
                                    text={row?.name}
                                />
                            </TableCell>
                            <TableCell>
                                <SubjectTags type={row?.subjects} isReadingClass={row?.IsReadingLogsEnabled} />
                            </TableCell>
                            <TableCell>
                                <CommonPopOver text={row?.pupils?.length} childrenClass="total-students-popover" hover>
                                    <ShowClassPupil classId={row.id} />
                                </CommonPopOver>
                            </TableCell>
                            <TableCell>
                                <Paragraph text={row?.mainTeacher?.nameForChildren} />
                            </TableCell>
                        </TableRow>
                    );
                })}
            </CommonTable>
        </div>
    );
};

OnlyGroupsPages.pageType = PageType.TEACHER;
OnlyGroupsPages.pageTitle = 'Class: Groups only';

export default OnlyGroupsPages;
