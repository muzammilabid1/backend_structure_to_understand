import { gql, useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import { useContext, useEffect, useMemo, useState } from 'react';

import { useDelegatedClaims } from '../../../../context/DelegatedClaimsContext';
import { getSchoolForDashboardWrapper } from '../../../../graphQl/queries';
import { ADMIN } from '../../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchool } from '../../../../types/entities/ILwpSchool';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonCheckBox from '../../../Shared/CommonCheckBox';
import CommonLoading from '../../../Shared/CommonLoading';
import Heading1 from '../../../Shared/Typography/Heading1';
import Paragraph from '../../../Shared/Typography/Paragraph';
import SchoolSettingsWrapper from '../SchoolSettingsWrapper';
import MoneySkillsLicenceSection from './MoneySkillsLicenceSection';

export const getSchoolForConfiguration = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            enableBookNameOnlyReadingLog
            parentFeedbackTickFeatureEnabledAt
            isParentFeedbackReplyFeatureEnabled
            isParentFeedbackStickerFeatureEnabled
            isDownloadSchoolData
            isMoneySkillsAvailable
            isDataQueryAvailableForSchool
        }
    }
`;

const updateParentFeedbackFeatureForSchool = gql`
    mutation updateParentFeedbackFeatureForSchool($input: UpdateParentFeedbackFeatureForSchoolInput!) {
        updateParentFeedbackFeatureForSchool(input: $input)
    }
`;

const updateSchoolEnableReadingLogEntries = gql`
    mutation updateSchoolEnableReadingLogEntries($schoolId: String!, $enableBookNameOnlyReadingLog: Boolean!) {
        updateSchoolEnableReadingLogEntries(schoolId: $schoolId, enableBookNameOnlyReadingLog: $enableBookNameOnlyReadingLog)
    }
`;

const enableSchoolDataDownloadQuery = gql`
    mutation enableSchoolDataDownloadQuery($schoolId: String!, $isDownloadSchoolData: Boolean!) {
        enableSchoolDataDownloadQuery(schoolId: $schoolId, isDownloadSchoolData: $isDownloadSchoolData)
    }
