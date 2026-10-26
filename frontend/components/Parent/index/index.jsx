/* eslint-disable @next/next/no-img-element */
import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { logout, reInviteParent } from '../../../graphQl/mutations';
import { getPupilInvitationsForChild } from '../../../graphQl/queries';
import { clearCookiesOnly, getCookie } from '../../../lib/manageCookies';
import { MINIO_PUBLIC_PATHS, PupilType, REFRESH_TOKEN_COOKIE } from '../../../shared/Constant';
import { getChildRoute, isReadyTeddyEnabledClassOnly, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../../Shared/Button/LWPButton';
import LoginOrSignUpModal from '../../Shared/Modals/LoginOrSignUpModal';
import Heading3 from '../../Shared/Typography/Heading3';
import ChildCard from './../../Shared/Cards/ChildCard';
import CommonCard from './../../Shared/Cards/CommonCard';
import CommonLoading from './../../Shared/CommonLoading';
import Heading1 from './../../Shared/Typography/Heading1';
import Paragraph from './../../Shared/Typography/Paragraph';
import InactivePupil from './InactivePupil';

const getPupils = gql`
    query getPupils($parentId: String!, $isActiveInCurrentAcademic: Boolean!) {
        getPupils(parentId: $parentId, isActiveInCurrentAcademic: $isActiveInCurrentAcademic) {
            id
            fullname
            firstname
            yearGroup
            parents {
                id
                pupilId
                parentId
                status
                showInterstitial
            }
            currentClassOrGroupAcrossClasses {
                name
                yearGroup {
                    year
                }
                isFullProgramme
                IsReadingLogsEnabled
                isPreAdmissionClass
                isReadyTeddyEnabled
            }
            type
            school {
                schoolName
            }
            currentMathscot {
                character
                colour
            }
            mathscotUrl {
                thumbnailImage
            }
        }
    }
`;

const Child = () => {
    const { callSnackbar, token, setToken } = useContext(ThemeContext);
    const queryParams = useParams();
    const router = useRouter();
    const client = useApolloClient();

    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
    const [reInviteParentMutation] = useMutation(reInviteParent);
    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [selectedPupilId, setSelectedPupilId] = useState(null);

    const {
        loading: pupilInvitationsLoading,
        error: pupilInvitationsError,
        data: pupilInvitationData
    } = useQuery(getPupilInvitationsForChild, {
        variables: { id: queryParams?.user_id },
        skip: !router?.isReady
    });

    const {
        loading,
        error,
        data: pupils
    } = useQuery(getPupils, {
        variables: { parentId: queryParams?.user_id, isActiveInCurrentAcademic: true },
        skip: !router?.isReady
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        pupilInvitationsError?.message && callSnackbar(pupilInvitationsError, 'error');
    }, [pupilInvitationsError]);

    const getMathscotUrl = (pupil) => {
        const IsReadingLogsEnabled = pupil?.type === PupilType.READING;

        if (IsReadingLogsEnabled) {
            return `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Book_Open_Purple.png`;
        }

        if (isReadyTeddyEnabledClassOnly(pupil?.currentClassOrGroupAcrossClasses))
            return (
                pupil?.mathscotUrl?.thumbnailImage ||
                `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/teddy.png`
            );

        return pupil?.mathscotUrl?.thumbnailImage;
    };

    const handleActiveUser = async () => {
        if (getCookie(REFRESH_TOKEN_COOKIE)) {
            await logoutMutation().catch(({ ...err }) => callSnackbar(err, 'error'));
        }

        clearCookiesOnly();
        setToken(null);
        client.clearStore();
        router?.replace(`/child/${selectedPupilId}/settings`);
    };
    const handleInvitedUser = (userId, source_type, source) => {
        reInviteParentMutation({ variables: { parentId: userId } });
        router?.replace({
            pathname: '/check-your-email-or-phone/invited-user',
            query: {
                source,
                source_type
            }
        });
    };

    if (loading || pupilInvitationsLoading) return <CommonLoading />;

    return (
        <div className="child-container" data-test={'parent-children-page'}>
            {pupils?.getPupils?.length === 0 && pupilInvitationData?.getPupilInvitations?.length === 0 ? (
                <div className="empty-childs">
                    <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-yay.png`} alt="" />
                    <Heading1 text="You have no children currently registered on this site" centerText />
                    <Paragraph
                        text={
                            <>
                                You will need an invitation from your school or setting to add your child to this account. If you wish to
                                close your parent account, you can do so from the <Link href={'/settings'}>Account Details</Link> page.
                            </>
                        }
                        centerText
                        customClass="pb10"
                    />
                </div>
            ) : (
                <>
                    {pupils?.getPupils?.length > 0 || pupilInvitationData?.getPupilInvitations?.length > 0 ? (
                        <Heading1 text="Select your child" centerText customClass="child-main-heading" />
                    ) : null}

                    {pupilInvitationData?.getPupilInvitations?.length > 0 && (
                        <div className="invited-child-container">
                            <div className="invited-child-header-top">
                                <div className="invited-child-header-image">
                                    <img src="/assets/images/invited-child-header-image.png" />
                                </div>
                                <Heading1 text="Waiting for you to confirm" />
                            </div>
                            {(pupilInvitationData?.getPupilInvitations || [])?.map((pupilInvitation) => (
                                <div className="invited-child-header-bottom">
                                    <CommonCard cardContentClassName="card">
                                        <div
                                            className="invited-child-detail-container"
                                            data-test={`invited-child-card-${pupilInvitation?.pupil?.firstname}`}>
                                            <div className="invited-child-details">
                                                <Heading3
                                                    text={`${pupilInvitation?.pupil?.firstname} ${pupilInvitation?.pupil?.lastname}`}
                                                />
                                                <Paragraph text={pupilInvitation?.pupil?.school?.schoolName} />
                                            </div>
                                            <div className="invited-child-button">
                                                <LWPButton btnText="View" startIcon="visibility" href={`/welcome/${pupilInvitation?.id}`} />
                                            </div>
                                        </div>
                                    </CommonCard>
                                </div>
                            ))}
                        </div>
                    )}

                    <Grid container spacing={3} classes={{ root: 'child-cards' }}>
                        {pupils?.getPupils?.map((pupil) => {
                            return (
                                <ChildCard
                                    key={pupil.id}
                                    childImg={getMathscotUrl(pupil)}
                                    imageContainerClass="child_img_container"
                                    childName={pupil.firstname}
                                    editIcon
                                    editHandler={() => {
                                        if (token?.userTrustLevel < 2) {
                                            setSelectedPupilId(pupil?.id);
                                            setIsSignInModalOpen(true);
                                        } else {
                                            router?.push(`/child/${pupil?.id}/settings`);
                                        }
                                    }}
                                    popup
                                    cardHandler={() => router?.push(getChildRoute(pupil))}
                                    type={'OTHER'}
                                    dataTest={`child-card`}
                                />
                            );
                        })}
                    </Grid>

                    {isSignInModalOpen && (
                        <LoginOrSignUpModal
                            open={isSignInModalOpen}
                            setOpen={() => {
                                setIsSignInModalOpen(false);
                                setSelectedPupilId(null);
                            }}
                            heading={`${token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'} to access this section`}
                            subHeading={`Please ${token?.status === 'ACTIVE' ? 'log in' : 'sign up'} to access child details section`}
                            primaryBtnText={token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'}
                            primaryBtnHandler={() => {
                                if (token?.status === 'ACTIVE') {
                                    handleActiveUser();
                                    setSelectedPupilId(null);
                                } else {
                                    handleInvitedUser(token.sub, token?.email ? 'email' : 'number', token?.email || token?.phoneNumber);
                                    setSelectedPupilId(null);
                                }
                            }}
                        />
                    )}
                </>
            )}

            <InactivePupil />
        </div>
    );
};

export default Child;
