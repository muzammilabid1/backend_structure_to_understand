import { gql, useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect } from 'react';

import RecommendedPupilTopics from '../../../components/PagesContent/RecommendedPupilTopics';
import ReadingLog from '../../../components/Parent/ReadingLog';
import CommonStatus from '../../../components/Shared/CommonStatus';
import { getPupil } from '../../../graphQl/queries';
import { getApolloClient } from '../../../lib/apolloClientConfig';
import { ACCESS_TOKEN_COOKIE, MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import {
    checkAccessAllowedAndGetInterstitial,
    isCurrentClass,
    isPupilActiveInCurrentAcademicYear,
    ThemeContext
} from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';
import ChildDetailHeader from './../../../components/PagesContent/ChildDetailHeader';
import WelcomeChild from './../../../components/PagesContent/WelcomeChild';
import CommonLoading from './../../../components/Shared/CommonLoading';
import CommonMobileBottomNav from './../../../components/Shared/CommonMobileBottomNav';
import CommonNavTabsForPupilHome from './../../../components/Shared/CommonNavTabsForPupilHome';

const ChildReading = () => {
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const {
        loading,
        error,
        data: pupil
    } = useQuery(getPupil, { variables: { id: router?.query?.child_id }, skip: !router?.isReady, fetchPolicy: 'cache-first' });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (error)
        return (
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-oops.png`}
                imageAlt="Mathscot with hands over eyes"
                heading="Oops! Pupil not found"
                buttonText="Back to the homepage"
                onClick={() => router?.push('/')}
            />
        );

    if (loading) return <CommonLoading />;

    return (
        <div className="child-details-container" data-test={'child-reading-log-page'}>
            <ChildDetailHeader childName={pupil?.pupil?.fullname} pupil={pupil} />

            <section className="hide-on-mobile child-details-wrapper">
                <div className="child-tabs-header">
                    <WelcomeChild child_name={pupil?.pupil?.firstname} images={[]} subHeading={false} />
                    {isPupilActiveInCurrentAcademicYear(pupil?.pupil) && (
                        <RecommendedPupilTopics currentReadyTeddyTopicForScrapbook={pupil?.pupil?.currentReadyTeddyTopicForScrapbook} />
                    )}
                    <CommonNavTabsForPupilHome pupil={pupil} />
                </div>
                <ReadingLog />
            </section>

            <section className="hide-on-desktop">
                <CommonMobileBottomNav />
            </section>
        </div>
    );
};

ChildReading.pageType = PageType.PARENT;
ChildReading.pageTitle = 'Child: Reading';

export default ChildReading;

const getReadingTopicsReadingLog = gql`
    query getReadingTopics($pupilId: String!) {
        getReadingTopics(pupilId: $pupilId) {
            id
        }
    }
`;

export const getServerSideProps = async (context) => {
    const intersitialData = await checkAccessAllowedAndGetInterstitial(context);

    if (intersitialData?.redirect) {
        return intersitialData;
    }

    const isCurrentClassData = await isCurrentClass(context);

    if (isCurrentClassData?.redirect) {
        return isCurrentClassData;
    }

    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];

    const { topicId, child_id, pupil_id } = context.query;

    const pupilId = child_id || pupil_id;

    if (!accessToken) {
        return {
            props: {}
        };
    }

    try {
        const client = getApolloClient();

        const { data: pupilReadingTopics } = await client.query({
            query: getReadingTopicsReadingLog,
            variables: { pupilId }
        });

        const topics = pupilReadingTopics?.getReadingTopics;
        const pathWithoutQueryParams = context?.resolvedUrl.split('?')[0];

        if (topics && topics.length > 0) {
            const defaultRedirect = {
                redirect: {
                    destination: `${pathWithoutQueryParams}?topicId=${topics?.[0]?.id}`,
                    permanent: false
                }
            };

            if (topicId) {
                // Check if the provided topicId exists among the topics
                const topicExists = topics.some(({ id }) => id == topicId);

                if (!topicExists) return defaultRedirect; // Redirect if topicId does not exist
            } else {
                // If no topicId is provided, redirect to the first topic
                return defaultRedirect;
            }
        }
    } catch (error) {
        console.error('Error fetching pupils:', error);
    }

    return {
        props: {}
    };
};
