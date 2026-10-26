import { useQuery } from '@apollo/client';
import { useTheme } from '@mui/material';
import { useMediaQuery } from '@mui/system';
import gql from 'graphql-tag';
import { useRouter } from 'next/router';
import { useContext, useEffect } from 'react';

import RecommendedPupilTopics from '../../../components/PagesContent/RecommendedPupilTopics';
import {
    checkAccessAllowedAndGetInterstitial,
    isCurrentClass,
    isPupilActiveInCurrentAcademicYear,
    ThemeContext
} from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';
import ChildDetailHeader from './../../../components/PagesContent/ChildDetailHeader';
import MyAchievements from './../../../components/PagesContent/MyAchievements';
import WelcomeChild from './../../../components/PagesContent/WelcomeChild';
import CommonLoading from './../../../components/Shared/CommonLoading';
import CommonMobileBottomNav from './../../../components/Shared/CommonMobileBottomNav';
import CommonNavTabsForPupilHome from './../../../components/Shared/CommonNavTabsForPupilHome';

// Queries
const getPupilForChildAchievements = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
            fullname
            firstname
            previousMathscotImage
            isActiveInCurrentAcademicYear
            isInSchoolClassOrGroupAcrossClasses
            hasTopicsInCurrentAcademicYear
            currentClassOrGroupAcrossClasses {
                id
                isReadyTeddyEnabled
                isPreAdmissionClass
                isFullProgramme
                IsReadingLogsEnabled
            }
            parentWatchedIntroVideo
            currentMathscot {
                character
                colour
            }
            type
            mathscotUrl {
                bigImage
                thumbnailImage
            }
            currentReadyTeddyTopicForScrapbook {
                id
                scrapbookPrompt
                haveScrapbookEntry
            }
        }
    }
`;

const ChildAchievements = () => {
    const { query, isReady } = useRouter();

    const { callSnackbar } = useContext(ThemeContext);
    const theme = useTheme();

    const isOnMobile = useMediaQuery(theme.breakpoints.down('md'));

    const {
        loading,
        error,
        data: pupil
    } = useQuery(getPupilForChildAchievements, { variables: { id: query?.child_id }, skip: !isReady, fetchPolicy: 'cache-first' });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (loading) return <CommonLoading />;

    return (
        <div className="child-details-container" data-test={'child-awards-page'}>
            <ChildDetailHeader childName={pupil?.pupil?.fullname} pupil={pupil} />

            {isOnMobile ? (
                <section className="hide-on-desktop">
                    <CommonMobileBottomNav />
                </section>
            ) : (
                <section className="hide-on-mobile child-details-wrapper">
                    <div className="child-tabs-header">
                        <WelcomeChild child_name={pupil?.pupil?.firstname} images={[]} subHeading={true} pupil={pupil?.pupil} />
                        {isPupilActiveInCurrentAcademicYear(pupil?.pupil) && (
                            <RecommendedPupilTopics currentReadyTeddyTopicForScrapbook={pupil?.pupil?.currentReadyTeddyTopicForScrapbook} />
                        )}
                        <CommonNavTabsForPupilHome pupil={pupil} />
                    </div>
                    <MyAchievements
                        images={[
                            {
                                imgPath: pupil?.pupil?.mathscotUrl?.bigImage || ''
                            }
                        ]}
                        pupil={pupil}
                    />
                </section>
            )}
        </div>
    );
};

ChildAchievements.pageType = PageType.PARENT;
ChildAchievements.pageTitle = 'Child: Trophies';

export default ChildAchievements;

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
