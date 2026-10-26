import { gql, useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import React, { useContext, useEffect } from 'react';

import RecommendedPupilTopics from '../../../components/PagesContent/RecommendedPupilTopics';
import { getPupil } from '../../../graphQl/queries';
import { getApolloClient } from '../../../lib/apolloClientConfig';
import { ACCESS_TOKEN_COOKIE } from '../../../shared/Constant';
import {
    checkAccessAllowedAndGetInterstitial,
    isCurrentClass,
    isPupilActiveInCurrentAcademicYear,
    ThemeContext,
    utilServerSideDeviceDetection
} from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';
import ChildDetailHeader from './../../../components/PagesContent/ChildDetailHeader';
import TodoTopicLists from './../../../components/PagesContent/TodoTopicLists';
import WelcomeChild from './../../../components/PagesContent/WelcomeChild';
import CommonLoading from './../../../components/Shared/CommonLoading';
import CommonMobileBottomNav from './../../../components/Shared/CommonMobileBottomNav';
import CommonNavTabsForPupilHome from './../../../components/Shared/CommonNavTabsForPupilHome';

const ChildDetails = () => {
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
        <div className="child-details-container">
            <ChildDetailHeader childName={pupil?.pupil?.fullname} pupil={pupil} />
            <>
                <section className="hide-on-mobile">
                    <WelcomeChild child_name={pupil?.pupil?.firstname} images={[]} subHeading={true} pupil={pupil?.pupil} />
                </section>
                <br />
                <section className="hide-on-mobile">
                    {pupil?.pupil?.currentClassOrGroupAcrossClasses && (
                        <RecommendedPupilTopics currentReadyTeddyTopicForScrapbook={pupil?.pupil?.currentReadyTeddyTopicForScrapbook} />
                    )}
                    <br />
                    <br />
                    <CommonNavTabsForPupilHome pupil={pupil} />
                    <section className="hide-on-mobile">
                        <TodoTopicLists isVideoWatched={pupil?.pupil?.parentWatchedIntroVideo} />
                    </section>
                </section>
            </>
            <section className="hide-on-desktop ">
                <CommonMobileBottomNav child_id={query?.child_id} />
            </section>
        </div>
    );
};

ChildDetails.pageType = PageType.PARENT;
ChildDetails.pageTitle = 'Child: Overview';

export default ChildDetails;

const getOnePupil = gql`
    query pupil($id: String) {
        pupil(id: $id) {
            id
            type
            isInSchoolClassOrGroupAcrossClasses
            hasTopicsInCurrentAcademicYear
            currentClass {
                id
            }
        }
    }
`;

export const getServerSideProps = async (context) => {
    const intersitialData = await checkAccessAllowedAndGetInterstitial(context);

    if (intersitialData?.redirect) {
        return intersitialData;
    }

    const isCurrentClassData = await isCurrentClass(context);
    const { isMobile } = utilServerSideDeviceDetection(context);

    if (isCurrentClassData?.redirect && !isMobile) {
        return isCurrentClassData;
    }

    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];
    const pupilId = context.query?.child_id || context.query?.pupil_id;

    if (!accessToken) {
        return {
            props: {}
        };
    }

    const client = getApolloClient();

    try {
        const { data } = await client.query({
            query: getOnePupil,
            variables: { id: pupilId }
        });

        const checkPupil = checkPupilRoute(data?.pupil, isMobile);

        if (!checkPupil) {
            const pupilRoute = pupilHome(data?.pupil, isMobile);

            return {
                redirect: {
                    destination: pupilRoute,
                    permanent: false
                }
            };
        }
    } catch (error) {
        console.error('Error fetching pupils:', error);
    }

    return {
        props: {}
    };
};

const pupilHome = (pupil, isMobile) => {
    if (pupil.type === 'BOTH') {
        return isMobile ? `/child/${pupil?.id}` : `/child/${pupil?.id}/reading`;
    } else if (pupil.type === 'TOPIC') {
        return isMobile ? `/child/${pupil?.id}` : `/child/${pupil?.id}/topics`;
    } else {
        return `/child/${pupil?.id}/reading`;
    }
};

const checkPupilRoute = (pupil, isMobile) => {
    if (pupil.type === 'BOTH') {
        return isMobile ? true : false;
    } else if (pupil.type === 'TOPIC') {
        return isMobile ? true : false;
    } else {
        return isMobile ? !isPupilActiveInCurrentAcademicYear(pupil) : false;
    }
};
