import { useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { getPupil } from '../../../graphQl/queries';
import { isMobileScreen, isPupilActiveInCurrentAcademicYear, ThemeContext } from '../../../shared/Services/handler';
import HistoryItems from '../../PagesContent/HistoryItems';
import MyAchievements from '../../PagesContent/MyAchievements';
import RecommendedPupilTopics from '../../PagesContent/RecommendedPupilTopics';
import TodoTopicLists from '../../PagesContent/TodoTopicLists';
import WelcomeChild from '../../PagesContent/WelcomeChild';
import ChildReview from '../../Parent/ChildReview';
import MobileBottomNav from '../../Parent/MobileBottomNav';
import Scrapbook from '../../Parent/Scrapbook';
import ReadingLog from '../../Parent/ReadingLog';
import CommonLoading from '../CommonLoading';
import NotActiveThisYearBanner from '../NotActiveThisYearBanner';

const CommonMobileBottomNav = () => {
    const queryParams = useParams();
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [bottomNavValue, setBottomNavValue] = useState('home');

    const {
        loading,
        error,
        data: pupil
    } = useQuery(getPupil, { variables: { id: queryParams?.child_id }, skip: !router?.isReady, fetchPolicy: 'cache-first' });

    useEffect(() => {
        const newPath = router?.route?.split('/');

        switch (newPath?.[newPath?.length - 1]) {
            case 'topics':
                setBottomNavValue('topics');
                break;

            case 'trophies':
                setBottomNavValue(isMobileScreen() ? 'review' : 'trophies');
                break;

            case 'history':
                setBottomNavValue(isMobileScreen() ? 'review' : 'history');
                break;

            case 'book-history':
                setBottomNavValue(isMobileScreen() ? 'review' : 'book-history');
                break;

            case 'scrapbook':
                setBottomNavValue('scrapbook');
                break;

            case 'weeks':
                setBottomNavValue('weeks');
                break;

            case 'reading':
                setBottomNavValue('reading');
                break;

            default:
                setBottomNavValue('home');
                break;
        }
    }, [pupil?.pupil?.type]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const tabSwitchingHanlder = (_, newValue) => {
        if (newValue === 'home') {
            router?.push(`/child/${queryParams?.child_id}`);
        } else if (newValue === 'review') {
            router?.push(`/child/${queryParams?.child_id}/trophies`);
        } else {
            router?.push(`/child/${queryParams?.child_id}/${newValue}`);
        }
    };

    if (loading) return <CommonLoading />;

    return (
        <>
            {bottomNavValue === 'home' && (
                <>
                    <div className="home_page_heading">
                        <WelcomeChild subHeading={false} child_name={pupil?.pupil?.firstname} images={[]} />
                    </div>
                    {isPupilActiveInCurrentAcademicYear(pupil?.pupil) ? (
                        <RecommendedPupilTopics currentReadyTeddyTopicForScrapbook={pupil?.pupil?.currentReadyTeddyTopicForScrapbook} />
                    ) : (
                        <NotActiveThisYearBanner className="inactive-message" />
                    )}
                </>
            )}
            {(bottomNavValue === 'weeks' || bottomNavValue === 'topics') && (
                <TodoTopicLists isMobile isTopic isVideoWatched={pupil?.pupil?.parentWatchedIntroVideo} />
            )}
            {bottomNavValue === 'reading' && <ReadingLog />}
            {bottomNavValue === 'trophies' && (
                <MyAchievements
                    images={[
                        {
                            imgPath: pupil?.pupil?.mathscotUrl?.bigImage || ''
                        }
                    ]}
                    pupil={pupil}
                />
            )}
            {bottomNavValue === 'history' && <HistoryItems />}
            {bottomNavValue === 'scrapbook' && (
                <Scrapbook pupilId={queryParams?.child_id} pupilTopicId={pupil?.pupil?.currentReadyTeddyTopicForScrapbook?.id} />
            )}
            {bottomNavValue === 'review' && <ChildReview />}

            <div className="mobile-bottom-nav">
                <MobileBottomNav value={bottomNavValue} onChange={tabSwitchingHanlder} pupil={pupil} />
            </div>
        </>
    );
};

export default CommonMobileBottomNav;
