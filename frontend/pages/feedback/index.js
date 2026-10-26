import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Paper } from '@mui/material';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useState } from 'react';
import { useContext } from 'react';

import LWPButton from '../../components/Shared/Button/LWPButton';
import CommonLoading from '../../components/Shared/CommonLoading';
import CommonTypeForm from '../../components/Shared/CommonTypeForm';
import Heading1 from '../../components/Shared/Typography/Heading1';
import Paragraph from '../../components/Shared/Typography/Paragraph';
import { submittedInterstitialForm } from '../../graphQl/mutations';
import { getCookie, removeCookie, setCookie } from '../../lib/manageCookies';
import { ADMIN, TEACHER } from '../../shared/Constant';
import { ThemeContext } from '../../shared/Services/handler';
import { PageType } from '../../types/enums/PageType';

// Queries

const getParentForInterstitialFormForFeedback = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            email
            firstname
            lastname
            activePupils {
                id
                pupil {
                    school {
                        schoolName
                    }
                    yearGroup
                }
            }
        }
    }
`;

const getTeacherForInterstitialFormForFeedback = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            email
            firstname
            lastname
            isSchoolLeader
            school {
                schoolName
            }
            mainClasses {
                id
                isRegistrationClass
                yearGroup {
                    year
                }
            }
        }
    }
`;

const getUserForFeedback = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            type
            firstname
            lastname
            email
            showInterstitial {
                id
                typeformId
                heading
                text
            }
        }
    }
