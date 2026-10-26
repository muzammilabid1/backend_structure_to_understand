import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid, TableCell, TableRow } from '@mui/material';
import { Box } from '@mui/system';
import { Formik } from 'formik';
import { countBy } from 'lodash';
import { DataImportLinkAction, PupilSourceType } from 'lwp-shared';
import { useContext, useEffect, useMemo, useState } from 'react';

import { useDataChangesReview } from '../../../../context/DataChangesReviewContext';
import { getSchoolForDashboardWrapper } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { linkingValidationSchema } from '../../../../shared/validations';
import { IPupilSummary, LinkFilterCategory } from '../../../../types/IDataChange';
import CommonIconButton from '../../../Shared/Button/CommonIconButton';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonMultiSelect from '../../../Shared/CommonMultiSelect';
import CommonSnackbar from '../../../Shared/CommonSnackbar';
import CommonStatus from '../../../Shared/CommonStatus';
import CommonTable from '../../../Shared/CommonTable';
import Heading1 from '../../../Shared/Typography/Heading1';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import LinkFilter from '../LinkFilter';
import ComparePupilDetailsDrawer from './ComparePupilDetailsDrawer';
import PupilDetailModal from './PupilDetailModal';

const getPendingPupilLinks = gql`
    query getPendingPupilLinks($importedSchoolId: String!) {
        getPendingPupilLinks(importedSchoolId: $importedSchoolId) {
            importedStudent {
                id
                firstname
                lastname
            }
            proposedPlatformPupilLinks {
                id
                firstname
                lastname
                pupilClass {
                    id
                    name
                    yearGroup
                }
                isPreviouslyLinked
            }
        }
    }
`;

const updatePupilLinkRequests = gql`
    mutation updatePupilLinkRequests($input: [UpdatePupilLinkRequestsInput!]!, $importedSchoolId: String!) {
        updatePupilLinkRequests(input: $input, importedSchoolId: $importedSchoolId) {
            importStatus
        }
    }
`;

interface IOptionType {
    key: DataImportLinkAction;
    value: string;
    id?: string;
}

interface IPendingPupilLinkOutput {
    importedStudent: IPupilSummary;
    proposedPlatformPupilLinks: IPupilSummary[];
}
interface IPupilDetailState {
    importedPupilId: string;
    platformPupilId: string;
    pupilName: string;
    isPupilDetailModal: boolean;
    isPupilDetailCompareDrawer: boolean;
}
const initialValue: IPupilDetailState = {
    importedPupilId: '',
    platformPupilId: '',
    pupilName: '',
    isPupilDetailModal: false,
    isPupilDetailCompareDrawer: false
};

