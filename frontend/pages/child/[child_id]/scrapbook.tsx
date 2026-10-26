/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import React, { useContext, useEffect } from 'react';

import ChildDetailHeader from '../../../components/PagesContent/ChildDetailHeader';
import RecommendedPupilTopics from '../../../components/PagesContent/RecommendedPupilTopics';
import WelcomeChild from '../../../components/PagesContent/WelcomeChild';
import Scrapbook from '../../../components/Parent/Scrapbook';
import CommonLoading from '../../../components/Shared/CommonLoading';
import CommonMobileBottomNav from '../../../components/Shared/CommonMobileBottomNav';
import CommonNavTabsForPupilHome from '../../../components/Shared/CommonNavTabsForPupilHome';
import { getPupil } from '../../../graphQl/queries';
import {
    checkAccessAllowedAndGetInterstitial,
    handleErrorSnackbar,
    isCurrentClass,
    isPupilActiveInCurrentAcademicYear,
    ThemeContext
} from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const ScrapbookPage = () => {
    const { query, isReady } = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const {
        loading,
        error,
        data: pupil
    } = useQuery(getPupil, { variables: { id: query?.child_id }, skip: !isReady, fetchPolicy: 'cache-first' });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    if (loading) return <CommonLoading />;

    return (
        <div className="child-details-container" data-test="child-scrapbook-page">
            <ChildDetailHeader childName={pupil?.pupil?.fullname} pupil={pupil} />

            <section className="hide-on-mobile child-details-wrapper">
                <div className="child-tabs-header">
                    <WelcomeChild child_name={pupil?.pupil?.firstname} images={[]} subHeading={true} pupil={pupil?.pupil} />
                    {isPupilActiveInCurrentAcademicYear(pupil?.pupil) && (
                        <RecommendedPupilTopics currentReadyTeddyTopicForScrapbook={pupil?.pupil?.currentReadyTeddyTopicForScrapbook} />
                    )}
                    <CommonNavTabsForPupilHome pupil={pupil} />
                </div>
                <Scrapbook pupilId={query?.child_id as string} pupilTopicId={pupil?.pupil?.currentReadyTeddyTopicForScrapbook?.id} />
            </section>

            <section className="hide-on-desktop">
                <CommonMobileBottomNav />
            </section>
        </div>
    );
};

ScrapbookPage.pageType = PageType.PARENT;
ScrapbookPage.pageTitle = 'Child: Scrapbook';

export default ScrapbookPage;

export const getServerSideProps = async (context: any) => {
    const intersitialData: any = await checkAccessAllowedAndGetInterstitial(context);

    if (intersitialData?.redirect) {
        return intersitialData;
    }

    const isCurrentClassData: any = await isCurrentClass(context);

    if (isCurrentClassData?.redirect) {
        return isCurrentClassData;
    }

    return {
        props: {}
    };
};
