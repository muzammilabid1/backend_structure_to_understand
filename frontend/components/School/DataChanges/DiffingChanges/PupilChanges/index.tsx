import { gql, useMutation, useQuery } from '@apollo/client';
import InfoOutlineIcon from '@mui/icons-material/InfoOutlined';
import { Chip, Collapse, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Box } from '@mui/system';
import { ChangeOperation, ChangeStatus, EntityType } from 'lwp-shared';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import { useDataChangesReview } from '../../../../../context/DataChangesReviewContext';
import { getSchoolForDashboardWrapper } from '../../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../../shared/Constant';
import { countWithPlural, handleErrorSnackbar, showDate } from '../../../../../shared/Services/handler';
import { IPupilSummary } from '../../../../../types/IDataChange';
import { useLwpAppContext } from '../../../../AuthProvider';
import CommonIconButton from '../../../../Shared/Button/CommonIconButton';
import LWPButton from '../../../../Shared/Button/LWPButton';
import CommonCheckBox from '../../../../Shared/CommonCheckBox';
import CommonLoading from '../../../../Shared/CommonLoading';
import CommonPopOver from '../../../../Shared/CommonPopOver';
import CommonStatus from '../../../../Shared/CommonStatus';
import CommonTable from '../../../../Shared/CommonTable';
import Heading3 from '../../../../Shared/Typography/Heading3';
import Paragraph from '../../../../Shared/Typography/Paragraph';
import PupilDiffingFilter from './PupilDiffingFilter';

const getPendingPupilDataChanges = gql`
    query getPendingPupilDataChanges($importedSchoolId: String!, $includeRejectedChanges: Boolean!) {
        getPendingPupilDataChanges(importedSchoolId: $importedSchoolId, includeRejectedChanges: $includeRejectedChanges) {
            operation
            changeCount
            pupil {
                id
                firstname
                lastname
                dateOfBirth
                UPN
                pupilClass {
                    id
                    name
                }
            }
            proposedChange {
                id
                fieldName
                proposedValue
                registrationClassName
                status
                rejectedImportedAt
            }
        }
    }
`;

const updateEntityChangeRequests = gql`
    mutation updateEntityChangeRequests($input: UpdateEntityChangeRequestsInput!, $importedSchoolId: String!) {
        updateEntityChangeRequests(input: $input, importedSchoolId: $importedSchoolId)
    }
`;

type ProposedChangeField = 'firstName' | 'lastName' | 'dateOfBirth' | 'upn' | 'registrationClass';

export enum PupilDiffingFilterCategory {
    ALL = 'All',
    UPN = 'UPN',
    FIRST_NAME = 'FIRST_NAME',
    LAST_NAME = 'LAST_NAME',
    DATE_OF_BIRTH = 'DATE_OF_BIRTH',
    REGISTRATION_CLASS = 'REGISTRATION_CLASS',
    DELETED = 'DELETED'
}

interface ProposedChange {
    id: string | null;
    fieldName: ProposedChangeField;
    proposedValue: string | null;
    registrationClassName?: string | null;
    status: ChangeStatus;
    rejectedImportedAt: Date | null;
}

interface PendingPupilDataChangeOutput {
    operation: ChangeOperation;
    pupil?: IPupilSummary | null;
    proposedChange: Array<ProposedChange>;
    changeCount: string;
}

interface UpdateEntityChangeRequest {
    accept: boolean;
    id: string;
}

interface UpdateEntityChangeRequestsInput {
    type: EntityType;
    actions: Array<UpdateEntityChangeRequest>;
}

