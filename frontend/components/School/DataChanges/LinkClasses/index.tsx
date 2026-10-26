import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid, TableCell, TableRow } from '@mui/material';
import { Box } from '@mui/system';
import { Formik } from 'formik';
import { countBy } from 'lodash';
import { DataImportLinkAction } from 'lwp-shared';
import { useContext, useEffect, useMemo, useState } from 'react';

import { useDataChangesReview } from '../../../../context/DataChangesReviewContext';
import { getPreAdmissionClasses, getSchoolClassesAndGroups, getSchoolForDashboardWrapper } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { linkingValidationSchema } from '../../../../shared/validations';
import { IClassSummary, LinkFilterCategory } from '../../../../types/IDataChange';
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
import CompareClassesDrawer from './CompareClassesDrawer';

const getPendingClassLinks = gql`
    query getPendingClassLinks($importedSchoolId: String!) {
        getPendingClassLinks(importedSchoolId: $importedSchoolId) {
            importedSchoolClass {
                id
                name
                yearGroup
            }
            proposedPlatformSchoolClasses {
                id
                name
                yearGroup
            }
        }
    }
`;

const updateClassLinkRequests = gql`
    mutation updateClassLinkRequests($input: [UpdateClassLinkRequestsInput!]!, $importedSchoolId: String!) {
        updateClassLinkRequests(input: $input, importedSchoolId: $importedSchoolId) {
            importStatus
        }
    }
`;

interface IPendingClassLinkOutput {
    importedSchoolClass: IClassSummary;
    proposedPlatformSchoolClasses: IClassSummary[];
}

interface IOptionType {
    key: DataImportLinkAction;
    value: string;
    id?: string;
}

interface IClassDetailState {
    isClassDetailDrawer: boolean;
    importedSchoolClass?: IClassSummary | null;
    platformSchoolClass?: IClassSummary | null;
}

const initialValue: IClassDetailState = {
    isClassDetailDrawer: false,
    importedSchoolClass: null,
    platformSchoolClass: null
};

