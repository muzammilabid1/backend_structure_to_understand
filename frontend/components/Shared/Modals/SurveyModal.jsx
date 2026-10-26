/* eslint-disable @next/next/no-img-element */
import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { setCookie } from '../../../lib/manageCookies';
import { MINIO_PUBLIC_PATHS, TEACHER } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { getTypeFormValuesFromContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import CommonCheckBox from '../CommonCheckBox';
import CommonLoading from '../CommonLoading';
import Heading1 from '../Typography/Heading1';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import DialogWrapper from './../DialogWrapper';

// Queries

const getUserForSurveyModal = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            showInterstitial {
                heading
                text
                optedOut
                showQuestion
                averageTime
                context {
                    estimatedTime
                    numOfQuestions
                }
            }
        }
    }
`;

// Mutations

const changeOptedOutStatus = gql`
    mutation changeOptedOutStatus($id: String!, $optedOut: Boolean!) {
        changeOptedOutStatus(id: $id, optedOut: $optedOut)
    }
`;

const SurveyModal = ({ open, setOpen, viewType, feedbackRedirectUrl }) => {
    const [optedOutStatus, setOptedOutStatus] = useState(false);
    const router = useRouter();
    const { callSnackbar, userId } = useContext(ThemeContext);

    const {
        error: error,
        data: user,
        loading: getUserLoading
    } = useQuery(getUserForSurveyModal, {
        variables: { id: userId },
        fetchPolicy: 'cache-first'
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const [changeOptedOutStatusMutation] = useMutation(changeOptedOutStatus, { refetchQueries: getUserForSurveyModal });

    const client = useApolloClient();

    const setOpenHandler = (bool) => {
        if (viewType === TEACHER) {
            setCookie('isInterstitial', false);
        }

        setOpen(bool);
    };

    const handleOptOut = async () => {
        if (optedOutStatus) {
            await changeOptedOutStatusMutation({
                variables: {
                    id: userId,
                    optedOut: true
                }
            });

            client.writeFragment({
                id: client.cache.identify(user.getUser),
                fragment: gql`
                    fragment OptedOutStatusFragment on LwpUser {
                        showInterstitial {
                            optedOut
                        }
                    }
                `,
                data: {
                    showInterstitial: {
                        optedOut: true
                    }
                }
            });
        }
    };

    const notNowHandler = async () => {
        await handleOptOut();

        setOpenHandler(false);

        return null;
    };

    const startSurveyHandler = async () => {
        await handleOptOut();

        setCookie('feedbackRedirectUrl', feedbackRedirectUrl ?? router?.asPath);
        router?.push('/feedback');
        setOpen(false);

        return null;
    };

    if (getUserLoading) return <CommonLoading />;

    return (
        <DialogWrapper open={open} takeSetOpen setOpen={setOpenHandler} className="survey-modal" contentWidth="1100px">
            <div className="survey-modal-content-container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/pupil_without_round_bg1.png`} />
                <Heading1 text={user?.getUser?.showInterstitial?.heading} centerText />
                <Paragraph text={user?.getUser?.showInterstitial?.text} customClass={'survey-modal-text'} />
                <div className="survey-modal-text-list">
                    {getTypeFormValuesFromContext(user?.getUser?.showInterstitial)?.map((text) => (
                        <Heading3 text={text} />
                    ))}
                </div>
                <div className="survey-modal-bottom">
                    <div className="survey-modal-checkbox">
                        {!user?.getUser?.showInterstitial?.optedOut ? (
                            <CommonCheckBox
                                label={'Do not show this again'}
                                checked={optedOutStatus}
                                onChange={() => setOptedOutStatus(!optedOutStatus)}
                            />
                        ) : null}
                    </div>
                    <div className="survey-modal-button-container">
                        <LWPButton variant="text" btnText="Not now" color="inherit" onClick={notNowHandler} />
                        <LWPButton btnText="Start survey" onClick={startSurveyHandler} />
                    </div>
                </div>
            </div>
        </DialogWrapper>
    );
};

SurveyModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    feedbackRedirectUrl: PropTypes.string,
    viewType: PropTypes.string,
    userId: PropTypes.number
};

export default SurveyModal;
