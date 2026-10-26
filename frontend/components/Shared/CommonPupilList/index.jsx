/* eslint-disable @next/next/no-img-element */
/* eslint-disable padding-line-between-statements */

import { gql, useLazyQuery } from '@apollo/client';
import { Menu } from '@mui/icons-material';
import { useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { renderPupilImg, ThemeContext } from '../../../shared/Services/handler';
import Paragraph from '../Typography/Paragraph';

const navigateToOtherChildPage = gql`
    query navigateToOtherChildPage($input: NavigateToOtherChildPageInput!) {
        navigateToOtherChildPage(input: $input) {
            id
            page
        }
    }
`;

const CommonPupilList = ({ pupils, handleMobileMenuClose, setIsSignInModalOpen, setIsAccountSettings }) => {
    const router = useRouter();
    const pathname = router?.pathname || router?.route;
    const { token } = useContext(ThemeContext);
    const theme = useTheme();
    const mdbp = useMediaQuery(theme.breakpoints.down('md'));

    const [getNavigateToOtherChildPage] = useLazyQuery(navigateToOtherChildPage);

    const navigationToOtherPupil = async (pupil, type) => {
        const currentContextId =
            type === 'READING' ? router?.query?.topicId : type === 'PUPILTOPIC' ? router?.query?.topic_id : router?.query?.activity_id;
        let newChildContextId = null;
        let newChildContextpage = null;

        if (null != currentContextId) {
            const {
                data: { navigateToOtherChildPage: data }
            } = await getNavigateToOtherChildPage({
                variables: {
                    input: {
                        targetChildId: pupil?.id,
                        currentContextId: currentContextId,
                        currentPage: type
                    }
                }
            });

            newChildContextId = data?.id;
            newChildContextpage = data?.page;
        }

        if (newChildContextId) {
            if (type === 'READING') {
                return router?.push(`/child/${pupil?.id}/reading?topicId=${newChildContextId}`);
            }

            if (type === 'PUPILTOPIC') {
                return router?.push(`/topic/${newChildContextId}`);
            }

            if (type === 'PUPILACTIVITY') {
                if (newChildContextpage === 'PUPILTOPIC') {
                    return router?.push(`/topic/${newChildContextId}`);
                }

                return router?.push(`/activity/${newChildContextId}`);
            }
        }

        return PupilHome(pupil);
    };

    const checkNavigation = (pupil) => {
        if (pupil.type === 'BOTH') {
            if (pathname === '/child/[child_id]/weeks') {
                return false;
            }

            return true;
        } else if (pupil.type === 'TOPIC') {
            const allowForTopic = [
                '/child/[child_id]',
                '/child/[child_id]/topics',
                '/child/[child_id]/trophies',
                '/child/[child_id]/history',
                '/topic/[topic_id]',
                '/activity/[activity_id]',
                '/child/[child_id]/settings'
            ];

            return allowForTopic.includes(pathname);
        } else {
            const allowForReading = [
                '/child/[child_id]/reading',
                '/child/[child_id]/weeks',
                '/child/[child_id]/trophies',
                '/child/[child_id]/settings',
                '/child/[child_id]/book-history'
            ];
            return allowForReading.includes(pathname);
        }
    };

    const PupilHome = (pupil) => {
        if (pupil.type === 'BOTH') {
            return router?.push(mdbp ? `/child/${pupil?.id}` : `/child/${pupil?.id}/reading`);
        } else if (pupil.type === 'TOPIC') {
            return router?.push(mdbp ? `/child/${pupil?.id}` : `/child/${pupil?.id}/topics`);
        } else {
            return router?.push(`/child/${pupil?.id}/reading`);
        }
    };

    const showChildDetailsMenu = async (pupil) => {
        switch (pathname) {
            case `/child/[child_id]/settings`:
                return onPupilDetails(pupil);

            case `/child/[child_id]`:
                return router?.push(`/child/${pupil?.id}`);

            case `/child/[child_id]/trophies`:
                return router?.push(`/child/${pupil?.id}/trophies`);

            case `/child/[child_id]/book-history`:
                return router?.push(`/child/${pupil?.id}/book-history`);

            case `/child/[child_id]/history`:
                return router?.push(`/child/${pupil?.id}/history`);

            case `/child/[child_id]/topics`:
                return router?.push(`/child/${pupil?.id}/topics`);

            case `/child/[child_id]/reading`:
                return navigationToOtherPupil(pupil, 'READING');

            case `/topic/[topic_id]`:
                return navigationToOtherPupil(pupil, 'PUPILTOPIC');

            case `/activity/[activity_id]`:
                return navigationToOtherPupil(pupil, 'PUPILACTIVITY');

            default:
                return router?.push(`/child/${pupil?.id}`);
        }
    };

    const onPupilClick = async (pupil) => {
        if (checkNavigation(pupil)) {
            await showChildDetailsMenu(pupil);
        } else {
            PupilHome(pupil);
        }

        handleMobileMenuClose();
    };

    const onPupilDetails = (pupil) => {
        setIsAccountSettings(false);
        token?.userTrustLevel < 2 ? setIsSignInModalOpen(true) : router?.push(`/child/${pupil?.id}/settings`);
        handleMobileMenuClose();
    };

    return (
        <div className="pupils_list">
            {pupils?.map((pupil, i) => {
                return i === 0 ? (
                    <div className="first_lists">
                        {mdbp ? (
                            <div className="list_first">
                                <div className="list">
                                    <img src={renderPupilImg(pupil)} />
                                    <Paragraph dataTest="child-switch-pupil-name" text={pupil?.firstname} />
                                </div>
                                <Menu onClick={handleMobileMenuClose} />
                            </div>
                        ) : (
                            ''
                        )}
                        <div className="list" onClick={() => onPupilDetails(pupil)}>
                            <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mathscot.svg`} />
                            <Paragraph dataTest="child-switch-pupil-name" text={`${pupil?.firstname}’s details`} />
                        </div>
                        <div className="list" onClick={() => PupilHome(pupil)}>
                            <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Home.svg`} />
                            <Paragraph dataTest="child-switch-pupil-name" text={`${pupil?.firstname}’s home`} />
                        </div>
                    </div>
                ) : (
                    <div className="list" onClick={() => onPupilClick(pupil)}>
                        <img src={renderPupilImg(pupil)} />
                        <Paragraph dataTest="child-switch-pupil-name" text={pupil?.firstname} />
                    </div>
                );
            })}
        </div>
    );
};

CommonPupilList.propTypes = {
    pupils: PropTypes.array.isRequired,
    handleMobileMenuClose: PropTypes.func,
    setIsSignInModalOpen: PropTypes.func,
    setIsAccountSettings: PropTypes.func
};

export default CommonPupilList;
