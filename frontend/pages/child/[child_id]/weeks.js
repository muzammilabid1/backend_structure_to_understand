import { useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import React, { useContext, useEffect } from 'react';

import ChildDetailHeader from '../../../components/PagesContent/ChildDetailHeader';
import RecommendedPupilTopics from '../../../components/PagesContent/RecommendedPupilTopics';
import TodoTopicLists from '../../../components/PagesContent/TodoTopicLists';
import WelcomeChild from '../../../components/PagesContent/WelcomeChild';
import CommonLoading from '../../../components/Shared/CommonLoading';
import CommonMobileBottomNav from '../../../components/Shared/CommonMobileBottomNav';
import CommonNavTabsForPupilHome from '../../../components/Shared/CommonNavTabsForPupilHome';
import { getPupil } from '../../../graphQl/queries';
import {
    checkAccessAllowedAndGetInterstitial,
    isCurrentClass,
    isPupilActiveInCurrentAcademicYear,
    ThemeContext
} from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const ChildWeeks = () => {
    const { query, isReady } = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const {
        loading,
        error,
        data: pupil
    } = useQuery(getPupil, { variables: { id: query?.child_id }, skip: !isReady, fetchPolicy: 'cache-first' });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (loading) return <CommonLoading />;

    return (
        <div className="child-details-container" data-test={'child-weeks-page'}>
            <ChildDetailHeader childName={pupil?.pupil?.fullname} pupil={pupil} />
            <section className="hide-on-mobile child-details-wrapper">
                <div className="child-tabs-header">
                    <WelcomeChild child_name={pupil?.pupil?.firstname} images={[]} subHeading={true} pupil={pupil?.pupil} />
                    {isPupilActiveInCurrentAcademicYear(pupil?.pupil) && (
                        <RecommendedPupilTopics currentReadyTeddyTopicForScrapbook={pupil?.pupil?.currentReadyTeddyTopicForScrapbook} />
                    )}
                    <CommonNavTabsForPupilHome pupil={pupil} />
                </div>

                <TodoTopicLists isVideoWatched={pupil?.pupil?.parentWatchedIntroVideo} />
            </section>

            <section className="hide-on-desktop">
                <CommonMobileBottomNav />
            </section>
        </div>
    );
};

ChildWeeks.pageType = PageType.PARENT;
ChildWeeks.pageTitle = 'Child: Weeks';

export default ChildWeeks;

export const getServerSideProps = async (context) => {
    const intersitialData = await checkAccessAllowedAndGetInterstitial(context);

    if (intersitialData?.redirect) {
        return intersitialData;
    }

    const isCurrentClassData = await isCurrentClass(context);

    if (isCurrentClassData?.redirect) {
        return isCurrentClassData;
    }

    return {
        props: {}
    };
};
