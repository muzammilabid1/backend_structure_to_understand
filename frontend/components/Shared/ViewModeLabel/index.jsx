/* eslint-disable @next/next/no-img-element */
import { gql, useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { useDelegatedClaims, useDelegatedClaimsSubscriber } from '../../../context/DelegatedClaimsContext';
import { getCurrentPeriod } from '../../../graphQl/queries';
import { ADMIN, HELPER, MINIO_PUBLIC_PATHS, TEACHER } from '../../../shared/Constant';
import { ThemeContext, ViewAsEntity } from '../../../shared/Services/handler';
import LinkText from '../Typography/LinkText';

// Queries

const getUserForViewModeLable = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            type
            school {
                id
            }
        }
    }
`;

const ViewModeLable = ({ isAcademic, schoolCurrentPeriod }) => {
    const router = useRouter();
    const { schoolId: selectedSchoolIdForViewAsAdmin } = useDelegatedClaimsSubscriber();
    const { userId, childDetails, callSnackbar, token } = useContext(ThemeContext);
    const { error: getUserError, data: user } = useQuery(getUserForViewModeLable, {
        variables: { id: userId },
        fetchPolicy: 'cache-first'
    });

    const { error: periodError, data: period } = useQuery(getCurrentPeriod);

    useEffect(() => {
        periodError?.message && callSnackbar(periodError, 'error');
        getUserError?.message && callSnackbar(getUserError, 'error');
    }, [periodError, getUserError]);

    const getType = () => {
        if (token?.userTrustLevel < 2) {
            return 'Magic Link';
        } else {
            if (user?.getUser?.type !== undefined) {
                return user?.getUser?.type === TEACHER ? 'Teacher' : 'Admin';
            } else {
                return 'loading...';
            }
        }
    };

    const getRoute = (path) => {
        const newPath = path?.split('/');
        const adminRoute = '/admin';

        switch (newPath?.[1]) {
            case 'feed':
                return adminRoute + `/school/${selectedSchoolIdForViewAsAdmin}`;
            case 'lwpnews':
                return adminRoute + `/school/${selectedSchoolIdForViewAsAdmin}`;
            case 'resources':
                return adminRoute + `/school/${selectedSchoolIdForViewAsAdmin}`;
            case 'parent':
                return adminRoute + path;

            case 'child':
                return adminRoute + path;

            case 'topic':
                return adminRoute + '/pupiltopic/' + newPath?.[newPath?.length - 1];

            case 'activity':
                return adminRoute + '/pupilactivity/' + newPath?.[newPath?.length - 1];

            case 'school':
                if (['reports', 'settings', 'pupil-not-assigned', 'resources', 'feed'].some((p) => path.includes(p)))
                    return adminRoute + `/school/${newPath[2]}`;

                return adminRoute + path;

            case 'class':
                if (
                    newPath?.[newPath?.length - 1] === 'register' ||
                    newPath?.[newPath?.length - 1] === 'schedule' ||
                    newPath?.[newPath?.length - 1] === 'pupils' ||
                    newPath?.[newPath?.length - 1] === 'reading' ||
                    newPath?.[newPath?.length - 1] === 'class-details' ||
                    newPath?.[newPath?.length - 1] === 'activity-grid' ||
                    newPath?.[newPath?.length - 1] === 'readingweek' ||
                    newPath?.[newPath?.length - 1] === 'class-groups' ||
                    newPath?.[newPath?.length - 1] === 'topic'
                ) {
                    return adminRoute + '/class/' + newPath?.[newPath?.length - 2];
                }

                if (newPath?.[newPath?.length - 2] === 'topic') {
                    return adminRoute + '/classtopic/' + newPath?.[newPath?.length - 1];
                }

                return path;

            case 'pupil':
                if (newPath?.[newPath?.length - 1].startsWith('reading?topicId=')) {
                    return (
                        adminRoute +
                        '/pupiltopic/' +
                        newPath?.[newPath?.length - 1]?.split('=')[newPath?.[newPath?.length - 1]?.split('=')?.length - 1]
                    );
                }

                return adminRoute + '/child/' + newPath?.[newPath?.length - 1];

            default:
                return adminRoute + path;
        }
    };

    const { setClaims } = useDelegatedClaims();

    return (
        <div className="view_mode_container">
            {user?.getUser?.type === ADMIN ? (
                <div className="view_mode_nested_container">
                    <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mathscot.png`} alt="..." />{' '}
                    You’re currently in {ViewAsEntity(router?.asPath)} View mode.{' '}
                    <LinkText
                        text={`Return to ${getType()} pages.`}
                        onClick={() => {
                            setClaims();
                        }}
                        route={getRoute(router?.asPath)}
                        customClass={'link_text'}
                    />
                </div>
            ) : !isAcademic ? (
                <div className="view_mode_nested_container">
                    <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mathscot.png`} alt="..." />{' '}
                    You’re currently in {token?.userType === HELPER ? 'Helper' : 'Parent'} View mode.{' '}
                    <LinkText text={`Return to ${getType()} pages.`} route={`/pupil/${childDetails?.id}`} customClass={'link_text'} />
                </div>
            ) : (
                <div className="view_mode_nested_container_academic">
                    <span className="material-icons">date_range</span> You’re currently looking at the{' '}
                    {router?.query?.periodIndex && +router?.query?.periodIndex === +schoolCurrentPeriod?.index
                        ? schoolCurrentPeriod.shortName
                        : router?.query?.periodIndex
                          ? period?.['getCurrentPeriod']?.shortName
                          : schoolCurrentPeriod.shortName}{' '}
                    period.{' '}
                    <LinkText
                        customClass={'link_text'}
                        text={`Return to ${
                            router?.query?.periodIndex && +router?.query?.periodIndex === +schoolCurrentPeriod?.index
                                ? period?.['getCurrentPeriod']?.shortName
                                : router?.query?.periodIndex
                                  ? schoolCurrentPeriod?.shortName
                                  : period?.['getCurrentPeriod']?.shortName
                        } view.`}
                        route={`/school/${user?.getUser?.school?.id}?periodIndex=${
                            router?.query?.periodIndex && +router?.query?.periodIndex === +schoolCurrentPeriod?.index
                                ? period?.['getCurrentPeriod']?.index
                                : router?.query?.periodIndex
                                  ? schoolCurrentPeriod?.index
                                  : period?.['getCurrentPeriod']?.index
                        }`}
                    />
                </div>
            )}
        </div>
    );
};

ViewModeLable.propTypes = {
    isAcademic: PropTypes.bool,
    schoolCurrentPeriod: PropTypes.object
};

ViewModeLable.defaultProps = {
    isAcademic: false
};

export default ViewModeLable;
