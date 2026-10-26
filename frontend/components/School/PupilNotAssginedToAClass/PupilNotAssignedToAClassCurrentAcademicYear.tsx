import { useMutation } from '@apollo/client';
import { Paper } from '@mui/material';
import React, { useContext, useState } from 'react';

import { removePupilsFromSchool } from '../../../graphQl/mutations';
import { getSchoolForDashboardWrapper, getSchoolForSchoolOverviewPage, getSchoolPupilsWithoutClasses } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { getPluralizedLabel, ThemeContext } from '../../../shared/Services/handler';
import { ILwpSchool } from '../../../types/ILwpSchoolClass';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonStatus from '../../Shared/CommonStatus';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonLocalSortableDatatable from './../../Shared/CommonLocalSortableDatatable';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Paragraph from './../../Shared/Typography/Paragraph';
import AddPupilsInClass from './AddPupilsInClass';

const initialState = {
    pupilIds: [],
    isActionWithSinglePupil: false
};

interface PupilNotAssignedToAClassCurrentAcademicYearProps {
    schoolDetails: ILwpSchool;
    pupils: {
        id: string;
        pupilNameColumn: string;
        prevClassColumn: string;
        yearGroupColumn: string;
    }[];
}

const PupilNotAssignedToAClassCurrentAcademicYear = ({ schoolDetails, pupils }: PupilNotAssignedToAClassCurrentAcademicYearProps) => {
    const [selectedPupils, setSelectedPupils] = useState(initialState);

    const { callSnackbar } = useContext(ThemeContext);
    const [visibleAddPupilToClassModal, setVisibleAddPupilToClassModal] = useState(false);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState(false);
    const [confirmedToDelete, setConfirmedToDelete] = useState(false);

    const [removePupilsFromSchoolMutation, { loading: deleteStaticLoading }] = useMutation(removePupilsFromSchool);

    const setSelectedItem = (ids) => {
        setSelectedPupils({
            isActionWithSinglePupil: false,
            pupilIds: ids.map((pupil) => pupil.id)
        });
    };

    const head = [
        {
            field: 'pupilNameColumn',
            headerName: 'Pupil name',
            flex: 2
        },
        {
            field: 'yearGroupColumn',
            headerName: `Year group`,
            flex: 1
        },
        {
            field: 'prevClassColumn',
            headerName: 'Previous class',
            flex: 1.5
        },
        {
            field: 'col4',
            flex: 1,
            headerName: 'Actions',
            renderCell: (params) => (
                <div className="acton_icon">
                    <CommonIconButton
                        onClick={() => {
                            setSelectedPupils({
                                isActionWithSinglePupil: true,
                                pupilIds: [params.row.id]
                            });
                            setVisibleAddPupilToClassModal(true);
                        }}
                        icon="add"
                    />

                    <CommonIconButton
                        onClick={() => {
                            setSelectedPupils({
                                isActionWithSinglePupil: true,
                                pupilIds: [params.row.id]
                            });
                            setOpenDeleteItemConfirmationModal(true);
                        }}
                        icon={'delete'}
                    />
                </div>
            )
        }
    ];

    const renderPupilName = () => {
        return pupils?.find((pupil) => pupil.id === selectedPupils?.pupilIds?.[0])?.pupilNameColumn;
    };

    const handleRemovePupilsFromSchool = async () => {
        try {
            await removePupilsFromSchoolMutation({
                variables: { pupilIds: selectedPupils.pupilIds },
                refetchQueries: [
                    {
                        query: getSchoolPupilsWithoutClasses,
                        variables: {
                            schoolId: schoolDetails?.id,
                            isPreRegistrationPupils: false
                        }
                    },
                    {
                        query: getSchoolForSchoolOverviewPage,
                        variables: {
                            id: schoolDetails?.id
                        }
                    },
                    {
                        query: getSchoolForDashboardWrapper,
                        variables: {
                            id: schoolDetails?.id
                        }
                    }
                ],
                awaitRefetchQueries: true
            });
            const successMessage = selectedPupils?.pupilIds?.length > 1 ? 'Selected pupils have' : `${renderPupilName()} has`;

            callSnackbar(`${successMessage} been removed from the ${schoolDetails?.schoolName}`, 'success');
            setOpenDeleteItemConfirmationModal(false);
            setSelectedPupils(initialState);
            setConfirmedToDelete(false);
        } catch (error) {
            callSnackbar(error, 'error');
            setOpenDeleteItemConfirmationModal(false);
        }
    };

    return (
        <div>
            {pupils?.length > 0 ? (
                <Paper className="mt8">
                    <CommonLocalSortableDatatable
                        rows={pupils}
                        columns={head}
                        setSelectedItem={setSelectedItem}
                        selectedItem={selectedPupils.isActionWithSinglePupil ? [] : selectedPupils.pupilIds}
                        hideFooter
                        disableColumnMenu
                        disableRowSelectionOnClick
                        footerButtons={[
                            {
                                onClick: () => setVisibleAddPupilToClassModal(true),
                                text: `Add ${getPluralizedLabel(selectedPupils.pupilIds.length, 'pupil', 's')} to class`,
                                icon: 'add'
                            },
                            {
                                onClick: () => setOpenDeleteItemConfirmationModal(true),
                                text: `Remove ${getPluralizedLabel(selectedPupils.pupilIds.length, 'pupil', 's')}`,
                                icon: 'delete'
                            }
                        ]}
                    />
                </Paper>
            ) : (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    heading={'No pupils found'}
                    className="mt20"
                />
            )}

            {visibleAddPupilToClassModal && (
                <AddPupilsInClass
                    open={visibleAddPupilToClassModal}
                    schoolId={schoolDetails?.id}
                    handleClose={() => {
                        setVisibleAddPupilToClassModal(false);
                        setSelectedPupils(initialState);
                    }}
                    isPreRegistrationClass={false}
                    selectedPupils={selectedPupils.pupilIds}
                />
            )}
            {openDeleteItemConfirmationModal && (
                <ConfirmationModal
                    open={openDeleteItemConfirmationModal}
                    onCancel={() => setOpenDeleteItemConfirmationModal(false)}
                    heading={`Remove from this school?`}
                    loading={deleteStaticLoading}
                    primaryBtnDisabled={!confirmedToDelete}
                    btnText={`Remove ${getPluralizedLabel(selectedPupils.pupilIds.length, 'pupil', 's')}`}
                    onConfirm={handleRemovePupilsFromSchool}>
                    <Paragraph>
                        Once you remove {selectedPupils?.pupilIds?.length > 1 ? 'the ' : ''}
                        <b>{selectedPupils?.pupilIds?.length > 1 ? 'selected pupils' : renderPupilName()}</b>, you will no longer be able to
                        access their activity history or send them topics. This action cannot be undone, so please make sure you’re removing
                        the right {getPluralizedLabel(selectedPupils.pupilIds.length, 'pupil', 's')}.
                    </Paragraph>
                    <CommonCheckBox
                        checked={confirmedToDelete}
                        onChange={(e) => setConfirmedToDelete(e?.target?.checked)}
                        label={`I confirm that I want to remove ${selectedPupils?.pupilIds?.length > 1 ? 'the selected pupils' : renderPupilName()} from ${schoolDetails?.schoolName}.
`}
                    />
                </ConfirmationModal>
            )}
        </div>
    );
};

export default PupilNotAssignedToAClassCurrentAcademicYear;