`;

const Configuration = () => {
    const router = useRouter();
    const schoolId = router.query.school_id as string;
    const { callSnackbar, token } = useContext(ThemeContext);
    const { setClaims } = useDelegatedClaims();
    const [options, setOptions] = useState({
        parentFeedbackTickFeatureEnabledAt: false,
        isParentFeedbackReplyFeatureEnabled: false,
        isParentFeedbackStickerFeatureEnabled: false,
        enableBookNameOnlyReadingLog: false,
        isDownloadSchoolData: false
    });

    const {
        data: schoolData,
        loading: schoolLoading,
        error
    } = useQuery(getSchoolForConfiguration, {
        variables: { id: schoolId },
        skip: !schoolId || !(token?.isSchoolLeader || token?.userType === ADMIN)
    });

    useEffect(() => {
        setClaims({ schoolId });
    }, [schoolId]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const [updateParentFeedbackTickFeatureForSchoolMutation, { loading: updateParentFeedbackTickFeatureForSchoolLoading }] = useMutation(
        updateParentFeedbackFeatureForSchool
    );

    const [enableReadingLogEntriesMutation, { loading: enableReadingLogEntriesLoading }] = useMutation(updateSchoolEnableReadingLogEntries);

    const [enableSchoolDataDownloadQueryMutation, { loading: enableSchoolDataDownloadQueryLoading }] =
        useMutation(enableSchoolDataDownloadQuery);

    const schoolDetails: ILwpSchool = useMemo(() => schoolData?.getSchool, [schoolData]);

    useEffect(() => {
        if (schoolDetails) {
            setOptions({
                parentFeedbackTickFeatureEnabledAt: !!schoolDetails?.parentFeedbackTickFeatureEnabledAt,
                isParentFeedbackStickerFeatureEnabled: schoolDetails?.isParentFeedbackStickerFeatureEnabled,
                isParentFeedbackReplyFeatureEnabled: schoolDetails?.isParentFeedbackReplyFeatureEnabled,
                enableBookNameOnlyReadingLog: schoolDetails?.enableBookNameOnlyReadingLog,
                isDownloadSchoolData: schoolDetails?.isDownloadSchoolData
            });
        }
    }, [schoolDetails]);

    const handleTeacherEngagementChange = async () => {
        try {
            await updateParentFeedbackTickFeatureForSchoolMutation({
                variables: {
                    input: {
                        schoolId: schoolId,
                        enableTick: options?.parentFeedbackTickFeatureEnabledAt,
                        enableComments: options?.isParentFeedbackReplyFeatureEnabled ?? false,
                        enableStickers: options?.isParentFeedbackStickerFeatureEnabled ?? false
                    }
                }
            });
            callSnackbar('Settings updated', 'success');
        } catch (err) {
            callSnackbar(err, 'error');
        }
    };

    const handleReadingLogSetting = async () => {
        try {
            await enableReadingLogEntriesMutation({
                variables: {
                    schoolId: schoolId,
                    enableBookNameOnlyReadingLog: options?.enableBookNameOnlyReadingLog
                }
            });
            callSnackbar('Settings updated', 'success');
        } catch (err) {
            callSnackbar(err, 'error');
        }
    };

    const handleDataDownloadSetting = async () => {
        try {
            await enableSchoolDataDownloadQueryMutation({
                variables: {
                    schoolId: schoolId,
                    isDownloadSchoolData: options?.isDownloadSchoolData
                },
                refetchQueries: [
                    {
                        query: getSchoolForDashboardWrapper,
                        variables: { id: schoolId }
                    }
                ],
                awaitRefetchQueries: true
            });
            callSnackbar('Settings updated', 'success');
        } catch (err) {
            callSnackbar(err, 'error');
        }
    };

    return (
        <SchoolSettingsWrapper>
            <div className="school-configuration-page">
                <Heading1 text="Configuration" customClass="configuration-page-heading" />

                {schoolLoading ? (
                    <CommonLoading />
                ) : (
                    <div className="configuration-sections-container">
                        <div className="configuration-section">
                            <div className="teacher-engagement-header">
                                <Heading1 text="Teacher engagement" />
                                <Paragraph text="How can teachers engage with parents about their feedback?" />
                            </div>
                            <div>
                                <CommonCheckBox
                                    name="parentFeedbackTickFeatureEnabledAt"
                                    value={options?.parentFeedbackTickFeatureEnabledAt}
                                    checked={options?.parentFeedbackTickFeatureEnabledAt}
                                    onChange={() =>
                                        setOptions({
                                            ...options,
                                            parentFeedbackTickFeatureEnabledAt: !options?.parentFeedbackTickFeatureEnabledAt
                                        })
                                    }>
                                    <span>
                                        <strong>Tick</strong> (Teachers mark feedback with a tick so parent know they&#39;ve been viewed)
                                    </span>
                                </CommonCheckBox>
                                <CommonCheckBox
                                    name="isParentFeedbackStickerFeatureEnabled"
                                    value={options?.isParentFeedbackStickerFeatureEnabled}
                                    checked={options?.isParentFeedbackStickerFeatureEnabled}
                                    onChange={() =>
                                        setOptions({
                                            ...options,
                                            isParentFeedbackStickerFeatureEnabled: !options?.isParentFeedbackStickerFeatureEnabled
                                        })
                                    }>
                                    <span>
                                        <strong>Stickers</strong> (Teachers can award stickers for reading log entries and activities)
                                    </span>
                                </CommonCheckBox>
                                <CommonCheckBox
                                    name="isParentFeedbackReplyFeatureEnabled"
                                    value={options?.isParentFeedbackReplyFeatureEnabled}
                                    checked={options?.isParentFeedbackReplyFeatureEnabled}
                                    onChange={() =>
                                        setOptions({
                                            ...options,
                                            isParentFeedbackReplyFeatureEnabled: !options?.isParentFeedbackReplyFeatureEnabled
                                        })
                                    }>
                                    <span>
                                        <strong>Comments</strong> (Teachers can reply to parents’ reading log entries and activities)
                                    </span>
                                </CommonCheckBox>
                            </div>

                            <LWPButton
                                btnText="Save engagement settings"
                                onClick={handleTeacherEngagementChange}
                                loading={updateParentFeedbackTickFeatureForSchoolLoading}
                            />
                        </div>
                        <div className="configuration-section">
                            <Heading1 text="Reading" />
                            <CommonCheckBox
                                name="enableBookNameOnlyReadingLog"
                                checked={options?.enableBookNameOnlyReadingLog}
                                onChange={() =>
                                    setOptions({ ...options, enableBookNameOnlyReadingLog: !options?.enableBookNameOnlyReadingLog })
                                }
                                label="Allow parents to leave reading log entries with just a book title (without requiring comment, photo or audio)"
                            />
                            <LWPButton
                                btnText="Save reading settings"
                                onClick={handleReadingLogSetting}
                                loading={enableReadingLogEntriesLoading}
                            />
                        </div>
                        {schoolDetails?.isDataQueryAvailableForSchool ? (
                            <div className="configuration-section">
                                <Heading1 text="School data downloads" />
                                <CommonCheckBox
                                    name="isDownloadSchoolData"
                                    checked={options?.isDownloadSchoolData}
                                    onChange={() => setOptions({ ...options, isDownloadSchoolData: !options?.isDownloadSchoolData })}
                                    label="Allow data downloads by school leaders"
                                />
                                <LWPButton
                                    customClass="school-data-download-btn"
                                    btnText="Save"
                                    onClick={handleDataDownloadSetting}
                                    loading={enableSchoolDataDownloadQueryLoading}
                                />
                            </div>
                        ) : null}

                        <MoneySkillsLicenceSection schoolDetails={schoolDetails} />
                    </div>
                )}
            </div>
        </SchoolSettingsWrapper>
    );
};

export default Configuration;
