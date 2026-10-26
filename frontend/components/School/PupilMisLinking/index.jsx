import { useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { getAllYearGroups, getImportedSchoolPupils, getSchoolForMisLinking, getSchoolPupilsWithoutMIS } from '../../../graphQl/queries';
import { getPupilYearGroup, ThemeContext } from '../../../shared/Services/handler';
import CommonLocalSortableDatatable from '../../Shared/CommonLocalSortableDatatable';
import RemoveMultiplePupilsFromThisSchoolModal from '../../Shared/Modals/RemoveMultiplePupilsFromThisSchoolModal';
import RemoveFromThisSchoolModal from '../PupilNotAssginedToAClass/removeFromThisSchoolModal';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonLoading from './../../Shared/CommonLoading';
import LinkSchoolPupilsToSimsModal from './../../Shared/Modals/LinkSchoolPupilsToSimsModal';
import Heading1 from './../../Shared/Typography/Heading1';
import Paragraph from './../../Shared/Typography/Paragraph';

const PupilMisLinking = () => {
    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);
    const [pupilToRemove, setPupilToRemove] = useState({});
    const [pupilToLink, setPupilToLink] = useState({});
    const [pupils, setPupils] = useState([]);

    const [openModal, setOpenModal] = useState({
        pupilToRemoveModal: false,
        pupilToLinkModal: false,
        pupilsModal: false
    });

    const { error: schoolError, data: schoolData } = useQuery(getSchoolForMisLinking, {
        variables: { id: queryParams?.school_id }
    });

    const { error: importedStudentsError, data: importedStudentsData } = useQuery(getImportedSchoolPupils, {
        variables: { id: queryParams?.school_id }
    });

    const {
        loading,
        error: error,
        data: pupilsWithoutMis
    } = useQuery(getSchoolPupilsWithoutMIS, { variables: { schoolId: queryParams?.school_id } });

    const { error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroups, { variables: { showHiddenYearGroup: true } });

    useEffect(() => {
        yearGroupError?.message && callSnackbar(yearGroupError, 'error');
    }, [yearGroupError]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        schoolError?.message && callSnackbar(schoolError, 'error');
    }, [schoolError]);

    useEffect(() => {
        importedStudentsError?.message && callSnackbar(importedStudentsError, 'error');
    }, [importedStudentsError]);

    const getPupilClassName = (pupil) => {
        if (pupil?.currentClass) {
            return `${pupil?.currentClass?.name} (${pupil?.currentClass?.yearGroup?.year})`;
        }

        if (!pupil?.classes?.length) {
            return '-';
        }

        if (pupil?.classes?.[0]?.period?.isPreviousPeriod) {
            return `${pupil?.classes?.[0]?.period?.shortName}: ${pupil?.classes?.[0]?.name} (${pupil?.classes?.[0]?.yearGroup?.year})`;
        }

        return `${pupil?.classes?.[0]?.name} (${pupil?.classes?.[0]?.yearGroup?.year})`;
    };

    const pupilToBeLinked = (pupil) => {
        setPupilToLink(pupil);
        setOpenModal({ pupilToLinkModal: true });
    };

    const pupilToBeRemoved = (pupil) => {
        setPupilToRemove(pupil);
        setOpenModal({ pupilToRemoveModal: true });
    };

    const allpupils = (pupilsWithoutMis?.['getSchoolPupilsWithoutMIS'] || []).map((pupil) => {
        return {
            ...pupil,
            id: pupil.id,
            pupilNameColumn: pupil?.fullname,
            yearGroupColumn: getPupilYearGroup(yearGroups?.allYearGroup, pupil?.yearGroup),
            classColumn: getPupilClassName(pupil)
        };
    });

    const head = [
        {
            field: 'pupilNameColumn',
            headerName: 'Pupil name',
            flex: 1
        },
        { field: 'yearGroupColumn', headerName: 'Year group', flex: 1 },
        { field: 'classColumn', headerName: 'Class', flex: 1.5 },
        {
            field: 'actionsColumn',
            headerName: 'Actions',
            flex: 1,
            renderCell: (params) => (
                <Grid display={'flex'} gap={1}>
                    <CommonIconButton onClick={() => pupilToBeLinked(params?.row)} icon="add_link" />
                    <CommonIconButton onClick={() => pupilToBeRemoved(params?.row)} icon="delete" />
                </Grid>
            )
        }
    ];

    if (loading) return <CommonLoading />;

    return (
        <div>
            <Heading1 text={`Pupils not linked to ${schoolData?.['getSchool']?.misName ?? '-'}`} centerText />
            <Paragraph
                customClass="mt8"
                text="You can also link pupils class by class - if you visit a class register page where any pupils are not linked, you will have the option just above the register to link them."
                centerText
            />

            <CommonLocalSortableDatatable
                rows={allpupils}
                columns={head}
                setSelectedItem={setPupils}
                selectedItem={pupils?.map((pupil) => pupil.id)}
                hideFooter
                disableColumnMenu
                disableRowSelectionOnClick
                footerButtons={[
                    {
                        text: `Remove pupil${pupils.length > 1 ? 's' : ''}`,
                        onClick: () => setOpenModal({ pupilsModal: true }),
                        icon: 'delete'
                    }
                ]}
            />

            {openModal?.pupilToLinkModal && (
                <LinkSchoolPupilsToSimsModal
                    subHeading={getPupilClassName(pupilToLink)}
                    toggle={() => setOpenModal(null)}
                    lwpPupils={[pupilToLink]}
                    importedStudents={importedStudentsData?.['getImportedSchoolPupils']}
                    schoolMisIntegrationVariable={schoolData?.['getSchool']?.misName ?? '-'}
                    schoolId={queryParams?.school_id}
                    isLinking={true}
                    setPupilToLink={() => setPupilToLink({})}
                />
            )}
            {openModal?.pupilToRemoveModal && (
                <RemoveFromThisSchoolModal
                    open={openModal?.pupilToRemoveModal}
                    setOpen={() => setOpenModal(null)}
                    schoolName={schoolData?.['getSchool']?.schoolName}
                    pupilName={pupilToRemove?.fullname}
                    pupilId={pupilToRemove?.id}
                    setPupilToRemove={() => setPupilToRemove({})}
                    schoolId={queryParams?.school_id}
                />
            )}

            {openModal?.pupilsModal && (
                <RemoveMultiplePupilsFromThisSchoolModal
                    schoolName={schoolData?.['getSchool']?.schoolName}
                    schoolId={queryParams?.school_id}
                    open={openModal?.pupilsModal}
                    setOpen={() => setOpenModal(null)}
                    setPupilToRemove={() => setPupils([])}
                    pupilIds={pupils?.map((pupil) => pupil.id)}
                />
            )}
        </div>
    );
};

export default PupilMisLinking;
