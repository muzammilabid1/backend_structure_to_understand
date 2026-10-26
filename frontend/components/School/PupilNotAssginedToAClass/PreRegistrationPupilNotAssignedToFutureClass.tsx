import { gql, useMutation } from '@apollo/client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Chip } from '@mui/material';
import React, { useContext, useMemo, useState } from 'react';

import { getSchoolForSchoolOverviewPage, getSchoolPupilsWithoutClasses } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { getPluralizedLabel, ThemeContext } from '../../../shared/Services/handler';
import { ILwpSchool } from '../../../types/ILwpSchoolClass';
import CommonStatus from '../../Shared/CommonStatus';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonLocalSortableDatatable from './../../Shared/CommonLocalSortableDatatable';
import Heading1 from './../../Shared/Typography/Heading1';
import AddPupilsInClass from './AddPupilsInClass';

const markPreRegistrationPupilsAsIgnoredForFutureYear = gql`
    mutation markPreRegistrationPupilsAsIgnoredForFutureYear($pupilIds: [String!]!) {
        markPreRegistrationPupilsAsIgnoredForFutureYear(pupilIds: $pupilIds)
    }
`;

const initialState = {
    pupilIds: [],
    isActionWithSinglePupil: false,
    isAddPupilToClass: false
};

interface PreRegistrationPupilNotAssignedToFutureClassProps {
    schoolDetails: ILwpSchool;
    pupils: {
        id: string;
        pupilNameColumn: string;
        prevClassColumn: string;
        yearGroupColumn: string;
        isIgnoredForFutureYearClasses: boolean;
    }[];
}

