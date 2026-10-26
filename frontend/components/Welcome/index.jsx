/* eslint-disable no-extra-boolean-cast */

import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { MobileStepper, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/system';
import { PupilParentStatus } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { MINIO_PUBLIC_PATHS, PupilType, unexpectedError } from '../../shared/Constant';
import { ThemeContext } from '../../shared/Services/handler';
import LWPButton from '../Shared/Button/LWPButton';
import CommonInterstitialHeader from '../Shared/CommonInterstitialHeader';
import CommonLoading from '../Shared/CommonLoading';
import LoginOrSignUpModal from '../Shared/Modals/LoginOrSignUpModal';
import Heading1 from '../Shared/Typography/Heading1';
import AgreementPolicy from './AgreementPolicy';
import PreviousMathscot from './PreviousMathscot';
import WelcomeInfo from './WelcomeInfo';

// Steps
const STEP_TOPIC = {
    type: 'topic',
    content: (
        <WelcomeInfo
            maxWidth={1026}
            heading={'How our topics and activities work'}
            beforeImg={'interstitials_img4.png'}
            heading1={'Learn with your child'}
            text1={'Your child’s teacher will send you videos to watch and activites to do together'}
            heading2={'Share with your teacher'}
            text2={'Send comments and photos to your child’s teacher through the platform'}
            heading3={'Make your mathscot'}
            text3={'Create a unique character; add new items when you complete activities'}
            afterImg1={'interstitials_img_6.png'}
            aftherImg2={'interstitials_img_7.png'}
            aftherImg3={'interstitials_img_8.png'}
        />
    )
};

const STEP_READY_TEDDY = {
    type: 'readyTeddy',
    content: (
        <WelcomeInfo
            maxWidth={1026}
            showColumnImages
            heading={'How our Ready Teddy activities work'}
            beforeImg={'teddy_with_background.svg'}
            heading1={'Receive a teddy for your child'}
            text1={'Your child will receive their own teddy to help them get ready for school.'}
            heading2={'Receive a link by SMS or email'}
            text2={'You\u2019ll receive a notification when it\u2019s time for a new activity'}
            heading3={'Learn with your child'}
            text3={'Your child\u2019s teacher will send you videos to watch and activities to do together with teddy.'}
            heading4={'Share with your teacher'}
            text4={'Send comments and photos to your child\u2019s teacher through the platform.'}
            afterImg1={'/assets/images/ready-teddy-welcome/ready-teddy-welcome-1.svg'}
            aftherImg2={'/assets/images/ready-teddy-welcome/ready-teddy-welcome-2.svg'}
            aftherImg3={'/assets/images/ready-teddy-welcome/ready-teddy-welcome-3.svg'}
            afterImg4={'/assets/images/ready-teddy-welcome/ready-teddy-welcome-4.svg'}
        />
    )
};

const STEP_READING_LOG = {
    type: 'readonly',
    content: (
        <WelcomeInfo
            heading={'How our digital reading log works'}
            beforeImg={'interstitial-digital-reading-log.png'}
            text1={'Read with your child at home.'}
            text2={"Add comments / audio clips / photos in the reading log to share with your child's teacher."}
            afterImg1={'interstitial_digital-reading-log-separate-01.png'}
            aftherImg2={'interstitial_digital-reading-log-separate-02.png'}
        />
    )
};

// Queries

const getPupilParentForWelcomeChild = gql`
    query getPupilParent($pupilParentId: String!) {
        getPupilParent(pupilParentId: $pupilParentId) {
            id
            status
            parent {
                id
                firstname
                lastname
                userStatus
                watchedIntroVideo
            }
            pupil {
                id
                firstname
                lastname
                fullname
                type
                previousMathscotImage
                currentMathscot {
                    id
                }
                school {
                    termsAndConditions
                    privacyPolicy
                    schoolName
                    logo
                }
                currentClassOrGroupAcrossClasses {
                    name
                    isReadyTeddyEnabled
                    isPreAdmissionClass
                }
            }
            rejectMagicLink
            showInterstitial
            interstitialContext {
                isReadingSectionShown
                isTopicsSectionShown
            }
        }
    }
`;

const GET_UNSEEN_FEATURE_TOOLTIPS_FOR_WELCOME_PAGE = gql`
    query getUnseenFeatureTooltips {
        getUnseenFeatureTooltips {
            id
            targetId
            message
            order
            imageUrl
        }
    }
`;

// Mutations

const acceptPupilInvitationForWelcomeChild = gql`
    mutation acceptPupilInvitation(
        $parentId: String!
        $pupilId: String!
        $isTopicsSectionShown: Boolean!
        $isReadingSectionShown: Boolean!
    ) {
        acceptPupilInvitation(
            parentId: $parentId
            pupilId: $pupilId
            isTopicsSectionShown: $isTopicsSectionShown
            isReadingSectionShown: $isReadingSectionShown
        ) {
            id
        }
    }
`;

const WelcomeChild = () => {
    const searchParams = useSearchParams();
    const queryParams = useParams();
    const router = useRouter();

    const { callSnackbar, token } = useContext(ThemeContext);
    const theme = useTheme();
    const smbp = useMediaQuery(theme.breakpoints.down('md'));

    const formikRef = useRef();

    const [steps, setSteps] = useState([]);
    const [openModal, setModalOpen] = useState(false);
    const [stepper, setStepper] = useState(0);

    const {
        loading: pupilParentLoading,
        error: pupilParentError,
        data: pupilParentData
    } = useQuery(getPupilParentForWelcomeChild, {
        variables: { pupilParentId: queryParams?.pupilParentId },
        skip: !queryParams?.pupilParentId
    });

    const [fetchTooltips] = useLazyQuery(GET_UNSEEN_FEATURE_TOOLTIPS_FOR_WELCOME_PAGE);

    // Build steps array depending on pupil type and sections already seen by parent
    useEffect(() => {
        if (null == pupilParentData) {
            return;
        }

        const { pupil, showInterstitial, interstitialContext } = pupilParentData.getPupilParent;
        const { isReadingSectionShown, isTopicsSectionShown } = interstitialContext;

        // If the user has not yet seen the section OR they are forced to see it again (maybe after school period is updated)
        const shouldSeeTopicSection = [PupilType.BOTH, PupilType.TOPIC].includes(pupil.type) && (!isTopicsSectionShown || showInterstitial);
        const shouldSeeReadingSection =
            [PupilType.BOTH, PupilType.READING].includes(pupil.type) && (!isReadingSectionShown || showInterstitial);

        const tempSteps = [];

        if (shouldSeeTopicSection) {
            const isRTPreadmission =
                pupil.currentClassOrGroupAcrossClasses?.isReadyTeddyEnabled && pupil.currentClassOrGroupAcrossClasses?.isPreAdmissionClass;
            tempSteps.push(isRTPreadmission ? STEP_READY_TEDDY : STEP_TOPIC);
        }

        if (shouldSeeReadingSection) {
            tempSteps.push(STEP_READING_LOG);
        }

        if (0 === tempSteps.length) {
            redirect();

            return;
        }

        if (pupil.previousMathscotImage && !pupil?.currentMathscot) {
            tempSteps.push({
                type: 'mathscot',
                content: <PreviousMathscot previousMathscotImage={pupilParentData?.getPupilParent?.pupil?.previousMathscotImage} />
            });
        }

        // Show only if the parent haven't seen topic AND reading log sections
        tempSteps.push({
            type: 'agreement',
            content: (
                <AgreementPolicy
                    onSubmitHandler={onSubmitHandler}
                    formikRef={formikRef}
                    termsAndConditions={termsAndConditions}
                    privacyPolicy={privacyPolicy}
                />
            )
        });

        setSteps(tempSteps);
    }, [pupilParentData]);

    useEffect(() => {
        pupilParentError?.message && callSnackbar(pupilParentError, 'error');
    }, [pupilParentError]);

    function redirect() {
        if (searchParams.get('magicLink')) {
            router.push({ pathname: `/magic/${searchParams.get('magicLink')}` });

            return;
        }

        if (searchParams.get('nextRoute')) {
            if (router?.asPath) {
                let [path, queryString] = router.asPath.split('nextRoute=');

                if (queryString) {
                    [path, queryString] = queryString.split('?');
                }

                router.push({ pathname: path, search: queryString ? `?${queryString}` : '' });
            }

            return;
        }

        router.push({ pathname: `/child/${pupilParentData?.getPupilParent?.pupil?.id}` });

        if (token?.sub) fetchTooltips();
    }

    const [acceptPupilInvitationMutation, { loading: acceptPupilInvitationLoading }] = useMutation(acceptPupilInvitationForWelcomeChild);

    const onSubmitHandler = async () => {
        if (null == pupilParentData) {
            return;
        }

        try {
            const { parent, pupil } = pupilParentData.getPupilParent;

            await acceptPupilInvitationMutation({
                variables: {
                    parentId: parent.id,
                    pupilId: pupil.id,
                    isTopicsSectionShown: [PupilType.BOTH, PupilType.TOPIC].includes(pupil.type),
                    isReadingSectionShown: [PupilType.BOTH, PupilType.READING].includes(pupil.type)
                }
            });
            callSnackbar('Pupil invitation accepted!', 'success');

            redirect();
        } catch (error) {
            const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

            if (statusCode) {
                callSnackbar(error, 'error');
            } else {
                window.newrelic?.noticeError(error, { caught: true, handled: false });
                callSnackbar(unexpectedError, 'error');
            }
        }
    };

    const isInvited = pupilParentData?.getPupilParent?.status === PupilParentStatus.INVITED;
    const termsAndConditions = pupilParentData?.getPupilParent?.pupil?.school?.termsAndConditions;
    const privacyPolicy = pupilParentData?.getPupilParent?.pupil?.school?.privacyPolicy;

    const isLastStep = steps.length <= stepper + 1;

    const backGroundImg = (type) => {
        const imageMap = {
            readonly: smbp ? 'mask-un-reading' : 'mask-reading',
            topic: smbp ? 'mask-un-fullProgram' : 'mask-fullProgram',
            readyTeddy: smbp ? 'mask-un-readyTeddy' : 'mask-readyTeddy',
            default: smbp ? 'mask-un-default' : 'mask-default'
        };

        return imageMap[type] || imageMap.default;
    };

    if (pupilParentLoading) return <CommonLoading />;

    return (
        <div className={`interstitials-container ${backGroundImg(steps[stepper]?.type)}`}>
            <div className="interstitials_Card_wrapper">
                <div className="interstitials_Card">
                    <CommonInterstitialHeader
                        schoolLogo={
                            pupilParentData?.getPupilParent?.pupil?.school?.logo
                                ? pupilParentData?.getPupilParent?.pupil?.school?.logo
                                : null
                        }
                        schoolName={pupilParentData?.getPupilParent?.pupil?.school?.schoolName}
                        headerText={
                            isInvited
                                ? `Join ${pupilParentData?.getPupilParent?.pupil?.firstname} on Learning with Parents`
                                : `Welcome back to Learning with Parents`
                        }
                        pupilName={
                            !isInvited && pupilParentData?.getPupilParent?.pupil?.currentClassOrGroupAcrossClasses?.name
                                ? `${pupilParentData?.getPupilParent?.pupil?.firstname} is in ${pupilParentData?.getPupilParent?.pupil?.currentClassOrGroupAcrossClasses?.name} this year`
                                : null
                        }
                    />

                    {isInvited && (
                        <div className="interstitial-confirm-invitation">
                            <Heading1
                                centerText
                                text={`This invitation is for ${pupilParentData?.getPupilParent?.parent?.firstname} ${pupilParentData?.getPupilParent?.parent?.lastname} to work with ${pupilParentData?.getPupilParent?.pupil?.fullname}`}
                            />
                            <div className="interstitials_notCorrect">
                                <u onClick={() => setModalOpen(true)}>Not correct?</u>
                            </div>
                        </div>
                    )}

                    {steps[stepper]?.content}
                    <MobileStepper steps={steps.length ?? 0} position="static" activeStep={stepper} className="interstitials-stepper" />

                    <div className={`interstitials_btn ${!!stepper ? 'marleft' : ''}`}>
                        {!!stepper && (
                            <LWPButton
                                btnText="Previous"
                                startIcon={!smbp && 'navigate_before'}
                                color="inherit"
                                variant={smbp ? 'contained' : 'text'}
                                onClick={() => setStepper(stepper - 1)}
                                disabled={acceptPupilInvitationLoading}
                            />
                        )}
                        <LWPButton
                            btnText={isLastStep ? (isInvited ? 'Get started' : 'Let’s go') : 'Next'}
                            loading={acceptPupilInvitationLoading}
                            onClick={() => {
                                if (isLastStep) {
                                    formikRef.current.handleSubmit();
                                } else {
                                    setStepper(stepper + 1);
                                }
                            }}
                            dataTest={'interstitial-next-btn'}
                        />
                    </div>
                </div>
            </div>

            {openModal && (
                <LoginOrSignUpModal
                    open={openModal}
                    setOpen={() => setModalOpen(false)}
                    heading="Not meant for you?"
                    subHeading="If this invitation was not intended for you, or this is not your child, please click the button below to let us know. (If you are working with another child on Learning with Parents that will not be affected.)"
                    primaryBtnHandler={() => {
                        router?.replace({ pathname: `/magic/${pupilParentData?.getPupilParent?.rejectMagicLink}` });
                    }}
                    primaryBtnText="Reject this invitation"
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    className="welcomepage_modal"
                />
            )}
        </div>
    );
};

export default WelcomeChild;
