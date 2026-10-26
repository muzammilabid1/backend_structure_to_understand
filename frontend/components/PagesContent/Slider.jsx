import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import { useMutation } from '@apollo/client';
import { useTheme } from '@emotion/react';
import { useMediaQuery } from '@mui/material';
import gql from 'graphql-tag';
import { range } from 'lodash';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useRef, useState } from 'react';
import Slider from 'react-slick';

import { clearCookiesOnly, getCookie } from '../../lib/manageCookies';
import { MAGICPARENT, PARENT, REFRESH_TOKEN_COOKIE, TOPICACCESS } from '../../shared/Constant';
import { showDate, ThemeContext } from '../../shared/Services/handler';
import LoginOrSignUpModal from '../Shared/Modals/LoginOrSignUpModal';
import Paragraph from './../Shared/Typography/Paragraph';

// Mutations

const logoutForReadingLogSlider = gql`
    mutation logout($refreshToken: String!) {
        logout(refreshToken: $refreshToken)
    }
`;

const reInviteParentForReadingLogSlider = gql`
    mutation reInviteParent($parentId: String!) {
        reInviteParent(parentId: $parentId) {
            id
        }
    }
`;

const ReadingLogSlider = ({
    setCollapse,
    collapse,
    pupilReadingLog,
    pupilReadingTopics,
    setOpen,
    open,
    setFieldValue,
    setId,
    isMobile,
    getReadingTopic,
    resetForm,
    showArrowButton = true
}) => {
    const searchParams = useSearchParams();
    const queryParams = useParams();
    const router = useRouter();
    const { callSnackbar, token, setToken } = useContext(ThemeContext);

    const carouselRef = useRef(null);

    const theme = useTheme();
    const smBkptOrUp = useMediaQuery(theme.breakpoints.up('sm'));

    const [isToday, setIsToday] = useState('');
    const [selectedCarouselIndex, setSelectedCarouselIndex] = useState(0);
    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

    const [logoutMutation] = useMutation(logoutForReadingLogSlider, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [reInviteParentMutation] = useMutation(reInviteParentForReadingLogSlider);

    const pupil_id = queryParams?.child_id || queryParams?.pupil_id;
    const nextTopicId = showArrowButton ? getReadingTopic?.getPupilReadingTopic?.nextReadingTopicId : null;

    let readingTopic = pupilReadingTopics?.getReadingTopics?.length > 0 ? [...pupilReadingTopics.getReadingTopics] : [];

    useEffect(() => {
        if (carouselRef.current?.slickGoTo) {
            carouselRef?.current?.slickGoTo(selectedCarouselIndex);
        }
    }, [selectedCarouselIndex]);

    useEffect(() => {
        if (isToday) {
            switch (new Date().getDay()) {
                case 0:
                    setSelectedCarouselIndex(5);
                    break;

                case 1:
                    setSelectedCarouselIndex(0);
                    break;

                case 2:
                    setSelectedCarouselIndex(0);
                    break;

                case 3:
                    setSelectedCarouselIndex(1);
                    break;

                case 4:
                    setSelectedCarouselIndex(2);
                    break;

                case 5:
                    setSelectedCarouselIndex(3);
                    break;

                case 6:
                    setSelectedCarouselIndex(5);
                    break;
            }
        }

        if (searchParams.get('pre')) {
            setSelectedCarouselIndex(0);
        }

        if (searchParams.get('next')) {
            setSelectedCarouselIndex(0);
        }
    }, [isToday, searchParams]);

    let settings = {
        infinite: false
    };

    if (!isMobile) {
        settings.slidesToShow = 7;
    }

    if (isMobile) {
        settings.responsive = [
            {
                breakpoint: 769,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 3
                }
            }
        ];
    }

    if (searchParams.get('pre')) {
        settings.initialSlide = 4;
    }

    if (searchParams.get('next')) {
        settings.initialSlide = 0;
    }

    const isParent = (userType) => [TOPICACCESS, PARENT, MAGICPARENT].includes(userType);

    const getReadingTopicDates = (data) => {
        const dateObjWithCount = {};

        for (const readingLogFeedbacks of data) {
            readingLogFeedbacks.readingLogFeedbacks?.map((dates) => {
                if (!isParent(dates?.userType)) {
                    if (!dates?.includeInReadingTarget) {
                        return;
                    }
                }

                if (!dateObjWithCount[showDate({ date: dates.bookReadAt, year: true })]) {
                    dateObjWithCount[showDate({ date: dates.bookReadAt, year: true })] = 1;
                } else {
                    dateObjWithCount[showDate({ date: dates.bookReadAt, year: true })] =
                        dateObjWithCount[showDate({ date: dates.bookReadAt, year: true })] + 1;
                }
            });
        }

        return Object.keys(dateObjWithCount);
    };

    const isDateIncluded = (dates) => {
        const bookReadDates = pupilReadingLog ? getReadingTopicDates(readingTopic) : [];

        return bookReadDates?.includes(dates);
    };

    let preTopicId = showArrowButton ? getReadingTopic?.getPupilReadingTopic?.prevReadingTopicId : null;

    const previous = () => {
        const topicReleaseDate = moment(getReadingTopic?.getPupilReadingTopic?.readingTopic?.releaseDate);
        const days = moment.duration(moment(new Date()).diff(topicReleaseDate)).asDays().toFixed(0);
        const routerQuery = { query: { topicId: preTopicId } };

        if (queryParams?.child_id) routerQuery['query']['child_id'] = pupil_id;
        if (queryParams?.pupil_id) routerQuery['query']['pupil_id'] = pupil_id;

        if (days > 14 && token?.userTrustLevel < 2) {
            return setIsSignInModalOpen(true);
        } else if (isMobile) {
            if (0 < selectedCarouselIndex) {
                return setSelectedCarouselIndex((pre) => pre - 3);
            } else {
                routerQuery['query']['pre'] = true;
                preTopicId && router?.push(routerQuery, undefined, { scroll: false });
            }
        } else {
            preTopicId && router?.push(routerQuery, undefined, { scroll: false });
        }
    };

    const next = () => {
        const routerQuery = { query: { topicId: nextTopicId } };

        if (queryParams?.child_id) routerQuery['query']['child_id'] = pupil_id;
        if (queryParams?.pupil_id) routerQuery['query']['pupil_id'] = pupil_id;

        if (isMobile) {
            if (4 > selectedCarouselIndex) {
                setSelectedCarouselIndex((pre) => pre + 3);
            } else {
                routerQuery['query']['next'] = true;
                nextTopicId && router?.push(routerQuery, undefined, { scroll: false });
            }
        } else {
            nextTopicId && router?.push(routerQuery, undefined, { scroll: false });
        }
    };

    const handleActiveUser = async () => {
        if (getCookie(REFRESH_TOKEN_COOKIE)) {
            await logoutMutation().catch(({ ...err }) => callSnackbar(err, 'error'));
        }

        clearCookiesOnly();
        setToken(null);
        router?.replace(`/child/${pupil_id}/reading?topicId=${preTopicId}`);
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

    return (
        <div className="slider-parent">
            {(!!preTopicId || !!selectedCarouselIndex) && (
                <span className={`material-icons unselectable`} onClick={previous} role="button">
                    keyboard_arrow_left
                </span>
            )}

            <Slider
                {...settings}
                ref={carouselRef}
                afterChange={(index) => {
                    setSelectedCarouselIndex(index);
                }}>
                {range(7).map((_, i) => {
                    const current = moment(getReadingTopic?.getPupilReadingTopic?.readingTopic?.releaseDate).toDate();

                    const first = current.getDate() + i;
                    const day = new Date(current.setDate(first));
                    const disable = moment(moment(day).format('YYYY-MM-DD')).isAfter(moment().startOf('day'));
                    const getDate = showDate({ date: day, year: true });
                    const today = getDate === showDate({ date: moment().toDate(), year: true });
                    const checkDate = isDateIncluded(getDate);

                    if (today && !isToday) {
                        setIsToday(today);
                    }

                    return (
                        <div
                            className={`item ${collapse === getDate ? 'selected-item' : checkDate ? 'done-item' : 'un-selected-item'} ${
                                disable ? 'disable' : ''
                            }  ${checkDate && 'submit'}`}
                            onClick={() => {
                                if (disable) {
                                    return;
                                }

                                if (checkDate) {
                                    setOpen(getDate !== open ? getDate : null);
                                } else {
                                    setCollapse(getDate !== collapse ? getDate : null);
                                    resetForm({ values: '' });
                                    setId(null);
                                }

                                setFieldValue('readDate', moment(getDate).format('YYYY-MM-DD'));
                            }}
                            data-test="reading-log-slider-day">
                            <Paragraph style={{ textAlign: 'center', textTransform: 'uppercase' }}>
                                {getReadingTopic ? (
                                    isMobile ? (
                                        today ? (
                                            <span data-test="current-day-reading-log">Today</span>
                                        ) : (
                                            <>{showDate({ date: day, smallDate: true })}</>
                                        )
                                    ) : today ? (
                                        <span data-test="current-day-reading-log">Today</span>
                                    ) : (
                                        <>{showDate({ date: day, smallDate: true })}</>
                                    )
                                ) : (
                                    'Loading'
                                )}
                            </Paragraph>
                            <div className="material-icons">{checkDate ? 'done' : disable ? 'schedule ' : 'add'}</div>
                        </div>
                    );
                })}
            </Slider>

            {(!!nextTopicId || (!smBkptOrUp && selectedCarouselIndex < 4)) && (
                <span className={'material-icons unselectable'} onClick={next} role="button">
                    keyboard_arrow_right
                </span>
            )}

            {isSignInModalOpen && (
                <LoginOrSignUpModal
                    open={isSignInModalOpen}
                    setOpen={() => setIsSignInModalOpen(false)}
                    heading={`${token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'} to access this section`}
                    subHeading={`Please ${
                        token?.status === 'ACTIVE' ? 'log in' : 'sign up'
                    } to your account to view the all week reading logs`}
                    primaryBtnText={token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'}
                    primaryBtnHandler={() =>
                        token?.status === 'ACTIVE'
                            ? handleActiveUser()
                            : handleInvitedUser(token.sub, token?.email ? 'email' : 'number', token?.email || token?.phoneNumber)
                    }
                />
            )}
        </div>
    );
};

ReadingLogSlider.propTypes = {
    pupilReadingTopics: PropTypes.object,
    pupilReadingLog: PropTypes.object,
    getReadingTopic: PropTypes.object,
    setCollapse: PropTypes.func,
    setFieldValue: PropTypes.func,
    setOpen: PropTypes.func,
    setId: PropTypes.func,
    collapse: PropTypes.string,
    open: PropTypes.string,
    isMobile: PropTypes.bool,
    showArrowButton: PropTypes.bool,
    resetForm: PropTypes.func
};

export default ReadingLogSlider;