`;

const Feedback = () => {
    const { callSnackbar, userId } = useContext(ThemeContext);
    const router = useRouter();
    const [typeFormId, setTypeFormId] = useState(null);

    const [getParentQuery, { loading: parentLoading, error: parentError, data: parentData }] = useLazyQuery(
        getParentForInterstitialFormForFeedback,
        {
            fetchPolicy: 'cache-first'
        }
    );

    const [getTeacherQuery, { loading: teacherLoading, error: teacherError, data: teacherData }] = useLazyQuery(
        getTeacherForInterstitialFormForFeedback,
        {
            fetchPolicy: 'cache-first'
        }
    );

    const {
        error: getUserError,
        data: user,
        loading: getUserLoading
    } = useQuery(getUserForFeedback, {
        variables: { id: userId },
        fetchPolicy: 'cache-first'
    });

    const [submittedInterstitialFormMutation] = useMutation(submittedInterstitialForm, {
        refetchQueries: [{ query: getUserForFeedback, variables: { id: userId }, fetchPolicy: 'cache-first' }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        parentError?.message && callSnackbar(parentError?.message, 'error');
        teacherError?.message && callSnackbar(teacherError?.message, 'error');
        getUserError?.message && callSnackbar(getUserError?.message, 'error');
    }, [parentError, teacherError, getUserError]);

    const handleSubmit = useCallback(() => {
        submittedInterstitialFormMutation({
            variables: {
                input: {
                    userId: user?.getUser?.id,
                    id: user?.getUser?.showInterstitial?.id
                }
            }
        })
            .then(() => {
                callSnackbar(`Thank you for your feedback.`, 'success');
                let feedbackRedirectUrl = '/';

                const feedbackRedirectUrlCookie = getCookie('feedbackRedirectUrl');

                if (feedbackRedirectUrlCookie) feedbackRedirectUrl = feedbackRedirectUrlCookie;

                removeCookie('feedbackRedirectUrl');
                router?.push(feedbackRedirectUrl);
            })
            .catch(({ ...err }) => {
                callSnackbar(err, 'error');
            });
    }, [user]);

    useEffect(() => {
        if (user?.getUser) {
            setTypeFormId(user?.getUser?.showInterstitial?.typeformId);
            if (user?.getUser?.type === TEACHER) {
                getTeacherQuery({ variables: { id: user?.getUser?.id } });
            } else {
                getParentQuery({ variables: { id: user?.getUser?.id } });
            }
        }
    }, [user]);

    const getHiddenFields = (userData, type) => {
        if (type === ADMIN) {
            return {
                fullname: `${user?.getUser?.firstname} ${user?.getUser?.lastname}`,
                email: user?.getUser?.email,
                id: user?.getUser?.id
            };
        }

        if (type === TEACHER) {
            return {
                fullname: `${userData?.firstname} ${userData?.lastname}`,
                email: userData?.email,
                id: userData?.id,
                teacherschoolname: userData?.school?.schoolName,
                classyeargroups:
                    userData?.mainClasses?.length > 0
                        ? Array.from(
                              new Set(
                                  userData?.mainClasses
                                      ?.filter((schoolClass) => schoolClass?.isRegistrationClass)
                                      ?.map((schoolClass) => schoolClass?.yearGroup?.year)
                              )
                          ).join(', ')
                        : '',
                isschoolleader: userData?.isSchoolLeader,
                numofregclasses:
                    userData?.mainClasses?.length > 0
                        ? userData?.mainClasses?.filter((schoolClass) => schoolClass?.isRegistrationClass)?.length
                        : 0,
                numofgroups:
                    userData?.mainClasses?.length > 0
                        ? userData?.mainClasses?.filter((schoolClass) => !schoolClass?.isRegistrationClass)?.length
                        : 0
            };
        }

        return {
            fullname: `${userData?.firstname} ${userData?.lastname}`,
            email: userData?.email,
            id: userData?.id,
            numofchildren: userData?.activePupils?.length,
            childrenschoolnames:
                userData?.activePupils?.length > 0
                    ? Array.from(
                          new Set(
                              userData?.activePupils?.map((pupilParent) => pupilParent?.pupil)?.map((pupil) => pupil?.school?.schoolName)
                          )
                      ).join(', ')
                    : '',
            childrenyeargroups:
                userData?.activePupils?.length > 0
                    ? Array.from(
                          new Set(userData?.activePupils?.map((pupilParent) => pupilParent?.pupil)?.map((pupil) => pupil?.yearGroup))
                      ).join(', ')
                    : ''
        };
    };

    if (parentLoading || teacherLoading || getUserLoading) return <CommonLoading />;

    return (
        <div className="lwp-feedback">
            <div className="desktop-btn">
                <LWPButton
                    btnText="Skip"
                    color="inherit"
                    variant="
                    "
                    size="medium"
                    onClick={() => {
                        let feedbackRedirectUrl = '/';

                        const feedbackRedirectUrlCookie = getCookie('feedbackRedirectUrl');

                        if (feedbackRedirectUrlCookie) feedbackRedirectUrl = feedbackRedirectUrlCookie;

                        setCookie('isInterstitial', false);
                        removeCookie('feedbackRedirectUrl');
                        router?.push(feedbackRedirectUrl);
                    }}
                />
            </div>

            <Heading1 centerText text={user?.getUser?.showInterstitial?.heading ?? ''} customClass="m-30" />
            <Paragraph centerText text={user?.getUser?.showInterstitial?.text ?? ''} customClass="mb-20" />
            <Paper className="feedback-form-container">
                {typeFormId ? (
                    <div className="feedback_widget-section">
                        <CommonTypeForm
                            hiddenFields={
                                user?.getUser?.type === TEACHER
                                    ? getHiddenFields(teacherData?.getUser, user?.getUser?.type)
                                    : getHiddenFields(parentData?.getUser, user?.getUser?.type)
                            }
                            onSubmit={handleSubmit}
                            formId={typeFormId}
                            className="feedback-form"
                        />
                    </div>
                ) : null}
            </Paper>
        </div>
    );
};

Feedback.propTypes = {
    setFeedback: PropTypes.bool,
    setFeedbackModal: PropTypes.func
};

Feedback.pageType = PageType.GENERAL;
Feedback.pageTitle = 'Feedback';

export default Feedback;
