/* eslint-disable no-extra-boolean-cast */

import { useQuery } from '@apollo/client';
import { TableCell, TableRow } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useContext, useEffect } from 'react';

import ClassHeader from '../../../components/Class/ClassHeader';
import ShowClassPupil from '../../../components/Class/ShowClassPupil';
import LWPButton from '../../../components/Shared/Button/LWPButton';
import CommonCard from '../../../components/Shared/Cards/CommonCard';
import CommonListWithIcon from '../../../components/Shared/CommonListWithIcon';
import CommonLoading from '../../../components/Shared/CommonLoading';
import CommonNavTabs from '../../../components/Shared/CommonNavTabs';
import CommonPopOver from '../../../components/Shared/CommonPopOver';
import CommonStatus from '../../../components/Shared/CommonStatus';
import CommonTable from '../../../components/Shared/CommonTable';
import SubjectTags from '../../../components/Shared/SubjectTags';
import Paragraph from '../../../components/Shared/Typography/Paragraph';
import { getClassGroups, getSchoolClass } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const ClassGroupsPages = () => {
    const { push, query } = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const {
        loading: schoolClassLoading,
        error: schoolClassError,
        data: classData
    } = useQuery(getSchoolClass, {
        variables: { id: query?.class_id }
    });

    const {
        loading: classGroupsLoading,
        error: classGroupsError,
        data: classGroups
    } = useQuery(getClassGroups, {
        variables: { classId: query?.class_id },
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        if (schoolClassError?.message) callSnackbar(schoolClassError, 'error');
        if (classGroupsError?.message) callSnackbar(classGroupsError, 'error');
    }, [schoolClassError, classGroupsError]);

    const addNewsListItem = [
        {
            text: 'Create a class group ',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => push({ pathname: `/class/${query?.class_id}/create/classes-group` })
        }
    ];

    const head = ['Group name', 'Group type', 'Total students', 'Main teacher'];

    if (schoolClassLoading || classGroupsLoading) return <CommonLoading />;

    return (
        <div className="class-groups-container" data-test={'class-groups-page'}>
            <ClassHeader schoolClassData={classData?.schoolClass} />

            <CommonNavTabs
                isReading={classData?.schoolClass?.IsReadingLogsEnabled}
                isFullProgramme={classData?.schoolClass?.isFullProgramme}
                isRegistrationClass={classData?.schoolClass?.isRegistrationClass}
                subjects={classData?.schoolClass?.subjects}
                attentionRequiredPupilsCount={classData?.schoolClass?.attentionRequiredPupilsCount}
                schoolClass={classData?.schoolClass}
            />

            {!!classGroups?.getClassGroups?.length ? (
                <div className="btn_group">
                    <CommonListWithIcon list={addNewsListItem} />
                </div>
            ) : null}

            {!!classGroups?.getClassGroups?.length ? (
                <CommonTable head={head} bold={false}>
                    {classGroups?.getClassGroups?.map((row) => {
                        return (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Paragraph
                                        customClass="cp underline"
                                        onClick={() => push(`/class/${row.id}/readingweek`)}
                                        text={row?.name}
                                        dataTest="group-name"
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
            ) : (
                <CommonCard>
                    <div className="class-groups-empty">
                        <CommonStatus
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/lwp-mathscot-thinking.png`}
                            imageAlt={'Mathscot thinking'}
                            heading={'Not using groups in this class'}
                            subHeading={'You can choose a group of pupils in the class to:'}>
                            <ul>
                                <li>
                                    Set activities instead of, or as well as, the ones the whole class gets (if using the full programme)
                                </li>
                                <li>Have a focussed page to update their reading logs</li>
                                <li>See an overview of their engagement</li>
                            </ul>
                        </CommonStatus>

                        <div className="empty-btn">
                            <LWPButton
                                btnText={'Create a group'}
                                startIcon="add"
                                size="large"
                                onClick={() => push({ pathname: `/class/${query?.class_id}/create/classes-group` })}
                            />
                        </div>
                    </div>
                </CommonCard>
            )}
        </div>
    );
};

ClassGroupsPages.pageType = PageType.TEACHER;
ClassGroupsPages.pageTitle = 'Class: Groups';

export default ClassGroupsPages;
