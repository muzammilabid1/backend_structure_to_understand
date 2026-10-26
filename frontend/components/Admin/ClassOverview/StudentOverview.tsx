import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Button, Grid, Typography } from '@mui/material';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { deletePupil } from '../../../graphQl/mutations';
import {
    getClassPupilsForAdmin,
    getClassPupilsForTeacher,
    getSchoolClass,
    getSchoolClassWithImportedStudents
} from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { capitalizeFirstLetter, showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import AddChildModalForAdmin from '../../Shared/Modals/AddChildModalForAdmin';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import FindExistingPupil from '../../Shared/Modals/FindExistingPupil';
import LinkPupilsToSimsModal from '../../Shared/Modals/LinkPupilsToSimsModal';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import Snackbar from './../../Shared/Snackbar';
import Paragraph from './../../Shared/Typography/Paragraph';

interface StudentOverviewProps {
    class_id: string | string[];
    setClassName: (name: string) => void;
}

const StudentOverview = ({ class_id, setClassName }: StudentOverviewProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [openFilter, setOpenFilter] = useState(false);
    const [openDeletePupil, setOpenDeletePupil] = useState(false);
    const [pupilToBeDeletedId, setPupilToBeDeletedId] = useState(null);
    const [addChildModal, setAddChildModal] = useState(false);
    const [addPupilToClassModal, setAddPupilToClassModal] = useState(false);
    const [schoolMIS, setSchoolMIS] = useState(null);
    const [linkPupilsToSimsModal, setLinkPupilsToSimsModal] = useState(false);
    const [classPupils, setClassPupils] = useState([]);
    const queryParams = useParams();
    const router = useRouter();

    const [getClassPupilsQuery, { loading, error, data: allPupils }] = useLazyQuery(getClassPupilsForAdmin, {
        fetchPolicy: 'network-only'
    });

    const [deletePupilMutation, { loading: deletePupilLoading }] = useMutation(deletePupil, {
        refetchQueries: [{ query: getClassPupilsForAdmin, variables: { classId: class_id } }],
        awaitRefetchQueries: true
    });

    const { error: wStudentserror, data: schoolClass } = useQuery(getSchoolClassWithImportedStudents, { variables: { id: class_id } });

    const {
        loading: teacherLoading,
        error: teacherError,
        data: classPupilsForTeacher
    } = useQuery(getClassPupilsForTeacher, { variables: { classId: queryParams?.class_id } });

    const {
        loading: schoolClassLoading,
        error: schoolClassError,
        data: classData
    } = useQuery(getSchoolClass, {
        variables: { id: queryParams?.class_id }
    });

    const isDifferenceInSims = () =>
        schoolClass?.['schoolClass']?.school?.isWondeDataSyncedWithLwp !== true && schoolClass?.['schoolClass']?.importedSchoolClass?.id;

    useEffect(() => {
        setClassPupils(classPupilsForTeacher?.getClassPupils);
    }, [classPupilsForTeacher]);

    useEffect(() => {
        if (class_id) getClassPupilsQuery({ variables: { classId: class_id } });
    }, []);

    useEffect(() => {
        if (schoolClassError?.message) callSnackbar(schoolClassError, 'error');
    }, [schoolClassError]);

    useEffect(() => {
        if (error?.message) callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (wStudentserror?.message) callSnackbar(wStudentserror, 'error');
    }, [wStudentserror]);

    useEffect(() => {
        if (teacherError?.message) callSnackbar(teacherError, 'error');
    }, [teacherError]);

    useEffect(() => {
        if (schoolClass) {
            setClassName(schoolClass?.['schoolClass']?.name);
        }
    }, [allPupils]);

    const _onClick = (id) => {
        setOpenDeletePupil(true);
        setPupilToBeDeletedId(id);
    };

    const head = [
        {
            Header: 'Child name',
            accessor: '',
            Cell: (params) => (
                <Link passHref href={`${adminPath}/child/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor" text={params?.row?.original?.col1} />
                </Link>
            )
        },
        {
            Header: 'Status',
            accessor: 'col2'
        },
        {
            Header: 'Last Log in',
            accessor: 'col3',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col3, b.original?.col3)
        },
        {
            Header: 'Started School',
            accessor: 'col4'
        },
        {
            Header: 'Parent view',
            accessor: 'col5'
        },
        {
            Header: 'Teacher view',
            accessor: 'col6'
        },
        {
            Header: '',
            accessor: 'col7'
        }
    ];

    const row = (allPupils?.getClassPupilsForAdmin || []).map((pupil) => {
        return {
            id: pupil.id,
            col1: pupil?.fullname,
            col2: capitalizeFirstLetter(pupil?.pupilStatus),
            col3: pupil?.lastLogin,
            col4: pupil?.startedSchool ?? '-',
            col5: <CommonIconButton toolTipTitle="Parent view" onClick={() => router?.push(`/child/${pupil.id}`)} icon="visibility" />,
            col6: <CommonIconButton toolTipTitle="Teacher view" onClick={() => router?.push(`/pupil/${pupil.id}`)} icon="visibility" />,
            col7: <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onClick(pupil.id)} icon={'delete'} />
        };
    });

    if (loading || schoolClassLoading || teacherLoading) return <CommonLoading />;

    return (
        <div className="admin-student-overview">
            {isDifferenceInSims() && (
                <Snackbar
                    cookie="data_imported_snackbar"
                    className="  mt8"
                    icon="help_outline"
                    iconClassName={'help_snackbar_icon snackbar_icon'}>
                    <Paragraph text={`Data has been imported from ${schoolClass?.['schoolClass']?.school?.misName} for this class.`} />
                    <Paragraph
                        customClass="premium_link"
                        onClick={() => setLinkPupilsToSimsModal(!linkPupilsToSimsModal)}
                        text={`Link pupils to ${schoolClass?.['schoolClass']?.school?.misName}`}
                    />
                </Snackbar>
            )}
            <div className="pupil-filter-button">
                <Button className="filter-button" onClick={() => setOpenFilter(!openFilter)}>
                    Filter
                    <Typography>
                        <span style={{ color: 'black' }} className={`material-icons filter-icon`}>
                            {openFilter ? 'expand_less' : 'expand_more'}
                        </span>
                    </Typography>
                </Button>
            </div>

            <CommonDraggableTable rows={row} columns={head} />
            <Grid spacing={3} container>
                <Grid item>
                    <LWPButton
                        size={'large'}
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            setAddChildModal(!addChildModal);
                        }}
                        btnText={'Add a pupil manually'}
                    />
                </Grid>
                <Grid item>
                    <LWPButton
                        size={'large'}
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            setAddPupilToClassModal(!addPupilToClassModal);
                            setSchoolMIS(classData?.schoolClass?.school?.misName);
                        }}
                        btnText={'Find existing pupils'}
                    />
                </Grid>
            </Grid>

            {linkPupilsToSimsModal && (
                <LinkPupilsToSimsModal
                    subHeading={`${schoolClass?.['schoolClass']?.name}`}
                    toggle={() => setLinkPupilsToSimsModal(false)}
                    lwpPupils={allPupils?.getClassPupilsForAdmin}
                    importedStudents={schoolClass?.['schoolClass']?.importedSchoolClass?.students}
                    schoolMisIntegrationVariable={schoolClass?.['schoolClass']?.school?.misName}
                    classId={class_id}
                />
            )}
            {openDeletePupil && (
                <ConfirmationModal
                    open={openDeletePupil}
                    onCancel={() => setOpenDeletePupil(!openDeletePupil)}
                    loading={deletePupilLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deletePupilMutation({
                            variables: {
                                id: pupilToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeletePupil(!openDeletePupil);
                                setPupilToBeDeletedId(null);
                                callSnackbar('Pupil deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeletePupil(!openDeletePupil);
                                setPupilToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will permanently delete the pupil." />
                </ConfirmationModal>
            )}
            {addChildModal && <AddChildModalForAdmin open={addChildModal} setOpen={() => setAddChildModal(!addChildModal)} />}
            {addPupilToClassModal && (
                <FindExistingPupil
                    classPupils={classPupils}
                    class_name={classData?.schoolClass?.name}
                    classYear={classData?.schoolClass?.yearGroup?.year}
                    classId={queryParams?.class_id}
                    schoolId={classData?.schoolClass?.school?.id}
                    open={addPupilToClassModal}
                    setOpen={() => {
                        setAddPupilToClassModal(!addPupilToClassModal);
                        setSchoolMIS(null);
                    }}
                    schoolMIS={schoolMIS}
                    onAddPupilClick={() => setAddChildModal(true)}
                />
            )}
        </div>
    );
};

export default StudentOverview;
