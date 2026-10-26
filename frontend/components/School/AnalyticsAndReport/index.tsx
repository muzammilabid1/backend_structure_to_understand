import { gql, useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import { useContext, useEffect, useMemo } from 'react';

import { useDelegatedClaims } from '../../../context/DelegatedClaimsContext';
import { ANALYTICS_AND_REPORTS_TABS_TYPE } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { ILwpSchool } from '../../../types/entities/ILwpSchool';
import CommonLoading from '../../Shared/CommonLoading';
import CommonTabs from '../../Shared/CommonTabs';
import Heading1 from '../../Shared/Typography/Heading1';
import ImpactReport from '../ImpactReport';
import SchoolAnalytics from '../SchoolAnalytics';
import SchoolDataDownload from './SchoolDataDownload';

const getSchool = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            isDataQueryAvailableForSchool
            isDownloadSchoolData
            schoolSubjectType
            curentPeriod {
                index
                shortName
            }
        }
    }
`;

const AnalyticsAndReport = () => {
    const router = useRouter();
    const schoolId = router?.query?.school_id as string;
    const { setClaims } = useDelegatedClaims();
    const tabType = router?.query?.type;

    const { callSnackbar } = useContext(ThemeContext);

    useEffect(() => {
        setClaims({ schoolId });
    }, [schoolId]);

    const { data, loading, error } = useQuery(getSchool, {
        variables: { id: schoolId },
        skip: !schoolId
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const schoolDetails: ILwpSchool = data?.getSchool;

    const tabs: { key: string; label: string; dataTest: string }[] = useMemo(() => {
        const tabsList = [
            {
                key: ANALYTICS_AND_REPORTS_TABS_TYPE.IMPACT_REPORT,
                label: 'Impact reports',
                dataTest: 'school-impact-reports'
            },
            {
                key: ANALYTICS_AND_REPORTS_TABS_TYPE.LIVE_DATA,
                label: 'Live data',
                dataTest: 'school-live-data'
            }
        ];

        if (schoolDetails?.isDataQueryAvailableForSchool && schoolDetails?.isDownloadSchoolData)
            tabsList.push({
                key: ANALYTICS_AND_REPORTS_TABS_TYPE.DOWNLOADS,
                label: 'Downloads',
                dataTest: 'school-data-downloads'
            });

        return tabsList;
    }, [schoolDetails]);

    const renderTabContent = () => {
        switch (tabType) {
            case ANALYTICS_AND_REPORTS_TABS_TYPE.DOWNLOADS:
                return <SchoolDataDownload schoolDetails={data?.getSchool} />;

            case ANALYTICS_AND_REPORTS_TABS_TYPE.LIVE_DATA:
                return <SchoolAnalytics />;

            default:
                return <ImpactReport />;
        }
    };

    const handleChangeTab = (index: number) => {
        const type = tabs[index].key ?? ANALYTICS_AND_REPORTS_TABS_TYPE.IMPACT_REPORT;

        router.replace(
            {
                pathname: `/school/${schoolId}/reports`,
                query: {
                    type
                }
            },
            undefined,
            { shallow: true }
        );
    };

    const activeTab = Math.max(
        tabs?.findIndex((tt) => tt.key === tabType),
        0
    );

    return (
        <div className="analytics-and-report">
            <Heading1 text="Analytics & reports" />

            <CommonTabs tebs={tabs} value={activeTab} onChange={handleChangeTab}>
                {loading ? <CommonLoading /> : renderTabContent()}
            </CommonTabs>
        </div>
    );
};

export default AnalyticsAndReport;