const LinkPupils = () => {
    const { importedSchoolId, schoolId, setSchoolStatus } = useDataChangesReview();

    const { callSnackbar } = useContext(ThemeContext);

    const [pupilDetailState, setPupilDetailState] = useState<IPupilDetailState>(initialValue);
    const [alertState, setAlertState] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
    const [selectedFilter, setSelectedFilter] = useState<LinkFilterCategory>(LinkFilterCategory.ALL);

    const { loading, data, error } = useQuery(getPendingPupilLinks, {
        variables: { importedSchoolId },
        skip: !schoolId
    });

    const [updatePupilLinkRequestsMutation, { loading: updateLoading }] = useMutation(updatePupilLinkRequests);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const { pupilsPendingLink, pupilLinkInitialValues, counts } = useMemo(() => {
        const pendingPupilLinksData = data?.getPendingPupilLinks ?? [];

        const counts = {
            [LinkFilterCategory.ALL]: pendingPupilLinksData?.length,
            [LinkFilterCategory.SUGGESTED_MATCHES]: 0,
            [LinkFilterCategory.LOW_CONFIDENCE_MATCHES]: 0,
            [LinkFilterCategory.UNMATCHED]: 0
        };

        if (!pendingPupilLinksData) {
            return {
                pupilsPendingLink: [],
                pupilLinkInitialValues: {},
                counts
            };
        }

        const pupilsPendingLink: Array<{
            importedStudent: IPupilSummary;
            proposedLinks: IOptionType[];
            proposedPlatformPupilLinks: IPupilSummary[];
            matchCount: number;
        }> = pendingPupilLinksData.map((link: IPendingPupilLinkOutput) => {
            const proposedLinks: IOptionType[] = [
                ...(link?.proposedPlatformPupilLinks?.map((pupil) => ({
                    value: `${pupil?.firstname} ${pupil?.lastname}`,
                    id: pupil?.id,
                    key: DataImportLinkAction.LINK
                })) || []),
                {
                    value: 'No existing pupil',
                    key: DataImportLinkAction.CREATE
                }
                /* "Ignore this pupil" is deliberately not offered. Ignoring is recorded and honoured
                 * by the review, but the legacy relink that runs afterwards creates a pupil for every
                 * imported student without one, so the record reappears - at the latest on the next
                 * nightly sync. Rather than promise something that does not hold, the choice is
                 * withheld until the relink can respect it. DataImportLinkAction.IGNORE is still
                 * handled everywhere so any decision already recorded keeps working. */
            ];

            /* Bucket on how many real pupils were proposed, not on the length of the list above:
             * that list also carries the synthetic "No existing pupil" entry, so counting it couples
             * these thresholds to how many synthetic options happen to exist and mis-buckets every
             * row the moment one is added or removed. */
            const matchCount = link?.proposedPlatformPupilLinks?.length ?? 0;

            if (matchCount === 0) counts[LinkFilterCategory.UNMATCHED] += 1;
            else if (matchCount === 1) counts[LinkFilterCategory.SUGGESTED_MATCHES] += 1;
            else counts[LinkFilterCategory.LOW_CONFIDENCE_MATCHES] += 1;

            return {
                ...link,
                proposedLinks,
                matchCount
            };
        });

        const filteredPupilsPendingLink = pupilsPendingLink.filter((link) => {
            if (selectedFilter === LinkFilterCategory.ALL) return true;
            else if (selectedFilter === LinkFilterCategory.SUGGESTED_MATCHES) return link?.matchCount === 1;
            else if (selectedFilter === LinkFilterCategory.UNMATCHED) return link?.matchCount === 0;
            else if (selectedFilter === LinkFilterCategory.LOW_CONFIDENCE_MATCHES) return link?.matchCount > 1;
        });

        const pupilLinkInitialValues = filteredPupilsPendingLink?.reduce(
            (acc, link) => {
                // A single clear match is preselected; an ambiguous row is left for the leader.
                if (link?.matchCount <= 1) {
                    acc[link?.importedStudent?.id] = link.proposedLinks[0];
                } else {
                    acc[link?.importedStudent?.id] = null;
                }

                return acc;
            },
            {} as Record<string, IOptionType | null>
        );

        return {
            pupilsPendingLink: filteredPupilsPendingLink,
            pupilLinkInitialValues,
            counts
        };
    }, [data?.getPendingPupilLinks, selectedFilter]);

    const isSkipOrNewPupilSelected = (key: DataImportLinkAction): boolean =>
        [DataImportLinkAction.CREATE, DataImportLinkAction.IGNORE].includes(key);

    const PREVIOUSLY_LINKED_LABEL = 'Previously linked';

    /* Secondary line for a platform candidate: current registration class, plus a marker when this
     * pupil was linked to the imported student on an earlier import and the link has since been lost. */
    const renderCandidateSubText = (candidate?: IPupilSummary): string =>
        [
            candidate?.pupilClass ? `${candidate.pupilClass.yearGroup} - ${candidate.pupilClass.name}` : null,
            candidate?.isPreviouslyLinked ? PREVIOUSLY_LINKED_LABEL : null
        ]
            .filter(Boolean)
            .join(' · ');

    const renderSelectedOptionLabel = (option: IOptionType, links: IPupilSummary[]) => {
        if (isSkipOrNewPupilSelected(option.key)) return option.value;

        const candidate = links?.find((link) => link?.id === option?.id);
        const subText = renderCandidateSubText(candidate);

        return option?.value ? `${option?.value}${subText ? ` (${subText})` : ''}` : '';
    };

    return (
        <div className="link-platform-data-with-imported-data-container" data-test="link-pupils-page">
            <div className="link-platform-data-with-imported-data-header">
                <Heading1 text="Link pupils" />
                <Paragraph text="We've found pupils in your import who may already exist. Review matches or select the correct pupil from the dropdown." />
            </div>

            <LinkFilter counts={counts} selected={selectedFilter} handleSelect={(key) => setSelectedFilter(key)} />

            {loading ? (
                <CommonLoading />
            ) : counts?.[LinkFilterCategory.ALL] > 0 ? (
                <Formik
                    initialValues={pupilLinkInitialValues}
                    enableReinitialize
                    onSubmit={async (value: { [importedStudentId: string]: IOptionType | null }) => {
                        // filter those pupils which have a selected value
                        const input = pupilsPendingLink
                            .filter((link) => value?.[link?.importedStudent?.id])
                            .map((link) => ({
                                importedStudentId: link?.importedStudent?.id,
                                platformPupilId: value?.[link?.importedStudent?.id]?.id || null,
                                action: value?.[link?.importedStudent?.id]?.key
                            }));

                        // Filter out nulls before counting duplicates
                        const filteredInput = input.filter((item) => item.platformPupilId !== null);

                        const hasDuplicatePlatformPupilLinks = Object.values(countBy(filteredInput, 'platformPupilId')).some(
                            (count) => count > 1
                        );

                        if (hasDuplicatePlatformPupilLinks) {
                            setAlertState({
                                open: true,
                                message: 'Some pupils have been linked to the same platform pupil. Please review each pupil.'
                            });

                            return;
                        }

                        try {
                            const { data } = await updatePupilLinkRequestsMutation({
                                variables: { input, importedSchoolId },
                                refetchQueries: [
                                    {
                                        query: getPendingPupilLinks,
                                        variables: { importedSchoolId }
                                    },
                                    {
                                        query: getSchoolForDashboardWrapper,
                                        variables: { id: schoolId }
                                    }
                                ],
                                awaitRefetchQueries: true
                            });

                            setSelectedFilter(LinkFilterCategory.ALL);
                            setSchoolStatus(data?.updatePupilLinkRequests?.importStatus);

                            callSnackbar('External pupils linked successfully with LWP pupils', 'success');
                        } catch (error) {
                            handleErrorSnackbar(callSnackbar, error);
                        }
                    }}
                    validationSchema={linkingValidationSchema(pupilLinkInitialValues)}>
                    {({ values, errors, touched, handleChange, handleSubmit }) => (
                        <Box>
                            {pupilsPendingLink.length > 0 ? (
                                <>
                                    <CommonTable head={['External pupils', 'LWP pupils']} className="link-table">
                                        {pupilsPendingLink.map((link) => {
                                            return (
                                                <TableRow key={link.importedStudent.id}>
                                                    <TableCell width={'45%'}>
                                                        <Paragraph
                                                            text={`${link.importedStudent.firstname} ${link.importedStudent.lastname}`}
                                                            onClick={() =>
                                                                setPupilDetailState({
                                                                    ...pupilDetailState,
                                                                    isPupilDetailModal: true,
                                                                    isPupilDetailCompareDrawer: false,
                                                                    importedPupilId: link?.importedStudent?.id,
                                                                    pupilName: `${link?.importedStudent?.firstname} ${link?.importedStudent?.lastname}`
                                                                })
                                                            }
                                                            dataTest={`imported-student-name-${link.importedStudent.firstname}-${link.importedStudent.lastname}`}
                                                            customClass="imported-entity-name"
                                                        />
                                                    </TableCell>
                                                    <TableCell width={'55%'}>
                                                        <Grid container alignItems="center" gap={3}>
                                                            <Grid item flexGrow={1}>
                                                                <CommonMultiSelect
                                                                    multiple={false}
                                                                    name={link?.importedStudent?.id}
                                                                    label="Select pupil"
                                                                    value={values?.[link?.importedStudent?.id]}
                                                                    options={link?.proposedLinks}
                                                                    filterSelectedOptions={false}
                                                                    dataTest={`platform-pupil-select-${link.importedStudent.firstname}-${link.importedStudent.lastname}`}
                                                                    className="link-entity-select"
                                                                    getOptionLabel={(option: IOptionType) =>
                                                                        renderSelectedOptionLabel(option, link.proposedPlatformPupilLinks)
                                                                    }
                                                                    touched={touched?.[link?.importedStudent?.id]}
                                                                    error={errors?.[link?.importedStudent?.id]}
                                                                    renderOption={(props, option, state) => {
                                                                        if (isSkipOrNewPupilSelected(option.key as DataImportLinkAction)) {
                                                                            return (
                                                                                <Box component="li" {...props}>
                                                                                    <Grid
                                                                                        container
                                                                                        gap={1}
                                                                                        justifyContent="space-between"
                                                                                        className="link-entity-select-item">
                                                                                        <Grid item>
                                                                                            <Paragraph text={option?.value} />
                                                                                        </Grid>
                                                                                        <Grid item>
                                                                                            <Paragraph
                                                                                                text={`(${option.key === DataImportLinkAction.CREATE ? 'Create new pupil' : 'Won’t create or link pupil'})`}
                                                                                                customClass="select-item-sub-text"
                                                                                            />
                                                                                        </Grid>
                                                                                    </Grid>
                                                                                </Box>
                                                                            );
                                                                        }

                                                                        const subText = renderCandidateSubText(
                                                                            link.proposedPlatformPupilLinks[state?.index]
                                                                        );

                                                                        return (
                                                                            <Box component="li" {...props}>
                                                                                <Grid
                                                                                    container
                                                                                    flexDirection="column"
                                                                                    className="link-entity-select-item">
                                                                                    <Grid item>
                                                                                        <Paragraph text={option.value} />
                                                                                    </Grid>
                                                                                    {subText ? (
                                                                                        <Grid item>
                                                                                            <Paragraph
                                                                                                text={subText}
                                                                                                customClass="select-item-sub-text"
                                                                                            />
                                                                                        </Grid>
                                                                                    ) : null}
                                                                                </Grid>
                                                                            </Box>
                                                                        );
                                                                    }}
                                                                    onChange={(value: IOptionType) => {
                                                                        handleChange({
                                                                            target: {
                                                                                name: link.importedStudent.id,
                                                                                value: value
                                                                            }
                                                                        });
                                                                    }}
                                                                />
                                                            </Grid>
                                                            <Grid item>
                                                                <CommonIconButton
                                                                    disabled={!values?.[link?.importedStudent?.id]?.id}
                                                                    onClick={() =>
                                                                        setPupilDetailState({
                                                                            ...pupilDetailState,
                                                                            isPupilDetailModal: false,
                                                                            isPupilDetailCompareDrawer: true,
                                                                            importedPupilId: link?.importedStudent?.id,
                                                                            platformPupilId: values?.[link?.importedStudent?.id]?.id
                                                                        })
                                                                    }
                                                                    icon="compare_arrows"
                                                                    className="compare-icon"
                                                                    dataTest={`imported-student-compare-icon-${link.importedStudent.firstname}-${link.importedStudent.lastname}`}
                                                                    toolTipTitle="Compare pupils"
                                                                />
                                                            </Grid>
                                                        </Grid>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </CommonTable>
                                    <Grid container gap={3} flexGrow={1} className="link-actions">
                                        <Grid item>
                                            <Heading3 text="Actions:" />
                                        </Grid>
                                        <Grid item>
                                            <LWPButton
                                                btnText="Save pupil linking"
                                                disabled={Object.values(values).every((val) => !val?.key)}
                                                loading={updateLoading}
                                                dataTest="link-pupils-button"
                                                onClick={handleSubmit}
                                            />
                                        </Grid>
                                    </Grid>
                                </>
                            ) : (
                                <CommonStatus
                                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                                    imageAlt={''}
                                    heading="No pupils found to link"
                                    className="my20"
                                />
                            )}
                        </Box>
                    )}
                </Formik>
            ) : (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={''}
                    heading="No pupils to link"
                    className="my20"
                />
            )}

            {pupilDetailState?.isPupilDetailModal && (
                <PupilDetailModal
                    open={pupilDetailState?.isPupilDetailModal}
                    handleClose={() => setPupilDetailState(initialValue)}
                    pupilId={pupilDetailState?.importedPupilId}
                    pupilName={pupilDetailState?.pupilName}
                    sourceType={PupilSourceType.IMPORTED}
                />
            )}

            {pupilDetailState?.isPupilDetailCompareDrawer && (
                <ComparePupilDetailsDrawer
                    open={pupilDetailState?.isPupilDetailCompareDrawer}
                    handleClose={() => setPupilDetailState(initialValue)}
                    importedPupilId={pupilDetailState?.importedPupilId}
                    platformPupilId={pupilDetailState?.platformPupilId}
                />
            )}

            <CommonSnackbar
                open={alertState.open}
                type="error"
                message={alertState.message}
                onClose={() => setAlertState({ ...alertState, open: false })}
                showSnackbar={true}
            />
        </div>
    );
};

export default LinkPupils;