const PupilChanges = () => {
    const router = useRouter();
    const { schoolId, importedSchoolId } = useDataChangesReview();
    const { callSnackbar } = useLwpAppContext();
    const [selectedPupils, setSelectedPupils] = useState<Array<string>>([]);
    const [allPendingProposedChanges, setPendingProposedChanges] = useState<Array<PendingPupilDataChangeOutput>>([]);
    const [updateAllChangesLoading, setUpdateAllChangesLoading] = useState({ acceptAll: false, rejectAll: false });
    const [selectedFilterCategory, setSelectedFilterCategory] = useState<PupilDiffingFilterCategory>(PupilDiffingFilterCategory.ALL);
    const includeRejectedChanges = router.query?.includeRejectedChanges === 'true';

    const [updateEntityChangeRequestsMutation, { loading: updateLoading }] = useMutation(updateEntityChangeRequests);

    const {
        data,
        loading,
        refetch,
        error: pendingChangesError
    } = useQuery(getPendingPupilDataChanges, {
        variables: { importedSchoolId, includeRejectedChanges },
        skip: !importedSchoolId,
        notifyOnNetworkStatusChange: true
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, pendingChangesError);
    }, [pendingChangesError]);

    useEffect(() => {
        if (data?.getPendingPupilDataChanges) {
            setPendingProposedChanges(data.getPendingPupilDataChanges as Array<PendingPupilDataChangeOutput>);
        }
    }, [data]);

    const { pendingProposedChanges, counts } = useMemo(() => {
        const counts: Record<PupilDiffingFilterCategory, number> = {
            [PupilDiffingFilterCategory.ALL]: allPendingProposedChanges?.length || 0,
            [PupilDiffingFilterCategory.UPN]: 0,
            [PupilDiffingFilterCategory.FIRST_NAME]: 0,
            [PupilDiffingFilterCategory.LAST_NAME]: 0,
            [PupilDiffingFilterCategory.DATE_OF_BIRTH]: 0,
            [PupilDiffingFilterCategory.REGISTRATION_CLASS]: 0,
            [PupilDiffingFilterCategory.DELETED]: 0
        };

        allPendingProposedChanges.forEach((change) => {
            if (change?.operation === ChangeOperation.DELETE) {
                counts[PupilDiffingFilterCategory.DELETED] += 1;
            } else {
                change?.proposedChange?.forEach((proposeChange) => {
                    if (proposeChange?.fieldName === 'upn') counts[PupilDiffingFilterCategory.UPN] += 1;
                    else if (proposeChange?.fieldName === 'firstName') counts[PupilDiffingFilterCategory.FIRST_NAME] += 1;
                    else if (proposeChange?.fieldName === 'lastName') counts[PupilDiffingFilterCategory.LAST_NAME] += 1;
                    else if (proposeChange?.fieldName === 'dateOfBirth') counts[PupilDiffingFilterCategory.DATE_OF_BIRTH] += 1;
                    else if (proposeChange?.fieldName === 'registrationClass') counts[PupilDiffingFilterCategory.REGISTRATION_CLASS] += 1;
                });
            }
        });

        const filteredChanges =
            selectedFilterCategory === PupilDiffingFilterCategory.ALL
                ? allPendingProposedChanges
                : allPendingProposedChanges.filter((change) => {
                      if (selectedFilterCategory === PupilDiffingFilterCategory.DELETED)
                          return change?.operation === ChangeOperation.DELETE;

                      return (
                          change?.operation === ChangeOperation.UPDATE &&
                          change?.proposedChange?.some((proposeChange) => {
                              if (selectedFilterCategory === PupilDiffingFilterCategory.UPN) return proposeChange?.fieldName === 'upn';
                              if (selectedFilterCategory === PupilDiffingFilterCategory.FIRST_NAME)
                                  return proposeChange?.fieldName === 'firstName';
                              if (selectedFilterCategory === PupilDiffingFilterCategory.LAST_NAME)
                                  return proposeChange?.fieldName === 'lastName';
                              if (selectedFilterCategory === PupilDiffingFilterCategory.DATE_OF_BIRTH)
                                  return proposeChange?.fieldName === 'dateOfBirth';
                              if (selectedFilterCategory === PupilDiffingFilterCategory.REGISTRATION_CLASS)
                                  return proposeChange?.fieldName === 'registrationClass';
                          })
                      );
                  });

        return {
            pendingProposedChanges: filteredChanges,
            counts
        };
    }, [allPendingProposedChanges, selectedFilterCategory]);

    useEffect(() => {
        if (selectedPupils?.length > 0) {
            const updateSelectedPupils = selectedPupils?.filter((pupilId) =>
                pendingProposedChanges?.some((change) => change?.pupil?.id === pupilId)
            );

            setSelectedPupils(updateSelectedPupils);
        }
    }, [pendingProposedChanges]);

    const pupilsChangesTableHeader: Array<string> = ['First name', 'Last name', 'Class', 'UPN', '', ''];

    const handleUpdateEntityChangeRequests = async (actions: Array<UpdateEntityChangeRequest>, message: string): Promise<boolean> => {
        try {
            const input: UpdateEntityChangeRequestsInput = {
                type: EntityType.PUPIL,
                actions
            };

            const res = await updateEntityChangeRequestsMutation({
                variables: { input, importedSchoolId },
                refetchQueries: [
                    {
                        query: getPendingPupilDataChanges,
                        variables: { importedSchoolId, includeRejectedChanges }
                    },
                    {
                        query: getSchoolForDashboardWrapper,
                        variables: { id: schoolId }
                    }
                ],
                awaitRefetchQueries: true
            });

            if (res?.data?.updateEntityChangeRequests) {
                callSnackbar(message, 'success');
            }

            return res?.data?.updateEntityChangeRequests;
        } catch (error) {
            handleErrorSnackbar(callSnackbar, error);

            return false;
        }
    };

    const handleSelectAllPupils = (): void => {
        let newSelectedPupils: Array<string> = [];

        if (selectedPupils.length === 0) newSelectedPupils = pendingProposedChanges.map((pupil) => pupil.pupil.id);

        setSelectedPupils(newSelectedPupils);
    };

    const isPupilsSelected: boolean = selectedPupils.length > 0;

    const handleUpdateAllPupilChanges = async (isAcceptChanges: boolean): Promise<void> => {
        setUpdateAllChangesLoading({ acceptAll: isAcceptChanges, rejectAll: !isAcceptChanges });
        const isSelectedAll: boolean = isPupilsSelected ? selectedPupils.length === pendingProposedChanges.length : true;

        const actions: UpdateEntityChangeRequest[] = Array.from(
            new Map(
                pendingProposedChanges
                    .filter((change) => isSelectedAll || selectedPupils.includes(change?.pupil?.id))
                    .flatMap(
                        (change) =>
                            change?.proposedChange?.map((proposeChange: ProposedChange) => ({
                                accept: isAcceptChanges,
                                id: proposeChange?.id
                            })) ?? []
                    )
                    .map((a) => [a.id, a])
            ).values()
        );

        const message: string = `${isAcceptChanges ? 'Accepted' : 'Rejected'} all ${isPupilsSelected ? 'selected pupils' : 'pupils'} changes.`;

        const isUpdated = await handleUpdateEntityChangeRequests(actions, message);

        if (isUpdated) {
            const pupilIdsOfSelectedFilter =
                selectedPupils?.length > 0 ? selectedPupils : pendingProposedChanges.map((change) => change.pupil.id);

            setPendingProposedChanges((prev) =>
                includeRejectedChanges && !isAcceptChanges
                    ? prev.map((change) =>
                          pupilIdsOfSelectedFilter.includes(change.pupil.id)
                              ? {
                                    ...change,
                                    proposedChange: change?.proposedChange?.map((pc) => ({
                                        ...pc,
                                        status: ChangeStatus.REJECTED,
                                        // If the rejectedImportedAt is already set, keep it. Otherwise, set it to current date.
                                        rejectedImportedAt: pc.rejectedImportedAt || new Date()
                                    }))
                                }
                              : change
                      )
                    : prev.filter((change) => !pupilIdsOfSelectedFilter.includes(change.pupil.id))
            );
            setSelectedPupils([]);
        }

        setUpdateAllChangesLoading({ acceptAll: false, rejectAll: false });
    };

    const handleIncludeRejectedChanges = async (): Promise<void> => {
        try {
            const include_rejected_changes = !includeRejectedChanges;

            setSelectedFilterCategory(PupilDiffingFilterCategory.ALL);
            router.push(
                {
                    pathname: router.pathname,
                    query: {
                        school_id: schoolId,
                        includeRejectedChanges: include_rejected_changes
                    }
                },
                undefined,
                { shallow: true }
            );
            await refetch({ importedSchoolId, includeRejectedChanges: include_rejected_changes });
        } catch (err) {
            handleErrorSnackbar(callSnackbar, err);
        }
    };

    const isEveryChangesRejected: boolean = useMemo(
        () =>
            pendingProposedChanges
                .filter((item) => (selectedPupils?.length ? selectedPupils.includes(item?.pupil?.id) : true))
                ?.every((change) => change?.proposedChange?.every((pc) => pc?.status === ChangeStatus.REJECTED)),
        [pendingProposedChanges, selectedPupils]
    );

    return (
        <div>
            {loading ? (
                <CommonLoading />
            ) : (
                <>
                    <PupilDiffingFilter
                        counts={counts}
                        selected={selectedFilterCategory}
                        handleSelect={setSelectedFilterCategory}
                        includeRejectedChanges={includeRejectedChanges}
                        handleIncludeRejectedChanges={handleIncludeRejectedChanges}
                    />
                    {data?.getPendingPupilDataChanges?.length > 0 ? (
                        <Box className="pupil-changes-table">
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell width={'1px'}>
                                                <CommonCheckBox
                                                    sx={{
                                                        margin: 0
                                                    }}
                                                    name="selectAllPupilsChanges"
                                                    checked={selectedPupils.length === pendingProposedChanges.length}
                                                    indeterminate={
                                                        selectedPupils.length > 0 && pendingProposedChanges.length !== selectedPupils.length
                                                    }
                                                    onClick={handleSelectAllPupils}
                                                />
                                            </TableCell>
                                            {pupilsChangesTableHeader.map((header, index) => (
                                                <TableCell key={index}>
                                                    <Paragraph text={header} />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pendingProposedChanges.map((pupil, ind) => {
                                            return (
                                                <Row
                                                    key={`${pupil?.operation}-${ind}`}
                                                    pupilData={pupil}
                                                    handleUpdateEntityChangeRequests={handleUpdateEntityChangeRequests}
                                                    loading={updateLoading}
                                                    selectedPupils={selectedPupils}
                                                    setSelectedPupils={setSelectedPupils}
                                                    setPendingProposedChanges={setPendingProposedChanges}
                                                    selectedFilterCategory={selectedFilterCategory}
                                                    includeRejectedChanges={includeRejectedChanges}
                                                />
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Grid
                                container
                                gap={3}
                                flexGrow={1}
                                alignItems="center"
                                justifyContent="space-between"
                                className="accept-reject-actions-container">
                                <Grid item>
                                    <Heading3
                                        text={`These actions will apply to all ${isPupilsSelected ? 'selected' : 'listed'} pupils:`}
                                    />
                                </Grid>
                                <Grid item display="flex" gap={2}>
                                    {!isEveryChangesRejected ? (
                                        <LWPButton
                                            btnText={`Reject ${isPupilsSelected ? 'selected' : 'all'}`}
                                            color="inherit"
                                            dataTest="reject-all-pupil-changes"
                                            onClick={() => handleUpdateAllPupilChanges(false)}
                                            loading={updateAllChangesLoading?.rejectAll}
                                            disabled={updateAllChangesLoading?.acceptAll}
                                        />
                                    ) : null}

                                    <LWPButton
                                        btnText={`Accept ${isPupilsSelected ? 'selected' : 'all'}`}
                                        onClick={() => handleUpdateAllPupilChanges(true)}
                                        dataTest="accept-all-pupil-changes"
                                        loading={updateAllChangesLoading?.acceptAll}
                                        disabled={updateAllChangesLoading?.rejectAll}
                                    />
                                    {selectedPupils?.length > 0 ? (
                                        <CommonIconButton icon="clear" onClick={() => setSelectedPupils([])} />
                                    ) : null}
                                </Grid>
                            </Grid>
                        </Box>
                    ) : (
                        <Grid container justifyContent="center" alignItems="center" flexDirection="column" gap={2} my={6}>
                            <Grid item>
                                <CommonStatus
                                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                                    imageAlt={'No changes to review'}
                                    heading="No changes to review"
                                    headingDataTest="no-pupil-change-to-review"
                                />
                            </Grid>
                            <Grid item>
                                <LWPButton
                                    dataTest="return-to-school-overview-btn-from-pupil-changes-page"
                                    btnText="Return to school overview"
                                    onClick={() => router.push(`/school/${schoolId}`)}
                                />
                            </Grid>
                        </Grid>
                    )}
                </>
            )}
        </div>
    );
};

interface IRowProps {
    pupilData: PendingPupilDataChangeOutput;
    loading: boolean;
    handleUpdateEntityChangeRequests: (actions: Array<UpdateEntityChangeRequest>, message: string) => Promise<boolean>;
    selectedPupils: Array<string>;
    setSelectedPupils: (pupils: Array<string>) => void;
    setPendingProposedChanges: React.Dispatch<React.SetStateAction<Array<PendingPupilDataChangeOutput>>>;
    selectedFilterCategory: PupilDiffingFilterCategory;
    includeRejectedChanges: boolean;
}

const Row = ({
    pupilData,
    loading,
    handleUpdateEntityChangeRequests,
    selectedPupils,
    setSelectedPupils,
    setPendingProposedChanges,
    selectedFilterCategory,
    includeRejectedChanges
}: IRowProps) => {
    const [open, setOpen] = useState(pupilData?.operation === ChangeOperation.UPDATE);
    const pupilDetails: IPupilSummary = pupilData?.pupil;
    const [updateAllChangesLoading, setUpdateAllChangesLoading] = useState({ acceptAll: false, rejectAll: false });
    const proposedChanges: Array<ProposedChange> = pupilData?.proposedChange || [];

    const renderPupilOperation = (): string => {
        switch (pupilData?.operation) {
            case ChangeOperation.CREATE:
                return 'Created';

            case ChangeOperation.UPDATE:
                return countWithPlural('change', pupilData?.changeCount || '0');

            case ChangeOperation.DELETE:
                return 'Deleted';
        }
    };

    const isPupilDeleted: boolean = pupilData?.operation === ChangeOperation.DELETE;
    const pupilFullName: string = `${pupilDetails?.firstname} ${pupilDetails?.lastname}`;

    const renderText = (text: string): string => {
        if (text) return text;

        return isPupilDeleted ? '' : '-';
    };

    const handleUpdateAllChanges = async (accept: boolean): Promise<void> => {
        const updateAllActions: Array<UpdateEntityChangeRequest> = proposedChanges?.map((change) => ({ accept, id: change.id }));

        setUpdateAllChangesLoading({ acceptAll: accept, rejectAll: !accept });

        const successMessage = accept
            ? `All changes for ${pupilFullName} have been accepted.`
            : `All changes for ${pupilFullName} have been rejected.`;

        const isUpdated = await handleUpdateEntityChangeRequests(updateAllActions, successMessage);

        if (isUpdated) {
            setPendingProposedChanges((prev) =>
                includeRejectedChanges && !accept
                    ? prev.map((change) =>
                          change?.pupil?.id === pupilDetails?.id
                              ? {
                                    ...change,
                                    proposedChange: change?.proposedChange?.map((pc) => ({
                                        ...pc,
                                        status: ChangeStatus.REJECTED,
                                        rejectedImportedAt: pc?.rejectedImportedAt || new Date()
                                    }))
                                }
                              : change
                      )
                    : prev.filter((change) => change?.pupil?.id !== pupilDetails?.id)
            );
        }

        setUpdateAllChangesLoading({ acceptAll: false, rejectAll: false });
    };

    const handleUpdateIndividualChange = async (proposeChange: ProposedChange, accept: boolean, fieldName: string): Promise<void> => {
        const isUpdated = await handleUpdateEntityChangeRequests(
            [{ accept, id: proposeChange.id }],
            `"${fieldName}" change has been ${accept ? 'successfully updated' : 'rejected'}.`
        );

        if (isUpdated) {
            setPendingProposedChanges((prev) =>
                proposedChanges?.length > 1
                    ? prev.map((change) => {
                          if (change?.pupil?.id === pupilDetails?.id) {
                              const proposedChange =
                                  includeRejectedChanges && !accept
                                      ? change?.proposedChange?.map((pc) =>
                                            pc?.id === proposeChange?.id
                                                ? {
                                                      ...pc,
                                                      status: ChangeStatus.REJECTED,
                                                      rejectedImportedAt: new Date()
                                                  }
                                                : pc
                                        )
                                      : change?.proposedChange?.filter((pc) => pc?.id !== proposeChange?.id);
                              const pupil: IPupilSummary = { ...change.pupil };

                              if (accept) {
                                  if (proposeChange?.fieldName === 'upn') pupil.UPN = proposeChange?.proposedValue;
                                  else if (proposeChange?.fieldName === 'firstName') pupil.firstname = proposeChange?.proposedValue;
                                  else if (proposeChange?.fieldName === 'lastName') pupil.lastname = proposeChange?.proposedValue;
                                  else if (proposeChange?.fieldName === 'dateOfBirth') pupil.dateOfBirth = proposeChange?.proposedValue;
                                  else if (proposeChange?.fieldName === 'registrationClass')
                                      pupil.pupilClass = {
                                          name: proposeChange?.registrationClassName,
                                          id: proposeChange?.proposedValue
                                      };
                              }

                              return {
                                  ...change,
                                  pupil,
                                  proposedChange
                              };
                          }

                          return change;
                      })
                    : includeRejectedChanges && !accept
                      ? prev.map((change) =>
                            change?.pupil?.id === pupilDetails?.id
                                ? {
                                      ...change,
                                      proposedChange: change?.proposedChange?.map((pc) => ({
                                          ...pc,
                                          status: ChangeStatus.REJECTED,
                                          rejectedImportedAt: pc?.rejectedImportedAt || new Date()
                                      }))
                                  }
                                : change
                        )
                      : prev.filter((change) => change?.pupil?.id !== pupilDetails?.id)
            );
        }
    };

    const handleChangeAction = async (proposeChange: ProposedChange, accept: boolean) => {
        const successMessage = accept
            ? `Pupil ${pupilFullName} has been successfully deleted.`
            : `Deletion request for ${pupilFullName} has been rejected.`;
        const isUpdated = await handleUpdateEntityChangeRequests([{ accept, id: proposeChange.id }], successMessage);

        if (isUpdated) {
            setPendingProposedChanges((prev) =>
                includeRejectedChanges && !accept
                    ? prev.map((change) =>
                          change?.pupil?.id === pupilDetails?.id
                              ? {
                                    ...change,
                                    proposedChange: change?.proposedChange?.map((pc) => ({
                                        ...pc,
                                        status: ChangeStatus.REJECTED,
                                        rejectedImportedAt: pc?.rejectedImportedAt || new Date()
                                    }))
                                }
                              : change
                      )
                    : prev.filter((change) => change?.pupil?.id !== pupilDetails?.id)
            );
        }
    };

    const renderRejectedInfo = (change: ProposedChange) => {
        if (change?.status === ChangeStatus.REJECTED) {
            return (
                <CommonPopOver hover element={<InfoOutlineIcon fontSize={'medium'} />}>
                    <Paragraph
                        text={
                            change?.rejectedImportedAt
                                ? `Rejected during the ${showDate({ date: change?.rejectedImportedAt, justDate: true })} import`
                                : 'This change has been rejected during previous review'
                        }
                    />
                </CommonPopOver>
            );
        }
    };

    const isAllChangesRejected: boolean = proposedChanges.every((change) => change?.status === ChangeStatus.REJECTED);
    const pupilNameForDataTest = `${pupilDetails?.firstname}-${pupilDetails?.lastname}`;

    return (
        <>
            <TableRow className={`${isPupilDeleted ? 'deleted-row' : ''}`}>
                <TableCell>
                    <CommonCheckBox
                        sx={{
                            margin: 0
                        }}
                        checked={selectedPupils.includes(pupilDetails?.id)}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            let newSelectedPupils: Array<string> = [];

                            if (event.target.checked) {
                                newSelectedPupils = [...selectedPupils, pupilDetails?.id];
                            } else {
                                newSelectedPupils = selectedPupils.filter((id) => id !== pupilDetails?.id);
                            }

                            setSelectedPupils(newSelectedPupils);
                        }}
                    />
                </TableCell>
                <TableCell sx={{ minWidth: '100px' }}>
                    <Paragraph text={pupilDetails?.firstname} isTruncate />
                </TableCell>
                <TableCell sx={{ minWidth: '100px' }}>
                    <Paragraph text={pupilDetails?.lastname} isTruncate />
                </TableCell>
                <TableCell sx={{ minWidth: '100px' }}>
                    <Paragraph text={renderText(pupilDetails?.pupilClass?.name)} isTruncate />
                </TableCell>
                <TableCell sx={{ minWidth: '100px' }}>
                    <Paragraph text={renderText(pupilDetails?.UPN)} isTruncate />
                </TableCell>
                <TableCell align="center" width={'100px'}>
                    <div className="rejected-change-indicator">
                        <Chip label={renderPupilOperation()} className={`changes-count ${pupilData?.operation}`} />
                        {isPupilDeleted && renderRejectedInfo(proposedChanges?.[0])}
                    </div>
                </TableCell>
                <TableCell align="right" width={'100px'}>
                    <Grid container flexWrap="nowrap" justifyContent="flex-end" className="actions-icons-container">
                        {pupilData?.operation === ChangeOperation.UPDATE ? (
                            <Grid item>
                                <CommonIconButton
                                    icon={open ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
                                    onClick={() => setOpen(!open)}
                                />
                            </Grid>
                        ) : (
                            <>
                                {proposedChanges?.[0]?.status !== ChangeStatus.REJECTED && (
                                    <Grid item>
                                        <CommonIconButton
                                            icon={'clear'}
                                            toolTipTitle="Reject change"
                                            onClick={() => handleChangeAction(proposedChanges[0], false)}
                                            className="reject-button"
                                            disabled={loading}
                                        />
                                    </Grid>
                                )}

                                <Grid item>
                                    <CommonIconButton
                                        icon={'check'}
                                        toolTipTitle="Accept change"
                                        onClick={() => handleChangeAction(proposedChanges[0], true)}
                                        className="accept-button"
                                        disabled={loading}
                                    />
                                </Grid>
                            </>
                        )}
                    </Grid>
                </TableCell>
            </TableRow>
            <TableRow className="changes-expanded-row">
                <TableCell />
                <TableCell colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Grid container gap={2} className="pupil-changes-expanded-container">
                            <Grid item xs={12}>
                                <Heading3 text="Changed fields" />
                            </Grid>
                            <Grid item xs={12}>
                                <CommonTable head={['Field name', 'Old value', 'New value', 'Actions']} className="changed-fields-table">
                                    {proposedChanges.map((change, index) => {
                                        let fieldData: {
                                            fieldName: string;
                                            oldValue: string;
                                            newValue: string;
                                            isHighlight: boolean;
                                            dataTestValue: string;
                                        } = {
                                            fieldName: '',
                                            oldValue: '',
                                            newValue: '',
                                            isHighlight: false,
                                            dataTestValue: ''
                                        };

                                        if (change?.fieldName === 'upn') {
                                            fieldData = {
                                                fieldName: 'UPN',
                                                dataTestValue: 'upn',
                                                oldValue: pupilDetails?.UPN ? pupilDetails?.UPN : '-',
                                                newValue: change?.proposedValue,
                                                isHighlight: selectedFilterCategory === PupilDiffingFilterCategory.UPN
                                            };
                                        } else if (change?.fieldName === 'firstName') {
                                            fieldData = {
                                                fieldName: 'First name',
                                                dataTestValue: 'first-name',
                                                oldValue: pupilDetails?.firstname,
                                                newValue: change?.proposedValue,
                                                isHighlight: selectedFilterCategory === PupilDiffingFilterCategory.FIRST_NAME
                                            };
                                        } else if (change?.fieldName === 'lastName') {
                                            fieldData = {
                                                fieldName: 'Last name',
                                                dataTestValue: 'last-name',
                                                oldValue: pupilDetails?.lastname,
                                                newValue: change?.proposedValue,
                                                isHighlight: selectedFilterCategory === PupilDiffingFilterCategory.LAST_NAME
                                            };
                                        } else if (change?.fieldName === 'dateOfBirth') {
                                            fieldData = {
                                                fieldName: 'Date of birth',
                                                dataTestValue: 'date-of-birth',
                                                oldValue: pupilDetails?.dateOfBirth
                                                    ? showDate({ date: pupilDetails?.dateOfBirth, justDate: true })
                                                    : '-',
                                                newValue: showDate({ date: change?.proposedValue, justDate: true }),
                                                isHighlight: selectedFilterCategory === PupilDiffingFilterCategory.DATE_OF_BIRTH
                                            };
                                        } else if (change?.fieldName === 'registrationClass') {
                                            fieldData = {
                                                fieldName: 'Class',
                                                dataTestValue: 'class',
                                                oldValue: pupilDetails?.pupilClass?.name ? pupilDetails?.pupilClass?.name : '-',
                                                newValue: change?.registrationClassName,
                                                isHighlight: selectedFilterCategory === PupilDiffingFilterCategory.REGISTRATION_CLASS
                                            };
                                        }

                                        return (
                                            <TableRow key={index} className={fieldData?.isHighlight ? 'highlight-row' : ''}>
                                                <TableCell>
                                                    <div className="rejected-change-indicator">
                                                        <Paragraph
                                                            dataTest={`${fieldData?.dataTestValue}-field-name-for-${pupilNameForDataTest}`}
                                                            text={fieldData?.fieldName}
                                                        />
                                                        {renderRejectedInfo(change)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Paragraph
                                                        dataTest={`${fieldData?.dataTestValue}-old-value-for-${pupilNameForDataTest}`}
                                                        text={fieldData?.oldValue}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Paragraph
                                                        dataTest={`${fieldData?.dataTestValue}-new-value-for-${pupilNameForDataTest}`}
                                                        text={fieldData?.newValue}
                                                    />
                                                </TableCell>
                                                <TableCell width={'100px'}>
                                                    <Grid container flexWrap="nowrap" className="actions-icons-container">
                                                        <Grid item>
                                                            {change?.status !== ChangeStatus.REJECTED && (
                                                                <CommonIconButton
                                                                    icon={'clear'}
                                                                    toolTipTitle="Reject change"
                                                                    dataTest={`reject-${fieldData?.dataTestValue}-change-for-${pupilNameForDataTest}`}
                                                                    onClick={() =>
                                                                        handleUpdateIndividualChange(change, false, fieldData?.fieldName)
                                                                    }
                                                                    className="reject-button"
                                                                    disabled={loading}
                                                                />
                                                            )}
                                                        </Grid>
                                                        <Grid item>
                                                            <CommonIconButton
                                                                icon={'check'}
                                                                toolTipTitle="Accept change"
                                                                dataTest={`accept-${fieldData?.dataTestValue}-change-for-${pupilNameForDataTest}`}
                                                                onClick={() =>
                                                                    handleUpdateIndividualChange(change, true, fieldData?.fieldName)
                                                                }
                                                                className="accept-button"
                                                                disabled={loading}
                                                            />
                                                        </Grid>
                                                    </Grid>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    <TableRow className="summary-row">
                                        <TableCell colSpan={4}>
                                            <Grid container alignItems={'center'} justifyContent="space-between" gap={1}>
                                                <Grid item>
                                                    <Heading3 text={`These actions apply only to ${pupilFullName}:`} />
                                                </Grid>
                                                <Grid item display="flex" gap={2}>
                                                    {!isAllChangesRejected ? (
                                                        <LWPButton
                                                            btnText="Reject all"
                                                            color="inherit"
                                                            dataTest={`reject-all-${pupilNameForDataTest}-changes`}
                                                            onClick={() => handleUpdateAllChanges(false)}
                                                            loading={updateAllChangesLoading.rejectAll}
                                                            disabled={updateAllChangesLoading.acceptAll}
                                                        />
                                                    ) : null}
                                                    <LWPButton
                                                        btnText="Accept all"
                                                        dataTest={`accept-all-${pupilNameForDataTest}-changes`}
                                                        onClick={() => handleUpdateAllChanges(true)}
                                                        loading={updateAllChangesLoading.acceptAll}
                                                        disabled={updateAllChangesLoading.rejectAll}
                                                    />
                                                </Grid>
                                            </Grid>
                                        </TableCell>
                                    </TableRow>
                                </CommonTable>
                            </Grid>
                        </Grid>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

export default PupilChanges;