const PreRegistrationPupilNotAssignedToFutureClass = ({ schoolDetails, pupils }: PreRegistrationPupilNotAssignedToFutureClassProps) => {
    const [selectedPupils, setSelectedPupils] = useState(initialState);

    const [ignoredSelectedPupils, setIgnoredSelectedPupils] = useState(initialState);

    const { callSnackbar } = useContext(ThemeContext);

    const [markPreRegistrationPupilsAsIgnoredForFutureYearMutation, { loading: isIgnoringPupilsLoading }] = useMutation(
        markPreRegistrationPupilsAsIgnoredForFutureYear
    );

    const { ignoredPupils, notIgnoredPupils } = useMemo(() => {
        const ignoredPupils = pupils?.filter((pupil) => pupil?.isIgnoredForFutureYearClasses);

        const notIgnoredPupils = pupils?.filter((pupil) => !pupil?.isIgnoredForFutureYearClasses);

        return { ignoredPupils, notIgnoredPupils, allPupils: pupils };
    }, [pupils]);

    const head = [
        {
            field: 'pupilNameColumn',
            headerName: 'Pupil name',
            flex: 2
        },
        {
            field: 'yearGroupColumn',
            headerName: `Year group for ${schoolDetails?.curentPeriod?.nextPeriod?.shortName ?? ''}`,
            flex: 2
        },
        {
            field: 'col4',
            flex: 1,
            headerName: 'Actions',
            renderCell: (params) => (
                <div className="acton_icon">
                    <CommonIconButton
                        onClick={() => {
                            if (params?.row?.isIgnoredForFutureYearClasses)
                                setIgnoredSelectedPupils({
                                    isActionWithSinglePupil: true,
                                    pupilIds: [params.row.id],
                                    isAddPupilToClass: true
                                });
                            else
                                setSelectedPupils({
                                    isActionWithSinglePupil: true,
                                    pupilIds: [params.row.id],
                                    isAddPupilToClass: true
                                });
                        }}
                        icon="add"
                        disabled={isIgnoringPupilsLoading}
                    />

                    {!params?.row?.isIgnoredForFutureYearClasses && (
                        <CommonIconButton
                            onClick={() => {
                                setSelectedPupils({
                                    ...selectedPupils,
                                    isActionWithSinglePupil: true,
                                    pupilIds: [params.row.id]
                                });
                                handleIgnorePupils([params.row.id]);
                            }}
                            icon={'close'}
                            disabled={isIgnoringPupilsLoading}
                        />
                    )}
                </div>
            )
        }
    ];

    const renderPupilName = (pupilId: string) => {
        return pupils.find((pupil) => pupil.id === pupilId)?.pupilNameColumn;
    };

    const handleIgnorePupils = async (pupilIds) => {
        try {
            await markPreRegistrationPupilsAsIgnoredForFutureYearMutation({
                variables: { pupilIds },
                refetchQueries: [
                    {
                        query: getSchoolPupilsWithoutClasses,
                        variables: {
                            schoolId: schoolDetails?.id,
                            isPreRegistrationPupils: true
                        }
                    },
                    {
                        query: getSchoolForSchoolOverviewPage,
                        variables: {
                            id: schoolDetails?.id
                        }
                    }
                ],
                awaitRefetchQueries: true
            });
            const successMessage =
                pupilIds?.length > 1 ? 'Selected pupils have been ignored' : `${renderPupilName(pupilIds[0])} has been ignored`;

            callSnackbar(successMessage, 'success');
            setSelectedPupils(initialState);
        } catch (error) {
            callSnackbar(error, 'error');
        }
    };

    if (pupils?.length === 0)
        return (
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                heading={'No pupils found'}
                className="my20"
            />
        );

    return (
        <div>
            <Accordion disableGutters defaultExpanded className="pupils-not-in-class-accordion">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="pupils-not-in-class-accordion-header">
                    <Heading1 text="Pupils not in a class" />
                    <Chip label={notIgnoredPupils?.length ?? 0} size="small" />{' '}
                </AccordionSummary>

                <AccordionDetails className="pupils-not-in-class-accordion-details">
                    {notIgnoredPupils?.length > 0 ? (
                        <CommonLocalSortableDatatable
                            rows={notIgnoredPupils}
                            dataTest="not-ignored-pupils"
                            columns={head}
                            setSelectedItem={(ids) => {
                                setSelectedPupils({
                                    ...selectedPupils,
                                    isActionWithSinglePupil: false,
                                    pupilIds: ids.map((pupil) => pupil.id)
                                });
                            }}
                            selectedItem={selectedPupils.isActionWithSinglePupil ? [] : selectedPupils.pupilIds}
                            hideFooter
                            disableColumnMenu
                            disableRowSelectionOnClick
                            footerButtons={[
                                {
                                    onClick: () => setSelectedPupils({ ...selectedPupils, isAddPupilToClass: true }),
                                    text: `Add ${getPluralizedLabel(selectedPupils.pupilIds.length, 'pupil', 's')} to class`,
                                    icon: 'add',
                                    disabled: isIgnoringPupilsLoading
                                },
                                {
                                    onClick: () => handleIgnorePupils(selectedPupils.pupilIds),
                                    text: `Remove from the list`,
                                    icon: 'close',
                                    disabled: isIgnoringPupilsLoading
                                }
                            ]}
                        />
                    ) : (
                        <CommonStatus
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                            heading={'No pupils found'}
                            className="my10"
                        />
                    )}
                </AccordionDetails>
            </Accordion>

            <Accordion disableGutters className="pupils-not-in-class-accordion">
                <AccordionSummary className="pupils-not-in-class-accordion-header" expandIcon={<ExpandMoreIcon />}>
                    <Heading1 text="Pupils removed from the list" />
                    <Chip label={ignoredPupils?.length ?? 0} size="small" />{' '}
                </AccordionSummary>

                <AccordionDetails className="pupils-not-in-class-accordion-details">
                    {ignoredPupils?.length > 0 ? (
                        <CommonLocalSortableDatatable
                            dataTest="ignored-pupils"
                            rows={ignoredPupils}
                            columns={head}
                            setSelectedItem={(ids) => {
                                setIgnoredSelectedPupils({
                                    ...ignoredSelectedPupils,
                                    isActionWithSinglePupil: false,
                                    pupilIds: ids.map((pupil) => pupil.id)
                                });
                            }}
                            selectedItem={ignoredSelectedPupils.isActionWithSinglePupil ? [] : ignoredSelectedPupils.pupilIds}
                            hideFooter
                            disableColumnMenu
                            disableRowSelectionOnClick
                            footerButtons={[
                                {
                                    onClick: () => setIgnoredSelectedPupils({ ...ignoredSelectedPupils, isAddPupilToClass: true }),
                                    text: `Add ${getPluralizedLabel(ignoredSelectedPupils.pupilIds.length, 'pupil', 's')} to class`,
                                    icon: 'add',
                                    disabled: isIgnoringPupilsLoading
                                }
                            ]}
                        />
                    ) : (
                        <CommonStatus
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                            heading={'No pupils found'}
                            className="my10"
                        />
                    )}
                </AccordionDetails>
            </Accordion>

            {(selectedPupils.isAddPupilToClass || ignoredSelectedPupils.isAddPupilToClass) && (
                <AddPupilsInClass
                    open
                    schoolId={schoolDetails?.id}
                    handleClose={() => {
                        if (selectedPupils.isAddPupilToClass) setSelectedPupils(initialState);
                        else setIgnoredSelectedPupils(initialState);
                    }}
                    isPreRegistrationClass
                    selectedPupils={selectedPupils.isAddPupilToClass ? selectedPupils.pupilIds : ignoredSelectedPupils.pupilIds}
                />
            )}
        </div>
    );
};

export default PreRegistrationPupilNotAssignedToFutureClass;