const LinkClasses = () => {
    const { schoolId, importedSchoolId, setSchoolStatus } = useDataChangesReview();

    const { callSnackbar } = useContext(ThemeContext);
    const [classDetailState, setClassDetailState] = useState<IClassDetailState>(initialValue);

    const [alertState, setAlertState] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
    const [selectedFilter, setSelectedFilter] = useState<LinkFilterCategory>(LinkFilterCategory.ALL);

    const [updateClassLinkRequestsMutation, { loading: updateLoading }] = useMutation(updateClassLinkRequests);

    const {
        loading,
        data,
        error: classLinksError
    } = useQuery(getPendingClassLinks, {
        variables: { importedSchoolId },
        skip: !importedSchoolId
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, classLinksError);
    }, [classLinksError]);

    const { classPendingLinks, classLinkInitialValues, counts } = useMemo(() => {
        const pendingClassLinksData = data?.getPendingClassLinks ?? [];

        const counts = {
            [LinkFilterCategory.ALL]: pendingClassLinksData?.length ?? 0,
            [LinkFilterCategory.SUGGESTED_MATCHES]: 0,
            [LinkFilterCategory.LOW_CONFIDENCE_MATCHES]: 0,
            [LinkFilterCategory.UNMATCHED]: 0
        };

        if (!pendingClassLinksData) {
            return {
                classPendingLinks: [],
                classLinkInitialValues: {},
                counts
            };
        }

        const classPendingLinks: Array<{
            importedSchoolClass: IClassSummary;
            proposedLinks: IOptionType[];
            proposedPlatformSchoolClasses: IClassSummary[];
            matchCount: number;
        }> = pendingClassLinksData.map((link: IPendingClassLinkOutput) => {
            const proposedLinks: IOptionType[] = [
                ...(link?.proposedPlatformSchoolClasses?.map((schoolClass: IClassSummary) => ({
                    value: schoolClass?.name,
                    id: schoolClass?.id,
                    key: DataImportLinkAction.LINK
                })) || []),
                {
                    value: 'No existing class',
                    key: DataImportLinkAction.CREATE
                }
                /* "Ignore this class" is deliberately not offered, for the same reason as the pupil
                 * step: the review records and honours the decision, but the legacy relink afterwards
                 * creates a platform class for every imported class with students and no link, so the
                 * class reappears. The choice is withheld until the relink can respect it.
                 * DataImportLinkAction.IGNORE stays handled everywhere, so anything already recorded
                 * keeps working. */
            ];

            /* Bucket on how many real classes were proposed rather than the length of the list above,
             * which also carries the synthetic "No existing class" entry. Counting the list couples
             * these thresholds to how many synthetic options exist and mis-buckets every row the
             * moment one is added or removed. */
            const matchCount = link?.proposedPlatformSchoolClasses?.length ?? 0;

            if (matchCount === 0) counts[LinkFilterCategory.UNMATCHED] += 1;
            else if (matchCount === 1) counts[LinkFilterCategory.SUGGESTED_MATCHES] += 1;
            else counts[LinkFilterCategory.LOW_CONFIDENCE_MATCHES] += 1;

            return {
                ...link,
                proposedLinks,
                matchCount
            };
        });

        const filteredClassPendingLinks = classPendingLinks.filter((link) => {
            if (selectedFilter === LinkFilterCategory.ALL) return true;
            else if (selectedFilter === LinkFilterCategory.SUGGESTED_MATCHES) return link?.matchCount === 1;
            else if (selectedFilter === LinkFilterCategory.UNMATCHED) return link?.matchCount === 0;
            else if (selectedFilter === LinkFilterCategory.LOW_CONFIDENCE_MATCHES) return link?.matchCount > 1;
        });

        const classLinkInitialValues = filteredClassPendingLinks.reduce(
            (acc, link) => {
                // A single clear match is preselected; an ambiguous row is left for the leader.
                if (link?.matchCount <= 1) {
                    acc[link?.importedSchoolClass?.id] = link.proposedLinks[0];
                } else {
                    acc[link?.importedSchoolClass?.id] = null;
                }

                return acc;
            },
            {} as Record<string, IOptionType | null>
        );

        return {
            classPendingLinks: filteredClassPendingLinks,
            classLinkInitialValues,
            counts
        };
    }, [data?.getPendingClassLinks, selectedFilter]);

    const isSkipOrNewClassSelected = (key: DataImportLinkAction): boolean =>
        [DataImportLinkAction.IGNORE, DataImportLinkAction.CREATE].includes(key);

    const renderSelectedOptionLabel = (option: IOptionType, links: IClassSummary[]) => {
        if (isSkipOrNewClassSelected(option.key)) return option.value;

        const classYearGroup = links?.find((link) => link?.id === option.id)?.yearGroup;

        return option?.value ? `${option?.value}${classYearGroup ? ` (${classYearGroup})` : ''}` : '';
    };

    return (
        <div className="link-platform-data-with-imported-data-container" data-test="link-classes-page">
            <div className="link-platform-data-with-imported-data-header">
                <Heading1 text="Link classes" />
                <Paragraph text="We've found classes in your import who may already exist. Review matches and select the correct class from the dropdown." />
            </div>

            <LinkFilter counts={counts} selected={selectedFilter} handleSelect={(key) => setSelectedFilter(key)} />

            {loading ? (
                <CommonLoading />
            ) : counts?.[LinkFilterCategory.ALL] > 0 ? (
                <Formik
                    initialValues={classLinkInitialValues}
                    enableReinitialize
                    onSubmit={async (value: { [importedSchoolClassId: string]: IOptionType | null }) => {
                        const input = classPendingLinks
                            .filter((link) => value[link?.importedSchoolClass?.id]) // Only include if a value has been selected
                            .map((link) => ({
                                importedSchoolClassId: link?.importedSchoolClass?.id,
                                platformSchoolClassId: value?.[link?.importedSchoolClass?.id]?.id || null,
                                action: value?.[link?.importedSchoolClass?.id]?.key
                            }));

                        // Filter out nulls before counting duplicates
                        const filteredInput = input.filter((item) => item.platformSchoolClassId !== null);

                        const hasDuplicatePlatformPupilLinks = Object.values(countBy(filteredInput, 'platformSchoolClassId')).some(
                            (count) => count > 1
                        );

                        if (hasDuplicatePlatformPupilLinks) {
                            setAlertState({
                                open: true,
                                message: 'Some classes have been linked to the same platform classes. Please review each class.'
                            });

                            return;
                        }

                        try {
                            const { data } = await updateClassLinkRequestsMutation({
                                variables: { input, importedSchoolId },
                                refetchQueries: [
                                    {
                                        query: getPendingClassLinks,
                                        variables: { importedSchoolId }
                                    },
                                    {
                                        query: getSchoolForDashboardWrapper,
                                        variables: { id: schoolId }
                                    },
                                    {
                                        query: getSchoolClassesAndGroups,
                                        variables: { schoolId, myClasses: true }
                                    },
                                    {
                                        query: getSchoolClassesAndGroups,
                                        variables: { schoolId, myClasses: false }
                                    },
                                    { query: getPreAdmissionClasses, variables: { schoolId } }
                                ],
                                awaitRefetchQueries: true
                            });

                            setSelectedFilter(LinkFilterCategory.ALL);
                            setSchoolStatus(data?.updateClassLinkRequests?.importStatus);

                            callSnackbar('External classes linked successfully with LWP classes', 'success');
                        } catch (error) {
                            handleErrorSnackbar(callSnackbar, error);
                        }
                    }}
                    validationSchema={linkingValidationSchema(classLinkInitialValues)}>
                    {({ values, errors, touched, handleChange, handleSubmit }) => (
                        <Box>
                            {classPendingLinks?.length > 0 ? (
                                <>
                                    <CommonTable head={['External class', 'LWP classes']} className="link-table">
                                        {classPendingLinks.map((link) => {
                                            return (
                                                <TableRow key={link.importedSchoolClass.id}>
                                                    <TableCell width={'45%'}>
                                                        <Paragraph
                                                            text={link.importedSchoolClass.name}
                                                            customClass="imported-entity-name"
                                                            dataTest={`imported-class-name-${link.importedSchoolClass.name}`}
                                                            onClick={() =>
                                                                setClassDetailState({
                                                                    ...classDetailState,
                                                                    isClassDetailDrawer: true,
                                                                    importedSchoolClass: link?.importedSchoolClass,
                                                                    platformSchoolClass: null
                                                                })
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell width={'55%'}>
                                                        <Grid container alignItems="center" gap={3}>
                                                            <Grid item flexGrow={1}>
                                                                <CommonMultiSelect
                                                                    multiple={false}
                                                                    name={link?.importedSchoolClass?.id}
                                                                    label="Select class"
                                                                    value={values?.[link?.importedSchoolClass?.id]}
                                                                    options={link?.proposedLinks}
                                                                    filterSelectedOptions={false}
                                                                    dataTest={`platform-class-select-${link.importedSchoolClass.name}`}
                                                                    className="link-entity-select"
                                                                    getOptionLabel={(option: IOptionType) =>
                                                                        renderSelectedOptionLabel(
                                                                            option,
                                                                            link.proposedPlatformSchoolClasses
                                                                        )
                                                                    }
                                                                    touched={touched?.[link?.importedSchoolClass?.id]}
                                                                    error={errors?.[link?.importedSchoolClass?.id]}
                                                                    renderOption={(props, option, state) => {
                                                                        if (isSkipOrNewClassSelected(option?.key as DataImportLinkAction)) {
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
                                                                                                text={`(${option?.key === DataImportLinkAction.CREATE ? 'Create new class' : 'Won’t create or link class'})`}
                                                                                                customClass="select-item-sub-text"
                                                                                            />
                                                                                        </Grid>
                                                                                    </Grid>
                                                                                </Box>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <Box component="li" {...props}>
                                                                                <Grid
                                                                                    container
                                                                                    flexDirection="column"
                                                                                    className="link-entity-select-item">
                                                                                    <Grid item>
                                                                                        <Paragraph text={option.value} />
                                                                                        <Paragraph
                                                                                            text={
                                                                                                link.proposedPlatformSchoolClasses[
                                                                                                    state?.index
                                                                                                ]?.yearGroup
                                                                                            }
                                                                                            customClass="select-item-sub-text"
                                                                                        />
                                                                                    </Grid>
                                                                                </Grid>
                                                                            </Box>
                                                                        );
                                                                    }}
                                                                    onChange={(value: IOptionType) => {
                                                                        handleChange({
                                                                            target: {
                                                                                name: link.importedSchoolClass.id,
                                                                                value: value
                                                                            }
                                                                        });
                                                                    }}
                                                                />
                                                            </Grid>
                                                            <Grid item>
                                                                <CommonIconButton
                                                                    disabled={!values?.[link?.importedSchoolClass.id]?.id}
                                                                    onClick={() => {
                                                                        const selectedPlatformClass =
                                                                            link?.proposedPlatformSchoolClasses?.find(
                                                                                (schoolClass) =>
                                                                                    schoolClass?.id ===
                                                                                    values?.[link?.importedSchoolClass.id]?.id
                                                                            );

                                                                        setClassDetailState({
                                                                            ...classDetailState,
                                                                            isClassDetailDrawer: true,
                                                                            importedSchoolClass: link?.importedSchoolClass,
                                                                            platformSchoolClass: selectedPlatformClass
                                                                        });
                                                                    }}
                                                                    icon="compare_arrows"
                                                                    dataTest={`imported-student-compare-icon-${link.importedSchoolClass.name}`}
                                                                    className="compare-icon"
                                                                    toolTipTitle="Compare classes"
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
                                                btnText="Save class linking"
                                                loading={updateLoading}
                                                dataTest="link-classes-button"
                                                disabled={Object.values(values).every((val) => !val?.key)}
                                                onClick={handleSubmit}
                                            />
                                        </Grid>
                                    </Grid>
                                </>
                            ) : (
                                <CommonStatus
                                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                                    imageAlt={'No classes found to link'}
                                    heading="No classes found to link"
                                    className="my20"
                                />
                            )}
                        </Box>
                    )}
                </Formik>
            ) : (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={'No classes to link'}
                    heading="No classes to link"
                    className="my20"
                />
            )}

            {classDetailState.isClassDetailDrawer && (
                <CompareClassesDrawer
                    open={classDetailState.isClassDetailDrawer}
                    handleClose={() => setClassDetailState(initialValue)}
                    importedSchoolClass={classDetailState.importedSchoolClass}
                    platformSchoolClass={classDetailState.platformSchoolClass}
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

export default LinkClasses;
