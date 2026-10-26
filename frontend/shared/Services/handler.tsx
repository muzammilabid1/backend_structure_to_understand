import { gql } from '@apollo/client';
// import * as Handlebars from 'handlebars/dist/handlebars';
import Handlebars from 'handlebars/dist/cjs/handlebars';
import { uniqBy } from 'lodash';
import { PupilParentStatus, ReadingBookOptions, UserStatus, UserType } from 'lwp-shared';
import MicRecorder from 'mic-recorder-to-mp3';
import moment, { type MomentInput } from 'moment';
import { nanoid } from 'nanoid';
import { createContext, useContext } from 'react';

import ShowPupilsFeedback from '../../components/Class/ClassReading/ReadingGroup/ShowPupilsFeedback';
import CommonPopOver from '../../components/Shared/CommonPopOver';
import InputField from '../../components/Shared/InputField/InputField';
import { getUserForReadingLog } from '../../components/Shared/Modals/UpdateReadingLog';
import Paragraph from '../../components/Shared/Typography/Paragraph';
import {
    getClassReadingTopicForWeekByWeek,
    getGroupAcrossClassesReadingTopicForWeekByWeek,
    getPupilReadingNoteForReadingLog,
    getPupilReadingTopicsForPupilReadingTab,
    getReadingTopics
} from '../../graphQl/queries';
import { getApolloClient } from '../../lib/apolloClientConfig';
import { getJwtDecoded, setCookie, setCookieShimFromContext } from '../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, PAGINATION_ITEM_LIMIT, SCRAPBOOK, STATUS_CODES, TEACHER } from '../../shared/Constant';
import sharedJson from '../../shared/json/index.json';
import { ILwpSchoolClass } from '../../types/entities/ILwpSchoolClass';
import { IPupil } from '../../types/entities/IPupil';
import { IAuthToken } from '../../types/IAuthToken';
import {
    ADMIN,
    cypressLoginCode,
    MAGIC_LINK_TYPES,
    MAGICPARENT,
    MINIO_PUBLIC_PATHS,
    onlyNumberRegex,
    PARENT,
    PupilStatus,
    PupilType,
    READING,
    SocialLoginType,
    TOPIC,
    TOPICACCESS,
    unexpectedError
} from '../Constant';

export interface PupilBook {
    bookName: string;
    isBookFinished: boolean;
    pageNumber: number | null;
    readingType: ReadingBookOptions;
}

// Filters and matches books based on a search substring and optional reading type
export const matchBooks = (books: PupilBook[], substring: string = '', typeOfReading: ReadingBookOptions = null): PupilBook[] => {
    if (!books) return [];

    // getPupilBooks groups by book name and reading type, so a title read as both a school book and an own book comes back
    // twice. Narrowing to one type collapses that. Nothing does when the pool was narrowed by reading mode instead, and the
    // same title could then fill every suggestion slot. uniqBy keeps the first, which is the finished-then-most-recent row.
    const candidates = typeOfReading ? books.filter((item) => item.readingType === typeOfReading) : uniqBy(books, 'bookName');
    const trimmedSubstring = substring.trim().toLowerCase();

    if (!trimmedSubstring) return candidates.slice(0, 3);

    return candidates.filter((item) => item.bookName.toLowerCase().includes(trimmedSubstring)).slice(0, 3);
};

export const showDate = ({
    date,
    year = false,
    short = false,
    time = false,
    smallDate = false,
    yearMonth = false,
    week = false,
    justDate = false,
    fullDateTime = false,
    unknownDateSentinel = undefined
}: {
    date: MomentInput;
    year?: boolean;
    short?: boolean;
    time?: boolean;
    smallDate?: boolean;
    yearMonth?: boolean;
    week?: boolean;
    justDate?: boolean;
    fullDateTime?: boolean;
    unknownDateSentinel?: MomentInput;
}) => {
    if (!date) {
        return '';
    }

    const m = moment(date);

    if (unknownDateSentinel && m.isSame(unknownDateSentinel)) {
        return 'Unknown';
    }

    if (year) {
        return m.format('dddd DD MMMM YYYY');
    } else if (short) {
        return m.format('ddd DD MMM');
    } else if (time) {
        return m.format('DD/MM/YYYY hh:mm A');
    } else if (justDate) {
        return m.format('DD/MM/YYYY');
    } else if (smallDate) {
        return m.format('ddd DD');
    } else if (yearMonth) {
        return m.format('YYYY-MM');
    } else if (week) {
        return m.format('w');
    } else if (fullDateTime) {
        return m.format('dddd DD MMMM, hh:mm A');
    } else {
        return m.format('dddd DD MMMM');
    }
};

export const sortingDate = (a, b) => {
    const dateA = a ? new Date(a) : new Date(0);
    const dateB = b ? new Date(b) : new Date(0);

    return dateA.getTime() - dateB.getTime();
};

export const handleErrorSnackbar = (callSnackbar, error) => {
    if (error?.message) {
        callSnackbar(error, 'error');
    }
};

export const getErrorCode = (error) => {
    return (
        error?.graphQLErrors?.[0]?.extensions?.exception?.status ||
        error?.networkError?.statusCode ||
        error?.graphQLErrors?.[0]?.extensions?.code
    );
};

export const handleImpactReportErrorSnackbar = (callSnackbar, error, setMagicLinkType, setImpactReportSchoolId, setShowLinkExpiredPage) => {
    const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

    if (statusCode === STATUS_CODES.EXPIRED_MAGIC_LINK) {
        setMagicLinkType(error?.graphQLErrors?.[0]?.extensions?.exception?.response?.magicLinkType);
        setImpactReportSchoolId(error?.graphQLErrors?.[0]?.extensions?.exception?.response?.schoolId);
        setShowLinkExpiredPage(true);
    } else {
        handleErrorSnackbar(callSnackbar, error);
    }
};

export const showDateTooltip = (date, name = false) => {
    if (!date) {
        return '-';
    }

    const timeDifference = moment(date).fromNow();

    const capitalizedTimeDifference = name ? timeDifference : timeDifference.charAt(0).toUpperCase() + timeDifference.slice(1);

    return (
        <CommonPopOver hover element={<Paragraph text={capitalizedTimeDifference} />} className="show_date" childrenClass="show_date_child">
            {moment(date).format('dddd D MMMM [at] h:mma')}
        </CommonPopOver>
    );
};

export const _readingTopicEndDateHandler = (date) => moment(date).add(7, 'day').format('dddd DD MMM');

export const _readingTopicShortEndDateHandler = (date) => showDate({ date: moment(date).add(6, 'day'), short: true });

export const isDateSameOrInFuture = (date) => {
    const currentDate = moment();
    const targetDate = moment(date);

    if (targetDate.isAfter(currentDate, 'day') || targetDate.isSame(currentDate, 'day')) {
        return true;
    } else {
        return false;
    }
};

export const generateHTMLStringForActivityErrors = (errors) => {
    let htmlString = '<ol>';

    errors.forEach((item) => {
        htmlString += `<li>STEP ${item.stepName}:</li>`;

        if (item.errors.length > 0) {
            htmlString += '<ul>';
            item.errors.forEach((error) => {
                htmlString += `<li>${error}</li>`;
            });
            htmlString += '</ul>';
        }
    });

    htmlString += '</ol>';

    return htmlString;
};

export const getFutureDate = (day) => {
    const today = moment();

    if (+day === today.day()) {
        return today.toDate();
    }

    let daysToAdd = +day - today.day();

    if (daysToAdd <= 0) {
        daysToAdd += 7;
    }

    return moment(today).add(daysToAdd, 'days').toDate();
};

export const isSameOrAfter14Days = (date) => {
    const currentDate = moment();
    const targetDate = moment(date);

    const diffInDays = currentDate.diff(targetDate, 'days');

    return diffInDays >= 14;
};

export const _renderNextReleaseDate = (day, date) => {
    if (!date) {
        const currentDate = moment().startOf('week').add(day, 'd');
        const today = moment().startOf('day');

        if (currentDate.isSameOrBefore(today, 'day')) {
            currentDate.add(7, 'd');
        }

        return showDate({ date: currentDate, time: true });
    } else {
        const currentDate = moment(date).startOf('week').add(day, 'd');

        return showDate({ date: currentDate, time: true });
    }
};

export const _checkIfDateIsAmonthAgo = (date) => {
    const givenDate = moment(date);
    const dateThirtyOneDaysAgo = moment().subtract(31, 'days');
    const isDateWithin31Days = givenDate.isSameOrBefore(dateThirtyOneDaysAgo);

    if (isDateWithin31Days) {
        return false;
    } else {
        return true;
    }
};

export const _getDayFromDate = (date) => moment(date, 'YYYY-MM-DD').format('dddd').substring(0, 3);
export const getDayOfTheWeek = (index) => sharedJson?.readingDays.find((day) => +day?.key === index).value;

// export const _readingTopicShortEndDateHandler = (date) => moment(date).add(7, 'day').format('ddd DD MMM');

export const _get_date_format = (date, endOfDay = false) => {
    const result = new Date(date);

    if (endOfDay) {
        result.setHours(23, 59, 59, 999);
    } else {
        result.setHours(0, 0, 0, 0);
    }

    return result;
};

/**
 * Translates a "This week" / "Last week" selection into posted-date bounds.
 * Weeks are ISO (Monday 00:00 start). "This week" runs from Monday to now (no upper bound);
 * "Last week" is the previous Monday-to-Monday window. Any other value clears the bounds.
 * Shared by the feed filter's submit path and searchfeedInput so both build the same range.
 */
export const getWeekPostedRange = (week: string | null | undefined) => {
    if (week !== 'THIS_WEEK' && week !== 'LAST_WEEK') {
        return { postedAfter: null, postedBefore: null };
    }

    const startOfThisWeek = moment().startOf('isoWeek');

    if (week === 'THIS_WEEK') {
        return { postedAfter: startOfThisWeek.toDate(), postedBefore: null };
    }

    return {
        postedAfter: startOfThisWeek.clone().subtract(7, 'days').toDate(),
        postedBefore: startOfThisWeek.toDate()
    };
};

export const isDateInOrAfterCurrentWeek = (date) => {
    const currentDate = moment().startOf('day');
    const inputDate = moment(date).add(6, 'days').startOf('day');

    return currentDate.isSameOrBefore(inputDate);
};

export const _get_iso_8601_date_format = (date) => {
    const newDate = new Date(date);
    const iso_date_format = newDate.getFullYear() + '-' + (newDate.getMonth() + 1) + '-' + newDate.getDate();

    return iso_date_format;
};

export const getTypeFormValuesFromContext = (showInterstitial) => {
    const context = showInterstitial?.context;
    const estimatedTime = context?.estimatedTime ?? showInterstitial?.averageTime;
    const typeFormValues = [];

    if (estimatedTime) {
        typeFormValues.push(`Takes ${estimatedTime} mins`);
    }

    if (context?.numOfQuestions && showInterstitial?.showQuestion) {
        typeFormValues.push(`${context?.numOfQuestions} questions`);
    }

    return typeFormValues;
};

export const socialLoginHandler = async (social, push, socialLoginInput, socialLoginUrlMutation) => {
    if (socialLoginInput?.expectedEmailOrPhone) setCookie('expectedEmail', socialLoginInput?.expectedEmailOrPhone);
    if (socialLoginInput?.magicLinkToken) setCookie('magicLinkToken', socialLoginInput?.magicLinkToken);
    if (window?.Cypress) {
        push({
            pathname: `/auth/${social}`,
            query: { code: cypressLoginCode }
        });
    } else {
        const { data } = await socialLoginUrlMutation();

        window.location.href = social === SocialLoginType.google ? data?.getGoogleLoginUrl : data?.getMicrosoftAzureADLoginUrl;
    }
};

export const getHtml = (html, params = { pupil: { firstname: 'John', lastname: 'Doe', fullname: 'John Doe' } }) => {
    Handlebars.registerHelper('orange', function (aString) {
        return "<span class='mwp-orange'>\n" + aString + '\n</span>';
    });

    Handlebars.registerHelper('definition', function (wordA, wordB) {
        return new Handlebars.SafeString(
            "<span class='activity-tooltip'>" +
                Handlebars.escapeExpression(wordA) +
                "<span class='activity-tooltiptext'>" +
                Handlebars.escapeExpression(wordB) +
                '</span></span>'
        );
    });
    const template = Handlebars.compile(html ?? '');
    const renderEditor = template(params);

    return renderEditor;
};

export const getDaysFromIndex = (index = 1) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];

    for (let i = 0; i < days.length; i++) {
        result.push(days[(index + i) % days.length]);
    }

    return result;
};

export const routeToTopic = (topicId, goto) => {
    goto(`/topic/${topicId}`);
};

export const routeToPupilAward = (pupilId, goto) => {
    goto(`/child/${pupilId}/trophies`);
};

export const routeToReadingTopic = (pupilId, goto) => {
    goto(`/child/${pupilId}/reading`);
};

export const gotoRouteBasedOnMagicLink = (goto, magicType, pupilTopicId, pupilId) => {
    switch (magicType) {
        case MAGIC_LINK_TYPES.TOPICACCESS:
            routeToTopic(pupilTopicId, goto);
            break;

        case MAGIC_LINK_TYPES.TROPHY:
            routeToPupilAward(pupilId, goto);
            break;

        case MAGIC_LINK_TYPES.READING:
            routeToReadingTopic(pupilId, goto);
            break;
    }
};

export const getUserStatusDescription = (userStatus) => {
    switch (userStatus) {
        case UserStatus.ACTIVE:
            return 'Has an active account on the site.';

        case UserStatus.IMPORTED:
            return 'Contact details imported or added, but no invitation email/SMS has been sent or requested for them.';

        case UserStatus.INVITED:
            return 'Has been sent an invitation to sign up by email or SMS.';

        case UserStatus.ACCOUNTLESS:
            return 'Uses the site but has not signed up for an account.';

        case UserStatus.DEACTIVATED:
            return 'Account disabled; cannot log in and will not receive communications.';

        case UserStatus.REJECTED:
            return 'Was sent an invitation but clicked a link to indicate that it was not wanted. Please check that contact details are correct.';

        default:
            return '';
    }
};

export const getPupilYearGroup = (yearGroups, year, nullable = false) => {
    if (yearGroups?.length > 0) {
        const pupilYearGroup = yearGroups?.find((yearGroup) => yearGroup?.id === year);

        if (pupilYearGroup) {
            return pupilYearGroup?.year;
        }
    }

    return nullable ? null : '-';
};

export const getYearGroups = (yearGroups) => {
    if (yearGroups?.length === 0) return '-';
    if (yearGroups?.length === 1) return yearGroups?.[0]?.year;

    return `${yearGroups?.[0]?.year} to ${yearGroups?.[yearGroups?.length - 1]?.year}`;
};

// export const _getFeatureDate = (beforeDay = 7) => {
//     const dateFrom = moment().add(beforeDay, 'd').format('MM-DD-YYYY');

//     return dateFrom;
// };

export const capitalizeFirstLetter = (string) => {
    const word = string?.toLowerCase();

    return word?.charAt(0).toUpperCase() + word?.slice(1);
};

export const TeacherContext = createContext(undefined);
export const ThemeContext = createContext(undefined);

export const _getImageFileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.readAsDataURL(file);
        reader.onload = () => {
            resolve(reader.result);
        };

        reader.onerror = (error) => {
            reject(error);
        };
    });

/** Extensions for MIME types whose subtype is not usable as one, as Office files' are not. */
const EXTENSION_BY_MIME = {
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
};

export const _getBase64ToFile = (dataurl, filename, applyFormat = false) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    const extension = EXTENSION_BY_MIME[mime] ?? mime?.split('/')?.[1];

    return new File([u8arr], applyFormat ? `${filename}.${extension}` : filename, { type: mime });
};

export const _getPagesCount = (count) => {
    let newCount = count / PAGINATION_ITEM_LIMIT;

    if (newCount - Math.floor(newCount) !== 0) {
        newCount += 1;
        const result = newCount.toString().split('.')[0];

        return result;
    }

    return newCount;
};

export const _onSkip = (pageNumber) => (pageNumber - 1) * PAGINATION_ITEM_LIMIT;

export const _getFileName = (src) => {
    const splitSource = src.split('/');

    return splitSource[splitSource.length - 1];
};

export const _phoneValidationRegex = (str) => !str.includes('@');

export const _removeWhiteSpace = (value) => (value && typeof value === 'string' ? value.trim() : value);

export const isViewAsMode = (userType, pathname) => {
    return (
        userType === TEACHER &&
        !pathname?.includes('/topic-library') &&
        (pathname?.startsWith('/child') || pathname?.startsWith('/topic') || pathname?.startsWith('/activity'))
    );
};

export const getParentLastInvitationEmailDate = (lastInvitationEmailSent) => {
    const date = new Date(lastInvitationEmailSent);

    if (date.getFullYear() < 2023) {
        return 'Before 2023';
    }

    return showDate({ date: lastInvitationEmailSent, time: true });
};

export const getDateWithFromNowFormat = (dateString) => {
    const date = new Date(dateString);

    if (date.getFullYear() < 2023) {
        return 'Before 2023';
    }

    return moment(dateString).fromNow();
};

export const convertEnumIntoMUISelectOptions = (enumObject) => {
    return Object.values(enumObject).map((option: string) => ({
        value: option
            .replaceAll('_', ' ')
            .toLowerCase()
            .replace(/^\w/, (c) => c.toUpperCase()),
        key: option
    }));
};

export const isAdminViewAsMode = (userType, pathname) => {
    return (
        userType === ADMIN &&
        (pathname?.startsWith('/parent') ||
            pathname?.startsWith('/child') ||
            pathname?.startsWith('/topic') ||
            pathname?.startsWith('/activity') ||
            pathname?.startsWith('/school') ||
            pathname?.startsWith('/class') ||
            pathname?.startsWith('/pupil') ||
            pathname?.startsWith('/feed') ||
            pathname?.startsWith('/resources') ||
            pathname?.startsWith('/lwpnews'))
    );
};

export const truncate = (str, n = 150) => {
    return str?.length > n ? str.substr(0, n - 1) + '...' : str;
};

export const processText = (inputText) => {
    const parts = inputText.split(/\.(?=[^.]*$)/);

    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
};

export const getPupilFeedbackTitle = (result) => {
    const { token } = useContext(ThemeContext);
    const readAsGroup = result?.pupilCount > 1 ? 'as part of a group' : '';

    const loggedByName = result?.logCreatedBy?.nameForChildren || result?.userName || '';
    const readyByGroup = readAsGroup ? ` ${readAsGroup}` : '';

    const loggedWith = loggedByName ? (
        <>
            {' with '}
            <b>{loggedByName}</b>
        </>
    ) : null;

    const renderReadingType = () => {
        if (result?.readingType === 'SCHOOL_BOOK') {
            return (
                <>
                    a <b>school book</b>
                </>
            );
        } else if (result?.readingType === 'OWN_BOOK') {
            return (
                <>
                    your <b>own book</b>
                </>
            );
        }
    };

    const renderName = (childern) => {
        return result?.pupilCount > 1 ? (
            <CommonPopOver
                text={`${result?.pupilCount} pupils`}
                childrenClass="total-students-popover"
                hover
                className={'show_pupil_count'}>
                <ShowPupilsFeedback feedbackId={result?.id} />
            </CommonPopOver>
        ) : (
            childern
        );
    };

    if (result?.isBookFinished)
        return (
            <>
                {token?.userType === PARENT ? (
                    <div className="activity-feed-title-reading">
                        <Paragraph /*customClass="mb2"*/>
                            {result?.readingType && result?.readingType !== 'SOMETHING_ELSE' ? (
                                <>
                                    You read and finished {renderReadingType()}, <b>{result?.bookName}</b>
                                    {readyByGroup}
                                    {loggedWith}.
                                </>
                            ) : (
                                <>
                                    You read <b>{result?.bookName}</b>
                                    {readyByGroup}
                                    {loggedWith}.
                                </>
                            )}
                        </Paragraph>
                    </div>
                ) : token?.userType === ADMIN ? (
                    <div className="activity-feed-title-reading">
                        <Paragraph /*customClass="mb2"*/>
                            {renderName(
                                <a href={`/admin/child/${result?.pupil?.id}`}>
                                    <u>{result?.pupil?.fullname}</u>
                                </a>
                            )}{' '}
                            read <b>{result?.bookName}</b>
                            {readyByGroup}
                            {loggedWith} and finished the book.
                        </Paragraph>
                    </div>
                ) : token?.userType === TEACHER ? (
                    <div className="activity-feed-title-reading">
                        <Paragraph /*customClass="mb2"*/>
                            {renderName(
                                <a href={`/pupil/${result?.pupil?.id}`}>
                                    <u>{result?.pupil?.fullname}</u>
                                </a>
                            )}{' '}
                            read <b>{result?.bookName}</b>
                            {readyByGroup}
                            {loggedWith} and finished the book.
                        </Paragraph>
                    </div>
                ) : (
                    <div className="activity-feed-title-reading">
                        <Paragraph /*customClass="mb2"*/>
                            {renderName(
                                <a href={`/pupil/${result?.pupil?.id}`}>
                                    <u>{result?.pupil?.fullname}</u>
                                </a>
                            )}{' '}
                            read <b>{result?.bookName}</b>
                            {readyByGroup}
                            {loggedWith} and finished the book.
                        </Paragraph>
                    </div>
                )}
            </>
        );

    return (
        <>
            {token?.userType === PARENT ? (
                <div className="activity-feed-title-reading">
                    <Paragraph /*customClass="mb2"*/>
                        {result?.readingType && result?.readingType !== 'SOMETHING_ELSE' ? (
                            <>
                                You read{' '}
                                {result?.pageNumber ? (
                                    <>
                                        up to <b>page {result?.pageNumber}</b> of{' '}
                                    </>
                                ) : (
                                    ''
                                )}
                                {renderReadingType()}, <b>{result?.bookName}</b>
                                {readyByGroup}
                                {loggedWith}.
                            </>
                        ) : (
                            <>
                                You read{' '}
                                {result?.pageNumber ? (
                                    <>
                                        up to <b>page {result?.pageNumber}</b> of{' '}
                                    </>
                                ) : (
                                    ''
                                )}
                                <b>{result?.bookName}</b>
                                {readyByGroup}
                                {loggedWith}.
                            </>
                        )}
                    </Paragraph>
                </div>
            ) : token?.userType === ADMIN ? (
                <div className="activity-feed-title-reading">
                    <Paragraph /*customClass="mb2"*/>
                        {renderName(
                            <a href={`/admin/child/${result?.pupil?.id}`}>
                                <u>{result?.pupil?.fullname}</u>
                            </a>
                        )}{' '}
                        read <b>{result?.bookName}</b>
                        {readyByGroup}
                        {loggedWith}
                        {result?.pageNumber && <> and got to Page {result?.pageNumber}</>}
                    </Paragraph>
                </div>
            ) : token?.userType === TEACHER ? (
                <div className="activity-feed-title-reading">
                    <Paragraph /*customClass="mb2"*/>
                        {renderName(
                            <a href={`/pupil/${result?.pupil?.id}`}>
                                <u>{result?.pupil?.fullname}</u>
                            </a>
                        )}{' '}
                        read <b>{result?.bookName}</b>
                        {readyByGroup}
                        {loggedWith}
                        {result?.pageNumber && <> and got to Page {result?.pageNumber}</>}.
                    </Paragraph>
                </div>
            ) : (
                <div className="activity-feed-title-reading">
                    <Paragraph /*customClass="mb2"*/>
                        {renderName(
                            <a href={`/pupil/${result?.pupil?.id}`}>
                                <u>{result?.pupil?.fullname}</u>
                            </a>
                        )}{' '}
                        read <b>{result?.bookName}</b>
                        {readyByGroup}
                        {loggedWith}
                        {result?.pageNumber && <> and got to Page {result?.pageNumber}</>}
                    </Paragraph>
                </div>
            )}
        </>
    );
};

export const recordAudio = () => {
    return new Promise((resolve, reject) => {
        try {
            let stream;

            navigator?.mediaDevices
                ?.getUserMedia({ audio: true })
                .then((s) => {
                    stream = s;
                    const mediaRecorder = new MediaRecorder(stream);
                    const audioChunks = [];

                    mediaRecorder.addEventListener('dataavailable', (event) => {
                        audioChunks.push(event.data);
                    });

                    const start = () => mediaRecorder.start();

                    const stop = () =>
                        new Promise((resolve) => {
                            mediaRecorder.addEventListener('stop', () => {
                                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                                const audioUrl = URL.createObjectURL(audioBlob);
                                const audio = new Audio(audioUrl);
                                const play = () => audio.play();

                                resolve({ audioBlob, audioUrl, play });
                            });

                            mediaRecorder?.stop();
                            stream.getTracks().forEach((track) => track.stop());
                        });

                    resolve({ start, stop });
                })
                .catch((e) => reject(e));
        } catch (e) {
            reject(e);
        }
    });
};

export const recordAudioToMp3 = () => {
    return new Promise((resolve, reject) => {
        try {
            navigator?.mediaDevices
                ?.getUserMedia({ audio: true })
                .then(() => {
                    const record = new MicRecorder({
                        bitRate: 128
                    });

                    const start = () => {
                        return record.start();
                    };

                    const stop = () =>
                        new Promise((resolve) => {
                            record
                                .stop()
                                .getMp3()
                                .then(async ([buffer, audioBlob]) => {
                                    const file = new File(buffer, 'readinglog.mp3', {
                                        type: audioBlob.type,
                                        lastModified: Date.now()
                                    });

                                    const audioUrl = URL.createObjectURL(file);

                                    const player = new Audio(audioUrl);

                                    const play = () => player.play();

                                    resolve({ audioBlob, audioUrl, play });
                                })
                                .catch((e) => {
                                    reject(e);
                                });
                        });

                    resolve({ start, stop });
                })
                .catch((e) => reject(e));
        } catch (e) {
            reject(e);
        }
    });
};

export const _error = (state, splitter) => {
    if (state?.split(splitter)?.some((item) => !item.trim())) {
        return false;
    }

    return true;
};

export const itemsNotEqualError = (headers, row) => headers?.split('|')?.length !== row?.split('|')?.length;

const tableValidation = (newTableData) => {
    const tableData = JSON.parse(newTableData);

    if ((tableData?.headers || [])?.every((item) => !item?.trim()) && tableData?.rows?.length !== 0) {
        return 'Headers are required';
    }

    if (tableData?.rows?.some((item) => Object.keys(item)?.length !== tableData?.headers?.length)) {
        return 'Number of columns in a row should be equal to number of headers';
    }

    if (tableData?.headers?.some((item) => !item?.trim()) || tableData?.headers?.length === 0) {
        return 'Column of a header should not be empty';
    }

    if (tableData?.rows?.length === 0) {
        return 'Rows are required';
    }

    for (const item of tableData.rows) {
        if (Object.values(item)?.some((val: string) => !val?.trim())) {
            return 'Row cannot be empty';
        }
    }

    return null;
};

const textDiceValidation = (properties) => {
    const textDiceData = JSON.parse(properties);

    if (textDiceData?.diceProperties) {
        for (const property of textDiceData.diceProperties) {
            if (property?.diceType === 'IMAGE') {
                if (!property?.images?.length) {
                    return 'Image is required';
                }
            } else {
                if (!property?.inputArray?.length) {
                    return 'Input array is required';
                }

                if (property?.inputArray?.split(',')?.some((item) => !item?.trim())) {
                    return 'Content of input array cannot be empty';
                }
            }
        }
    }

    return null;
};

export const isCertificateValid = (values) => {
    const { hasMathscot, mathscotScale, mathscotXValue, mathsoctYValue, fieldData } = values;
    let bool = true;

    if (hasMathscot && (!mathscotScale || !mathscotXValue || !mathsoctYValue)) {
        return false;
    }

    if (fieldData?.length === 0) {
        return false;
    }

    for (const field of fieldData) {
        switch (field?.fieldName) {
            case 'childName':
                if (!field?.xValue || !field?.yValue || !field?.fontSize) {
                    bool = false;
                }

                break;

            case 'date':
                if (!field?.xValue || !field?.yValue || !field?.fontSize) {
                    bool = false;
                }

                break;

            case 'totalStars':
                if (!field?.xValue || !field?.yValue || !field?.fontSize) {
                    bool = false;
                }

                break;

            case 'teacherName':
                if (!field?.xValue || !field?.yValue || !field?.fontSize) {
                    bool = false;
                }

                break;

            default:
                bool = true;
        }
    }

    return bool;
};

export const isValid = (steps) => {
    const errorMessages = [];

    steps.map((step) => {
        const stepSpecificErrorMessage = [];

        switch (step.stepType) {
            case 'DOWNLOAD':
                if (!step?.downloadName) {
                    stepSpecificErrorMessage.push('Name is required');
                }

                if (!step?.downloadUrl) {
                    stepSpecificErrorMessage.push('Pdf is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'TEXT_AND_IMAGE':
                if (!step?.text && !step?.imageUrl) {
                    stepSpecificErrorMessage.push('One of text or image is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: 'TEXT AND IMAGE', errors: stepSpecificErrorMessage });
                }

                break;

            case 'IMAGE':
                if (!step?.imageUrl) {
                    stepSpecificErrorMessage.push('Image is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'LINK':
                if (!step?.linkName) {
                    stepSpecificErrorMessage.push('Name is required');
                }

                if (!step?.linkUrl) {
                    stepSpecificErrorMessage.push('Url is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'AUDIO':
                if (!step?.audioUrl) {
                    stepSpecificErrorMessage.push('Audio is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'TABS': {
                const tabsData = JSON.parse(step?.tabsData) || [];

                if (tabsData?.length > 3) {
                    stepSpecificErrorMessage.push('Tabs should not be more than 3');
                }

                if (tabsData?.some((tab) => !tab?.modalId)) {
                    stepSpecificErrorMessage.push('Modal is required');
                }

                if (tabsData?.some((tab) => !tab?.header?.trim())) {
                    stepSpecificErrorMessage.push('Header is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;
            }

            case 'DICE':
                if (!step?.properties) {
                    stepSpecificErrorMessage.push('Properties are required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: 'LEGACY DICE', errors: stepSpecificErrorMessage });
                }

                break;

            case 'TEXTDICE':
                (() => {
                    const textDiceValidationError = textDiceValidation(step?.properties);

                    if (textDiceValidationError) {
                        stepSpecificErrorMessage.push(textDiceValidationError);
                    }

                    if (!step?.order) {
                        stepSpecificErrorMessage.push('Step order is required');
                    }

                    if (stepSpecificErrorMessage?.length > 0) {
                        errorMessages.push({ stepName: 'DICE', errors: stepSpecificErrorMessage });
                    }
                })();

                break;

            case 'IMAGE_CAROUSEL':
                if (JSON.parse(step?.imageCarouselData || [])?.some((imageCarousel) => !imageCarousel?.fileName)) {
                    stepSpecificErrorMessage.push('Image is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: 'IMAGE CAROUSEL', errors: stepSpecificErrorMessage });
                }

                break;

            case 'DIGITAL_CHECKLIST':
                if (JSON.parse(step?.checklistImageData || [])?.some((checklistImageObj) => !checklistImageObj?.caption?.trim())) {
                    stepSpecificErrorMessage.push('Caption is required');
                }

                if (JSON.parse(step?.checklistImageData || [])?.some((checklistImageObj) => !checklistImageObj?.fileName)) {
                    stepSpecificErrorMessage.push('Image is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: 'DIGITAL CHECKLIST', errors: stepSpecificErrorMessage });
                }

                break;

            case 'INFANT_FONT':
                if (!step?.fontType) {
                    stepSpecificErrorMessage.push('Font type is required');
                }

                if (!step?.text) {
                    stepSpecificErrorMessage.push('Text is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: 'INFANT FONT', errors: stepSpecificErrorMessage });
                }

                break;

            case 'VIDEO':
                if (!step?.text?.trim()) {
                    stepSpecificErrorMessage.push('Video ID is required');
                } else if (!onlyNumberRegex.test(step?.text)) {
                    stepSpecificErrorMessage.push('Video ID should be a number');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'STOPWATCH':
                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'SET_BY_TEACHER':
                if (!step?.setByTeacherData?.heading) {
                    stepSpecificErrorMessage.push('Heading is required');
                }

                if (!step?.setByTeacherData?.subHeading) {
                    stepSpecificErrorMessage.push('Sub heading is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'TEXT_CAROUSEL':
                if (JSON.parse(step?.textCarouselData)?.text?.some((item) => !item?.text)) {
                    stepSpecificErrorMessage.push('Text is required');
                }

                if (JSON.parse(step?.textCarouselData)?.text?.some((item) => !item?.fontSize)) {
                    stepSpecificErrorMessage.push('Font size is required');
                } else if (JSON.parse(step?.textCarouselData)?.text?.some((item) => !onlyNumberRegex.test(item?.fontSize))) {
                    stepSpecificErrorMessage.push('Font size sould be a number');
                } else if (JSON.parse(step?.textCarouselData)?.text?.some((item) => item?.fontSize > 999)) {
                    stepSpecificErrorMessage.push('Font size sould be a less then 1000');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'CAROUSEL':
                if ((step?.carouselData || [])?.some((data) => !data?.fileName && data.type === 'IMAGE')) {
                    stepSpecificErrorMessage.push('Image is required');
                }

                if (step?.carouselData?.some((data) => data?.textEditorState?.trim()?.length < 10 && data.type === 'TEXT')) {
                    stepSpecificErrorMessage.push('Content of carousel editor cannot be empty');
                }

                if (step?.carouselData?.some((data) => !data?.alt && data.type === 'IMAGE')) {
                    stepSpecificErrorMessage.push('Alt of carousel Image cannot be empty');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'ACCORDION':
                if (step?.accordionData?.some((item) => !item?.heading)) {
                    stepSpecificErrorMessage.push('Heading is required');
                }

                if (step?.accordionData?.some((item) => !item?.description?.editorState)) {
                    stepSpecificErrorMessage.push('Content of accordion editor cannot be empty');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'TEXT_ONLY_DIGITAL_CHECKLIST':
                if (step?.checkListTextData?.checkList?.some((item) => !item?.listItem)) {
                    stepSpecificErrorMessage.push('List item is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'TABLE':
                (() => {
                    const tableValidationError = tableValidation(step?.tableData);

                    if (tableValidationError) {
                        stepSpecificErrorMessage.push(tableValidationError);
                    }

                    if (!step?.order) {
                        stepSpecificErrorMessage.push('Step order is required');
                    }

                    if (stepSpecificErrorMessage?.length > 0) {
                        errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                    }
                })();

                break;

            case 'MODAL':
                if (!step?.selectedModalId) {
                    stepSpecificErrorMessage.push('Name is required');
                }

                if (!step?.btnType) {
                    stepSpecificErrorMessage.push('Type is required');
                }

                if (!step?.text) {
                    stepSpecificErrorMessage.push('Button text is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'EDITOR':
                if (!step?.editorState) {
                    stepSpecificErrorMessage.push('Content of editor cannot be empty');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            case 'MODAL_WITH_CLICKABLE_ALPHABET':
                if (!step?.text) {
                    stepSpecificErrorMessage.push('Text is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: 'MODAL WITH CLICKABLE ALPHABET', errors: stepSpecificErrorMessage });
                }

                break;

            case 'TIMER':
                if (JSON.parse(step?.timerData)?.timerDuration === 0) {
                    stepSpecificErrorMessage.push('Duration cannot be 0');
                } else if (!JSON.parse(step?.timerData)?.timerDuration) {
                    stepSpecificErrorMessage.push('Duration is required');
                }

                if (!JSON.parse(step?.timerData)?.timerEndString) {
                    stepSpecificErrorMessage.push('Timeout message is required');
                }

                if (!step?.order) {
                    stepSpecificErrorMessage.push('Step order is required');
                }

                if (stepSpecificErrorMessage?.length > 0) {
                    errorMessages.push({ stepName: step.stepType, errors: stepSpecificErrorMessage });
                }

                break;

            default:
                return unexpectedError.message;
        }
    });

    return errorMessages;
};

const exportTableDataHelper = (headers, rows) => {
    const newHeaders = headers?.split('|')?.map((item) => item?.trim()) ?? [];
    const newRows = [];

    rows?.forEach((item) => {
        const newItem = item?.row?.split('|');
        const newRow = {};

        newItem?.forEach((rowItem, idx) => {
            newRow[`${newHeaders?.[idx] ? newHeaders?.[idx]?.toLowerCase()?.split(' ')?.join('') : `unknown${idx}`}`] = rowItem?.trim();
        });

        newRows.push(newRow);
    });

    return { headers: newHeaders, rows: newRows };
};

const importTableDataHelper = (tableData) => {
    const tableHeaders = tableData?.headers?.length > 0 ? tableData?.headers?.join(' | ') : [];
    const tableRows = [];

    (tableData?.rows || []).forEach((item) => {
        const newRows = [];

        Object.values(item).forEach((value) => {
            newRows.push(value);
        });
        tableRows.push({ row: newRows.join(' | ') });
    });

    return [tableHeaders, tableRows];
};

const generateAlphabetJSON = (text) => {
    const alphaJSON = {};
    const sentenceArray = text
        ?.split(/\r?\n/)
        ?.map((line) => line?.trim())
        ?.filter((line) => line);

    for (const sentence of sentenceArray) {
        // eslint-disable-next-line no-prototype-builtins
        if (alphaJSON.hasOwnProperty(sentence?.[0]?.toLowerCase())) {
            alphaJSON[`${sentence?.[0]?.toLowerCase()}`].push(sentence);
        } else {
            alphaJSON[sentence?.[0]?.toLowerCase()] = [sentence];
        }
    }

    return alphaJSON;
};

export const splitCamelCaseToString = (inputString) => {
    return (
        inputString
            // Add space before each uppercase letter.
            .replace(/([A-Z])/g, ' $1')
            // Trim the string to remove any leading space and capitalize the first letter.
            .trim()
            .replace(/^./, (str) => str.toUpperCase())
    );
};

export const generateFileName = (name) => {
    const nameLength = name?.split('.')?.length;
    const prePeriod = name
        ?.split('.')
        ?.splice(0, nameLength - 1)
        ?.join('.');
    const postPeriod = name?.split('.')?.[nameLength - 1];

    return `${prePeriod}-1cardImage1.${postPeriod}`;
};

export const PreSubmitStepWork = (steps, files, isUpdating = false) => {
    if (isUpdating) {
        steps = steps.map((step) => {
            /* eslint-disable @typescript-eslint/no-unused-vars */
            const {
                __typename,
                editorState,
                textCarouselData,
                carouselData,
                tableHeaders,
                tableRows,
                properties,
                diceProperties,
                height,
                width,
                dimensions,
                tabsData,
                longTextFontSize,
                expression,
                btnText,
                modalHeading,
                modalText,
                timerEndString,
                timerDuration,
                imageCarouselData,
                checklistImageData,
                fileName,
                showTimerInSeconds,
                tempId,
                scrollingImage,
                accordionData,
                checkListTextData,
                ...rest
            } = step;
            /* eslint-enable @typescript-eslint/no-unused-vars */

            parseStepImages(step, files, imageCarouselData, checklistImageData, diceProperties, carouselData);

            return {
                ...rest,
                hasFile: step?.imageUrl || step?.downloadUrl || step?.audioUrl ? true : false,
                editorState: step?.stepType === 'EDITOR' ? step?.editorState : null,
                accordionData: step?.stepType === 'ACCORDION' && accordionData?.length > 0 ? accordionData : null,
                checkListTextData: checkListTextData?.checkList?.length > 0 ? checkListTextData : null,
                textCarouselData:
                    step?.stepType === 'TEXT_CAROUSEL' && textCarouselData?.length > 0
                        ? JSON.stringify({ text: textCarouselData?.map((item) => item) })
                        : '{ "text": [] }',
                tableData:
                    step?.stepType === 'TABLE'
                        ? JSON.stringify(exportTableDataHelper(tableHeaders, tableRows))
                        : "{'headers':['Col1'],'rows':[{'col1':'row1'},{'col1':'row2'}, {'col1':'row3'}]}",
                properties:
                    step?.stepType === 'TEXTDICE'
                        ? JSON.stringify({ diceProperties, height, longTextFontSize, expression, btnText })
                        : step?.stepType === 'DICE'
                          ? properties
                          : ['IMAGE_CAROUSEL', 'CAROUSEL']?.includes(step?.stepType)
                            ? JSON.stringify({ scrollingImage })
                            : '{ "inputArray": [[]], "widthArray": [[""]], "fontArray": [[]], "height": "" }',
                fileName: fileName?.trim() ?? null,
                timerData: step?.stepType === 'TIMER' ? JSON.stringify({ timerDuration, timerEndString, showTimerInSeconds }) : null,
                imageCarouselData: step?.stepType === 'IMAGE_CAROUSEL' ? JSON.stringify(imageCarouselData) : null,
                checklistImageData: step?.stepType === 'DIGITAL_CHECKLIST' ? JSON.stringify(checklistImageData) : null,
                dimensions: ['IMAGE_CAROUSEL', 'CAROUSEL']?.includes(step?.stepType) ? JSON.stringify({ height, width }) : null,
                tabsData: step?.stepType === 'TABS' ? JSON.stringify(step?.tabsData) : null,
                clickableAlphabetData:
                    step?.stepType === 'MODAL_WITH_CLICKABLE_ALPHABET'
                        ? JSON.stringify({
                              btnText,
                              btnType: step?.btnType,
                              modalHeading,
                              modalText,
                              alphabetJSON: step?.text ? generateAlphabetJSON(step?.text) : {}
                          })
                        : null,
                carouselData:
                    step?.stepType === 'CAROUSEL'
                        ? carouselData?.map((item) => {
                              // eslint-disable-next-line @typescript-eslint/no-unused-vars
                              const { textEditAsHtml, labelEditAsHtml, isLabelEdited, isTextEdited, __typename, ...rest } = item;

                              if (item?.type === 'TEXT') {
                                  return {
                                      ...rest,
                                      labelEditorState: null
                                  };
                              } else {
                                  return {
                                      ...rest,
                                      textEditorState: null
                                  };
                              }
                          })
                        : null
            };
        });
    } else {
        steps = steps.map((step) => {
            /* eslint-disable @typescript-eslint/no-unused-vars */
            const {
                __typename,
                isNew,
                editorState,
                textCarouselData,
                carouselData,
                tableHeaders,
                tableRows,
                properties,
                diceProperties,
                height,
                width,
                dimensions,
                tabsData,
                longTextFontSize,
                expression,
                btnText,
                modalHeading,
                modalText,
                timerEndString,
                imageCarouselData,
                checklistImageData,
                timerDuration,
                showTimerInSeconds,
                fileName,
                scrollingImage,
                tempId,
                accordionData,
                checkListTextData,
                ...rest
            } = step;
            /* eslint-enable @typescript-eslint/no-unused-vars */

            parseStepImages(step, files, imageCarouselData, checklistImageData, diceProperties, carouselData);

            return {
                ...rest,
                editorState: step?.stepType === 'EDITOR' ? step?.editorState : null,
                accordionData: step?.stepType === 'ACCORDION' && accordionData?.length > 0 ? accordionData : null,
                checkListTextData: checkListTextData?.checkList?.length > 0 ? checkListTextData : null,
                textCarouselData:
                    step?.stepType === 'TEXT_CAROUSEL' && textCarouselData?.length > 0
                        ? JSON.stringify({ text: textCarouselData?.map((item) => item) })
                        : '{ "text": [] }',
                tableData:
                    step?.stepType === 'TABLE'
                        ? JSON.stringify(exportTableDataHelper(tableHeaders, tableRows))
                        : "{'headers':['Col1'],'rows':[{'col1':'row1'},{'col1':'row2'}, {'col1':'row3'}]}",
                properties:
                    step?.stepType === 'TEXTDICE'
                        ? JSON.stringify({ diceProperties, height, longTextFontSize, expression, btnText })
                        : step?.stepType === 'DICE'
                          ? properties
                          : ['IMAGE_CAROUSEL', 'CAROUSEL']?.includes(step?.stepType)
                            ? JSON.stringify({ scrollingImage })
                            : '{ "inputArray": [[]], "widthArray": [[""]], "fontArray": [[]], "height": "" }',
                fileName: fileName?.trim() ?? null,
                timerData: step?.stepType === 'TIMER' ? JSON.stringify({ timerDuration, timerEndString, showTimerInSeconds }) : null,
                imageCarouselData: step?.stepType === 'IMAGE_CAROUSEL' ? JSON.stringify(imageCarouselData) : null,
                checklistImageData: step?.stepType === 'DIGITAL_CHECKLIST' ? JSON.stringify(checklistImageData) : null,
                dimensions: ['IMAGE_CAROUSEL', 'CAROUSEL']?.includes(step?.stepType) ? JSON.stringify({ height, width }) : null,
                tabsData: step?.stepType === 'TABS' ? JSON.stringify(step?.tabsData) : null,
                clickableAlphabetData:
                    step?.stepType === 'MODAL_WITH_CLICKABLE_ALPHABET'
                        ? JSON.stringify({
                              btnText,
                              btnType: step?.btnType,
                              modalHeading,
                              modalText,
                              alphabetJSON: step?.text ? generateAlphabetJSON(step?.text) : {}
                          })
                        : null,
                carouselData:
                    step?.stepType === 'CAROUSEL'
                        ? carouselData?.map((item) => {
                              // eslint-disable-next-line @typescript-eslint/no-unused-vars
                              const { textEditAsHtml, labelEditAsHtml, isLabelEdited, isTextEdited, ...rest } = item;

                              if (item?.type === 'TEXT') {
                                  return {
                                      ...rest,
                                      labelEditorState: null
                                  };
                              } else {
                                  return {
                                      ...rest,
                                      textEditorState: null
                                  };
                              }
                          })
                        : null
            };
        });
    }

    steps = steps.map((step, index) => ({
        ...step,
        order: index + 1
    }));

    return [steps, files];
};

export const getStepsValue = (steps) => {
    const baseStepObject = (step) => ({
        id: step?.id,
        timerDuration: 0,
        timerEndString: null,
        timerData: null,
        showTimerInSeconds: true,
        fileName: step?.fileName ?? null,
        linkName: null,
        linkUrl: null,
        downloadName: null,
        downloadUrl: null,
        imageUrl: step?.imageUrl ?? null,
        order: step?.order,
        properties: null,
        diceProperties: null,
        longTextFontSize: null,
        expression: null,
        btnText: null,
        textCarouselData: null,
        tableData: null,
        tableHeaders: null,
        tableRows: [{ row: null }],
        fontSize: null,
        fontType: null,
        selectedModalId: null,
        btnType: null,
        stepType: step?.stepType,
        text: step?.text,
        editorState: null,
        isNew: false,
        tabsData: null,
        audioUrl: null,
        height: null,
        dimensions: null,
        width: null,
        modalHeading: null,
        modalText: null,
        includeSeconds: false,
        imageCarouselData: null,
        fileIdentifier: nanoid(),
        hasFile: null,
        accordionData: null,
        checkListTextData: null,
        setByTeacherData: null,
        // Applies to every step type, so it is read here in the base rather than in the
        // per-type mappers below. Rebuilt field by field rather than passed straight through,
        // so Apollo's __typename never reaches the save mutation and gets rejected as an
        // unknown input field. Same approach as setByTeacherData in SET_BY_TEACHER below.
        visibilityRules: step?.visibilityRules ? { hideForSchoolTagIds: step.visibilityRules.hideForSchoolTagIds ?? [] } : null
    });

    const stepSpecifics = {
        MODAL_WITH_CLICKABLE_ALPHABET: (step, base) => {
            const clickableAlphabetData = JSON.parse(step?.clickableAlphabetData);

            return {
                ...base,
                btnText: clickableAlphabetData?.btnText,
                btnType: clickableAlphabetData?.btnType,
                modalHeading: clickableAlphabetData?.modalHeading,
                modalText: clickableAlphabetData?.modalText
            };
        },
        IMAGE_CAROUSEL: (step, base) => {
            const imageCarouselData = JSON.parse(step?.imageCarouselData);
            const dimensions = JSON.parse(step?.dimensions);
            const properties = JSON.parse(step?.properties);

            return {
                ...base,
                height: dimensions?.height,
                width: dimensions?.width,
                imageCarouselData,
                scrollingImage: properties?.scrollingImage
            };
        },
        DIGITAL_CHECKLIST: (step, base) => {
            const checklistImageData = JSON.parse(step?.checklistImageData);

            return {
                ...base,
                checklistImageData
            };
        },
        LINK: (step, base) => ({
            ...base,
            linkName: step?.linkName,
            linkUrl: step?.linkUrl,
            btnType: step?.btnType
        }),
        TIMER: (step, base) => {
            const timerData = JSON.parse(step?.timerData);

            return {
                ...base,
                timerDuration: timerData?.timerDuration,
                timerEndString: timerData?.timerEndString,
                showTimerInSeconds: typeof timerData?.showTimerInSeconds === 'undefined' ? false : timerData?.showTimerInSeconds
            };
        },
        AUDIO: (step, base) => ({
            ...base,
            audioUrl: step?.audioUrl
        }),
        DOWNLOAD: (step, base) => ({
            ...base,
            downloadName: step?.downloadName,
            downloadUrl: step?.downloadUrl ?? null,
            btnType: step?.btnType
        }),
        DICE: (step, base) => ({
            ...base,
            properties: step?.properties
        }),
        TEXTDICE: (step, base) => {
            const properties = JSON.parse(step?.properties);

            return {
                ...base,
                diceProperties: properties?.diceProperties,
                height: properties?.height,
                longTextFontSize: properties?.longTextFontSize,
                expression: properties?.expression,
                btnText: properties?.btnText
            };
        },
        INFANT_FONT: (step, base) => ({
            ...base,
            fontSize: step?.fontSize,
            fontType: step?.fontType,
            text: step?.text
        }),
        TEXT_CAROUSEL: (step, base) => {
            const textCarouselData = step?.textCarouselData
                ? JSON.parse(step?.textCarouselData)?.text?.map((item) => {
                      if (typeof item === 'string') {
                          return { text: item, fontSize: '32' };
                      }

                      return item;
                  })
                : [];

            return {
                ...base,
                textCarouselData
            };
        },
        CAROUSEL: (step, base) => {
            let carouselData = step?.carouselData;
            const dimensions = JSON.parse(step?.dimensions);
            const properties = JSON.parse(step?.properties);

            carouselData = carouselData?.map((item) => ({
                ...item,
                labelEditAsHtml: false,
                textEditAsHtml: false,
                isLabelEdited: item?.type === 'TEXT',
                isTextEdited: item?.type === 'IMAGE',
                labelEditorState: item?.labelEditorState ?? '',
                textEditorState: item?.textEditorState ?? '',
                fileIdentifier: item?.fileIdentifier ?? nanoid()
            }));

            return {
                ...base,
                height: dimensions?.height,
                width: dimensions?.width,
                scrollingImage: properties?.scrollingImage,
                carouselData
            };
        },
        VIDEO: (step, base) => ({
            ...base,
            text: step?.text
        }),
        TABLE: (step, base) => {
            const newTableData = JSON.parse(step?.tableData);
            const [tableHeaders, tableRows] = importTableDataHelper(newTableData);

            return {
                ...base,
                tableHeaders,
                tableRows
            };
        },
        MODAL: (step, base) => ({
            ...base,
            selectedModalId: step?.selectedModalId,
            btnType: step?.btnType,
            text: step?.text
        }),
        TABS: (step, base) => ({
            ...base,
            tabsData: JSON.parse(step?.tabsData)
        }),
        STOPWATCH: (step, base) => ({
            ...base,
            includeSeconds: step?.includeSeconds
        }),
        EDITOR: (step, base) => ({
            ...base,
            editAsHtml: step?.editAsHtml,
            editorState: step?.editorState
        }),
        ACCORDION: (step, base) => ({
            ...base,
            accordionData: JSON.parse(step?.accordionData)
        }),
        TEXT_ONLY_DIGITAL_CHECKLIST: (step, base) => ({
            ...base,
            checkListTextData: JSON.parse(step?.checkListTextData)
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        SET_BY_TEACHER: (step: any, base: any) => ({
            ...base,
            setByTeacherData: step?.setByTeacherData
                ? {
                      heading: step.setByTeacherData.heading,
                      subHeading: step.setByTeacherData.subHeading,
                      type: step.setByTeacherData.type
                  }
                : null
        })
    };

    return steps.map((step) => {
        let newStep = baseStepObject(step);

        if (stepSpecifics[step?.stepType]) {
            newStep = stepSpecifics[step?.stepType](step, newStep);
        }

        return newStep;
    });
};

export const isMobileScreen = () => {
    return window.innerWidth <= 768; // Adjust the value as needed
};

export const ViewAsEntity = (path) => {
    const newPath = path?.split('/')?.[1];

    switch (newPath) {
        case 'parent':

        case 'child':

        case 'topic':

        case 'activity':
            return 'Parent';

        case 'school':

        case 'class':

        case 'pupil':
            return 'Teacher';

        default:
            return 'Admin';
    }
};

export const getChildRoute = (value) => {
    if (!value?.type) return;

    if (isMobileScreen()) {
        return `/child/${value.id}`;
    }

    if ([PupilType.BOTH, PupilType.READING].includes(value?.type)) {
        return `/child/${value.id}/reading`;
    } else if (value?.type === PupilType.TOPIC) {
        return `/child/${value.id}/topics`;
    }
};

/**
 * Parses the images for a step into the files array.
 *
 * @param {*} step the step currently in use
 * @param {File[]} files the files array (which will be modified)
 * @param {*} imageCarouselData taken from step
 * @param {*} checklistImageData taken from step
 * @param {*} diceProperties taken from step
 * @param {*} carouselData taken from step
 */
function parseStepImages(step, files, imageCarouselData, checklistImageData, diceProperties, carouselData) {
    if (step?.fileIdentifier && step?.fileName) {
        for (const uri of [step?.audioUrl, step?.imageUrl, step?.downloadUrl]) {
            const file = detectDataUriFile(uri, step.fileName, step.fileIdentifier);

            if (file) files.push(file);
        }
    }

    for (const dataContainer of [imageCarouselData, checklistImageData, carouselData]) {
        if (dataContainer?.length > 0) {
            for (const image of dataContainer) {
                const file = detectDataUriFile(image?.imageUrl, image?.fileName, image?.fileIdentifier);

                if (file) {
                    files.push(file);
                }
            }
        }
    }

    if (diceProperties?.length > 0) {
        for (const diceProperty of diceProperties) {
            if (diceProperty?.images?.length > 0) {
                diceProperty?.images.forEach((image, index) => {
                    const file = detectDataUriFile(image, diceProperty?.fileNames?.[index], diceProperty?.fileIds?.[index]);

                    if (file) {
                        files.push(file);
                        diceProperty.fileNames[index] = file.name;
                    }
                });
            }
        }
    }
}

/**
 * Checks if a URI is a base64 data URI, and if it is, creates an {@link File}.
 *
 * @param {string} uri the uri to parse
 * @param {string} fileName the name of the file to create
 * @param {string} fileIdentifier the ID of the file to be appended to the file name
 * @return {File | null} the generated file, or null if none could be generated
 */
export function detectDataUriFile(uri, fileName, fileIdentifier) {
    if (uri && uri.startsWith('data:')) {
        const newFile = _getBase64ToFile(uri, `${fileName.trim()}-${fileIdentifier}`, true);

        return newFile;
    }

    return null;
}

const FILE_EXTENSION_PATTERN = /\.[^/.]+$/;

function getBaseName(fileName: string | undefined): string {
    return (fileName || 'photo').replace(FILE_EXTENSION_PATTERN, '');
}

interface SetByTeacherStepPhoto {
    preview: string;
    fileName?: string;
    fileIdentifier?: string;
}

interface SetByTeacherFormValues {
    setByTeacherStepIds?: Record<string, null | SetByTeacherStepPhoto | undefined>;
    setByTeacherSteps?: Array<{ stepId: string; filename?: string | null }>;
    setByTeacherStepMessages?: Record<string, string | undefined>;
}

export function buildSetByTeacherFormData(values: SetByTeacherFormValues) {
    const setByTeacherStepIds: string[] = [];

    const file: File[] = [];

    Object.entries(values.setByTeacherStepIds || {}).forEach(([stepId, photo]) => {
        if (photo === null) {
            setByTeacherStepIds.push(stepId);
        } else if (photo?.preview) {
            const baseName = getBaseName(photo.fileName);

            // fall back to stepId for entries saved before fileIdentifier was introduced
            const fileIdentifier = photo.fileIdentifier || stepId;

            const f = detectDataUriFile(photo.preview, baseName, fileIdentifier);

            if (f) {
                setByTeacherStepIds.push(`${stepId}:${fileIdentifier}`);
                file.push(f);
            }
        }
    });

    const setByTeacherStepMessages: Array<{ stepId: string; parentMessage: string | null }> = [];

    const allSteps = values.setByTeacherSteps || [];

    allSteps.forEach((step) => {
        const photo = values.setByTeacherStepIds?.[step.stepId];

        const hasPhoto = photo === null ? false : photo !== undefined ? !!photo?.preview : !!step.filename;

        if (hasPhoto) {
            const parentMessage = values.setByTeacherStepMessages?.[step.stepId]?.trim() || null;

            setByTeacherStepMessages.push({ stepId: step.stepId, parentMessage });
        }
    });

    return {
        setByTeacherStepIds: setByTeacherStepIds.length ? setByTeacherStepIds : undefined,
        setByTeacherStepMessages: setByTeacherStepMessages.length ? setByTeacherStepMessages : undefined,
        file: file.length ? file : undefined
    };
}

export function validateSetByTeacherSteps(values: SetByTeacherFormValues, enabled: boolean) {
    if (!enabled) return {};

    const steps = values.setByTeacherSteps || [];

    if (!steps.length) return {};

    const hasAtLeastOne = steps.some((step) => {
        const upload = values.setByTeacherStepIds?.[step.stepId];

        if (upload === null) return false;

        if (upload !== undefined) return true;

        return !!step.filename;
    });

    if (!hasAtLeastOne) return { setByTeacherStepIds: 'Please upload at least one photo' };

    const messageWithoutPhoto = steps.some((step) => {
        const upload = values.setByTeacherStepIds?.[step.stepId];
        const hasPhoto = upload === null ? false : upload !== undefined ? !!upload?.preview : !!step.filename;
        const parentMessage = values.setByTeacherStepMessages?.[step.stepId]?.trim();

        return !!parentMessage && !hasPhoto;
    });

    return messageWithoutPhoto ? { setByTeacherStepIds: 'A message can only be added to a step that has a photo' } : {};
}

/**
 * readingLogsType gets the overall type of a group of reading logs.
 *
 * @param {string[]} allUserTypes all the user types in these reading log entries.
 * @returns {string} the overall type: PARENT, TEACHER or MIXED.
 */
export function readingLogsType(userType) {
    return userType?.reduce((existingType, newType) => {
        const parentReadingTypes = [PARENT, TOPICACCESS, MAGICPARENT];

        if (parentReadingTypes.includes(existingType) && parentReadingTypes.includes(newType)) return PARENT;
        if (existingType == TEACHER && newType == TEACHER) return TEACHER;

        return 'MIXED';
    });
}

export const showPupilHead = (pupil) => {
    return `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.PUPILMATHSCOTS}/${pupil?.currentMathscot?.character}/head_${pupil?.currentMathscot?.colour}.png`;
};

export const renderPupilImg = (pupil) => {
    if (pupil?.type === READING) {
        return `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/book_with_background.svg`;
    }

    if (pupil?.mathscotUrl?.thumbnailImage) {
        return showPupilHead(pupil);
    }

    if (isReadyTeddyEnabledClassOnly(pupil?.currentClassOrGroupAcrossClasses))
        return `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/teddy_with_background.svg`;

    return `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/question_with_background.svg`;
};

export const utilServerSideDeviceDetection = (context) => {
    const isServer = !!context.req;
    const userAgent = isServer ? context.req.headers['user-agent'] : navigator.userAgent;
    const isLine = /\bLine\//i.test(userAgent) || false;
    const isMobile = /(iPad|iPhone|Android|Mobile)/i.test(userAgent) || false;
    const rules = ['WebView', '(iPhone|iPod|iPad)(?!.*Safari/)', 'Android.*(wv|.0.0.0)'];

    const regex = new RegExp(`(${rules.join('|')})`, 'ig');
    const isInApp = Boolean(userAgent.match(regex));

    return {
        isMobile,
        isLine,
        isInApp,
        userAgent
    };
};

export const getPupilAccessRedirect = (token: IAuthToken, pupilId: string, resolvedUrl: string) => {
    if (!token || !pupilId) return null;

    if ([PARENT, MAGICPARENT, TOPICACCESS].includes(token?.userType) && !token?.pupilIds?.includes(pupilId)) {
        return {
            redirect: {
                permanent: false,
                destination: `/unauthorized?returnTo=${resolvedUrl}`
            }
        };
    }

    return null;
};

export const checkAccessAllowedAndGetInterstitial = async (context) => {
    setCookieShimFromContext(context);

    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];

    if (!accessToken) return false;

    const token = getJwtDecoded(accessToken) as IAuthToken;

    const client = getApolloClient();
    const { resolvedUrl } = context;

    const pupilId = context.query?.child_id || context.query?.pupil_id;
    const { activity_id, topic_id, pupiltopic_id } = context.query;

    const accessRedirect = getPupilAccessRedirect(token, pupilId, resolvedUrl);

    if (accessRedirect?.redirect) return accessRedirect;

    const getPupilActivity = gql`
        query getPupilActivity($id: String!) {
            getPupilActivity(id: $id) {
                pupil {
                    type
                    parents {
                        id
                        parentId
                        status
                        showInterstitial
                        interstitialContext {
                            isReadingSectionShown
                            isTopicsSectionShown
                        }
                    }
                }
            }
        }
    `;

    const getPupilTopic = gql`
        query getPupilTopic($id: String!) {
            getPupilTopic(id: $id) {
                pupil {
                    type
                    parents {
                        id
                        parentId
                        status
                        showInterstitial
                        interstitialContext {
                            isReadingSectionShown
                            isTopicsSectionShown
                        }
                    }
                }
            }
        }
    `;

    const getPupilTopicForScrapbook = gql`
        query getPupilTopicForScrapbook($pupilTopicId: String!) {
            getPupilTopicForScrapbook(pupilTopicId: $pupilTopicId) {
                pupil {
                    id
                    type
                    parents {
                        id
                        parentId
                        status
                        showInterstitial
                        interstitialContext {
                            isReadingSectionShown
                            isTopicsSectionShown
                        }
                    }
                    currentReadyTeddyTopicForScrapbook {
                        id
                    }
                }
            }
        }
    `;

    const getPupil = gql`
        query pupil($id: String) {
            pupil(id: $id) {
                id
                type
                parents {
                    id
                    parentId
                    status
                    showInterstitial
                    interstitialContext {
                        isReadingSectionShown
                        isTopicsSectionShown
                    }
                }
                currentReadyTeddyTopicForScrapbook {
                    id
                }
            }
        }
    `;

    try {
        let parentsData;
        let pupil;

        if (activity_id) {
            parentsData = await executeQuery(client, getPupilActivity, { id: activity_id });

            pupil = parentsData.getPupilActivity.pupil;
        } else if (topic_id) {
            parentsData = await executeQuery(client, getPupilTopic, { id: topic_id });
            pupil = parentsData.getPupilTopic.pupil;
        } else if (pupiltopic_id) {
            parentsData = await executeQuery(client, getPupilTopicForScrapbook, { pupilTopicId: pupiltopic_id });
            pupil = parentsData?.getPupilTopicForScrapbook?.pupil;
        } else {
            parentsData = await executeQuery(client, getPupil, { id: pupilId });
            pupil = parentsData.pupil;
        }

        // If the parent is trying to access the scrapbook but the pupil doesn't have a ready teddy topic for scrapbook, redirect them to the child's main page
        if (resolvedUrl.includes('scrapbook') && !pupil?.currentReadyTeddyTopicForScrapbook) {
            return {
                redirect: {
                    permanent: false,
                    destination: `/child/${pupil?.id}`
                }
            };
        }

        const pupilParent = (pupil?.parents || []).find((pupilParent) => pupilParent?.parentId === token?.sub);

        const shouldSeeTopicSection =
            pupilParent?.interstitialContext?.isTopicsSectionShown === false && [PupilType.BOTH, PupilType.TOPIC].includes(pupil?.type);
        const shouldSeeReadingSection =
            pupilParent?.interstitialContext?.isReadingSectionShown === false && [PupilType.BOTH, PupilType.READING].includes(pupil?.type);

        if (
            [PARENT, MAGICPARENT, TOPICACCESS].includes(token?.userType) &&
            (pupilParent?.showInterstitial ||
                pupilParent?.status === PupilParentStatus.INVITED ||
                shouldSeeTopicSection ||
                shouldSeeReadingSection)
        ) {
            return {
                redirect: {
                    permanent: false,
                    destination: `/welcome/${pupilParent?.id}?nextRoute=${resolvedUrl}`
                }
            };
        }

        return false;
    } catch (error) {
        const forbiddenRedirect = getForbiddenRedirect(error, resolvedUrl);

        if (forbiddenRedirect?.redirect) return forbiddenRedirect;

        return {
            redirect: {
                permanent: false,
                destination: '/'
            }
        };
    }
};

export const isCurrentClass = async (context) => {
    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];
    const { resolvedUrl } = context;

    if (!accessToken) return false;

    const client = getApolloClient();

    const pupilId = context.query?.child_id || context.query?.pupil_id;
    const { activity_id, topic_id } = context.query;

    const getPupilActivity = gql`
        query getPupilActivity($id: String!) {
            getPupilActivity(id: $id) {
                pupil {
                    id
                    isInSchoolClassOrGroupAcrossClasses
                    hasTopicsInCurrentAcademicYear
                }
            }
        }
    `;

    const getPupilTopic = gql`
        query getPupilTopic($id: String!) {
            getPupilTopic(id: $id) {
                pupil {
                    id
                    isInSchoolClassOrGroupAcrossClasses
                    hasTopicsInCurrentAcademicYear
                }
            }
        }
    `;

    const getPupil = gql`
        query pupil($id: String) {
            pupil(id: $id) {
                id
                isInSchoolClassOrGroupAcrossClasses
                hasTopicsInCurrentAcademicYear
            }
        }
    `;

    try {
        let parentsData;
        let pupil;

        if (activity_id) {
            parentsData = await executeQuery(client, getPupilActivity, { id: activity_id });
            pupil = parentsData?.getPupilActivity?.pupil;
        } else if (topic_id) {
            parentsData = await executeQuery(client, getPupilTopic, { id: topic_id });
            pupil = parentsData?.getPupilTopic?.pupil;
        } else {
            parentsData = await executeQuery(client, getPupil, { id: pupilId });
            pupil = parentsData?.pupil;
        }

        if (
            (pupil?.isInSchoolClassOrGroupAcrossClasses === false || !pupil?.hasTopicsInCurrentAcademicYear) &&
            !(resolvedUrl.includes('history') || resolvedUrl.includes('trophies'))
        ) {
            return {
                redirect: {
                    permanent: false,
                    destination: `/child/${pupilId ?? pupil.id}/trophies`
                }
            };
        }

        return false;
    } catch (error) {
        console.log('error:', error);
    }
};

async function executeQuery(client, query, variables) {
    const { data } = await client.query({
        query,
        variables
    });

    return data;
}

export const hasNonNullId = (arr) => arr?.filter((item) => item?.id != null);

export function sendGtagEvent(eventCategory, eventAction, eventLabel, eventValue) {
    window.dataLayer?.push({
        event: eventAction,
        event_category: eventCategory,
        event_label: eventLabel,
        value: eventValue
    });
}

export function trackFilterItems(values, title) {
    const trackedAttrs = {};

    ['year', 'subject', 'domain'].forEach((key) => {
        trackedAttrs[key] = hasNonNullId(values[key])?.map((v) => v.value);
    });

    window.dataLayer?.push({
        event: 'Filter_item',
        search: values['search'],
        event_value: 1,
        page_title: title,
        // Track non-null ids for 'year', 'subject', and 'domain'
        ...trackedAttrs
    });
}

export const parseErrorDetails = (err) => {
    try {
        if (!err || !err.message) {
            const errorObject = {
                ERROR_TYPE: 'Unknown',
                ERROR_DETAILS: 'Error object does not have a message property.',
                SUGGESTION: 'Ensure that the error object contains a message property.'
            };

            return <InputField multiline value={JSON.stringify(errorObject, null, 4)} />;
        }

        // Extract the message from the error
        const { message } = err;

        // Regular expressions to capture various parts of the error messages
        const locationRegex = /Parse error on line (\d+):/;
        const detailRegex = /Parse error on line \d+:[\s\S]*?(--\^)/;

        // Extract the error location, details, expected tokens, and the actual token found
        const [, line] = message.match(locationRegex) || [];
        const [, arrow] = message.match(detailRegex) || [];

        // Extract the specific error detail using the caret or arrow indicator
        const errorDetailStartIndex = message.indexOf(arrow || '--^') + (arrow ? arrow.length : 3);
        const errorDetail = message.substring(errorDetailStartIndex).trim().split('\n')[0];

        // Construct the JSON object
        const errorObject = {
            ERROR_TYPE: 'Parse Error',
            ERROR_LOCATION: line ? `Line ${line}` : 'Unknown Location',
            ERROR_DETAILS: errorDetail
        };

        return <InputField multiline value={JSON.stringify(errorObject, null, 4)} />;
    } catch {
        const errorObject = {
            ERROR_TYPE: 'Unknown',
            ERROR_DETAILS: 'Error object does not have a message property.',
            SUGGESTION: 'Ensure that the error object contains a message property.'
        };

        return <InputField multiline value={JSON.stringify(errorObject, null, 4)} />;
    }
};

export const getTopicType = (isReading) => {
    if (isReading) {
        return READING;
    }

    return TOPIC;
};

export const getCardBackgroundImageName = (type) => {
    if (type === READING) {
        return 'READING-bg';
    }

    return 'TOPICbg';
};

export const getFeedbackType = (type) => {
    if (type === READING) {
        return READING;
    }

    if (type === SCRAPBOOK) {
        return SCRAPBOOK;
    }

    return TOPIC;
};

export function escapeHtmlTags(unsafeValue) {
    return unsafeValue.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const getActivityComponentName = (details?: string | null): string | null => {
    if (!details) return null;

    try {
        return JSON.parse(details)?.activityComponentName ?? null;
    } catch (error) {
        if (typeof window !== 'undefined') {
            window.newrelic?.noticeError(error, { caught: true, handled: true });
            console.warn('Failed to parse activity details JSON', error);
        }

        return null;
    }
};

export function isPwa() {
    return window.matchMedia('(display-mode: standalone)').matches;
}

export const getPupilStatusBorderColor = (pupilStatus) => {
    if (pupilStatus === PupilStatus.ACTIVE) {
        return 'border-active';
    }

    if (pupilStatus === PupilStatus.REGISTERED) {
        return 'border-inactive';
    }

    return 'border-warning';
};

export const countWithPlural = (text, count, showCount = true) => {
    const suffix = count === 1 ? '' : 's';

    if (!showCount) {
        return `${text}${suffix}`;
    }

    return `${count} ${text}${suffix}`;
};

// Convert Hex to RGB
function hexToRgb(hex) {
    hex = hex.replace(/^#/, ''); // Remove the hash symbol
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return [r, g, b];
}

// Calculate Relative Luminance
function relativeLuminance(rgb) {
    const [r, g, b] = rgb.map((channel) => {
        const c = channel / 255;

        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Check Contrast Against WCAG for Large Text (3:1 ratio)
export function checkContrast(textColorHex, borderColorHex) {
    const textColor = hexToRgb(textColorHex);
    const borderColor = hexToRgb(borderColorHex);

    let lum1 = relativeLuminance(textColor);
    let lum2 = relativeLuminance(borderColor);

    // Ensure lum1 is the brighter color
    if (lum1 < lum2) {
        [lum1, lum2] = [lum2, lum1];
    }

    const ratio = (lum1 + 0.05) / (lum2 + 0.05);

    // For bold 34px text, we need a minimum contrast ratio of 3:1
    return ratio >= 3;
}

export function doesHtmlContainsText(html) {
    return (
        '' !==
        (html ?? '')
            // replace html tag with content
            .replace(/<([^>]+?)([^>]*?)>(.*?)<\/\1>/gi, '$1')
            // remove remaining self closing tags
            .replace(/(<([^>]+)>)/gi, '')
            // remove extra space at start and end
            .trim()
    );
}

/**
 *
 * @param {string} description
 * @param {Array<{ id: string, pupilName: string }} pupilsList
 * @returns {boolean}
 * During logging reading feedback as a teacher with group of pupils, we need to check if the pupil name exists in the description
 */

export const checkPupilsNameExistInDescription = (description, pupilsList) => {
    return pupilsList.some((pupil) => {
        /**
         * Split the pupil name into an array of words to check if any of the words are present in the description
         */
        const pupilName = pupil?.pupilName?.toLowerCase()?.split(' ');

        return pupilName.some((words) => {
            if (!/^[a-z]+$/.test(words)) return false;

            //Check the pupil name is present in the description
            return new RegExp(`\\b${words}\\b`, 'i').test(description);
        });
    });
};

/**
 * Determines whether the view is for a teacher or a parent based on the router query and pathname.
 *
 * @param {import('next/router').NextRouter} router - The Next.js router instance.
 * @returns {'TEACHER' | 'PARENT' | null} - Returns `TEACHER`, `PARENT`, or `null` based on the route.
 *
 * Conditions:
 * - If the teacher is on a pupil's reading log page or pupil's detail page → `TEACHER`
 * - If the teacher is on the reading week-by-week page → `TEACHER`
 * - If the teacher is on the reading log page → `TEACHER`
 * - If the teacher is on the feed page → `TEACHER`
 * - If `child_id` is present → `PARENT`
 */
export const viewByTeacherOrParent = (router) => {
    const queryParams = router.query;

    if (
        queryParams?.pupil_id ||
        ['/class/[class_id]/readingweek', '/school/[school_id]/log-reading', '/feed/[user_id]', '/school/[school_id]/feed'].some((path) =>
            router.pathname.includes(path)
        )
    )
        return TEACHER;

    if (queryParams?.child_id) return PARENT;

    return null;
};

export const refetchQueriesAfterUpdateOrDeleteFeedback = (userId, pupilId, topicId, router) => {
    const refetchQueriesForTeacherSide = [];

    const viewBy = viewByTeacherOrParent(router);

    if (viewBy === TEACHER) {
        if (pupilId) {
            refetchQueriesForTeacherSide.push(
                { query: getReadingTopics, variables: { pupilId } },
                { query: getPupilReadingTopicsForPupilReadingTab, variables: { pupilId } }
            );
        }

        // if user is on week by week page, refetch the reading topic for the week
        if (router?.query?.class_id) {
            refetchQueriesForTeacherSide.push({
                query: getClassReadingTopicForWeekByWeek,
                variables: { classId: router?.query?.class_id, topicId: router?.query?.id }
            });

            refetchQueriesForTeacherSide.push({
                query: getGroupAcrossClassesReadingTopicForWeekByWeek,
                variables: { classId: router?.query?.class_id, topicId: router?.query?.id }
            });
        }

        if (topicId && pupilId) {
            refetchQueriesForTeacherSide.push({
                query: getPupilReadingNoteForReadingLog,
                variables: { pupilId, pupilTopicId: topicId }
            });
        }

        if (userId) {
            refetchQueriesForTeacherSide.push({
                query: getUserForReadingLog,
                variables: { id: userId }
            });
        }
    } else if (viewBy === PARENT) {
        if (pupilId && topicId) {
            refetchQueriesForTeacherSide.push(
                { query: getReadingTopics, variables: { pupilId } },
                { query: getPupilReadingNoteForReadingLog, variables: { pupilId, pupilTopicId: topicId } }
            );
        }
    }

    return refetchQueriesForTeacherSide;
};

export const getShortRelativeTime = (date) => {
    if (!date) return '-';

    // Customize the locale to use short time formats
    moment.updateLocale('en', {
        relativeTime: {
            past: '%s ago',
            s: '%d sec', // 1 sec
            ss: '%d sec', // 10sec, 20sec
            m: '1 min', // 1 min
            mm: '%d min', // 10min, 20min
            h: '1 hr', // 1 hr
            hh: '%d hr', // 10hr, 20hr
            d: '1 day', // 1 day
            dd: '%d days', // 10 days, 20 days
            M: '1 month', // 1 month
            MM: '%d months', // 10 months, 11 months
            y: '1 year', // 1 year
            yy: '%d years' // 10 years, 20 years
        }
    });

    return moment(date).fromNow();
};

export const getReceptionYearGroupId = (yearGroups) => {
    return yearGroups?.find((yearGroup) => yearGroup?.year?.toLowerCase() == 'reception')?.id ?? '';
};

interface FeedbackForSameDayEnrichment {
    id: string;
    type?: string;
    bookReadAt?: string;
    userType?: string;
    includeInReadingTarget?: boolean;
    originalFeedbackId?: string | null;
}

/**
 * Enriches a flat list of feedback entries with `isOfSameDay` and `showText` flags,
 * which drive accordion expansion behaviour in the activity feed cards.
 *
 * **How it works**
 *
 * For non-READING entries, `isOfSameDay` is always `false` and `showText` is `null`
 * — no grouping logic applies.
 *
 * For READING entries the function groups them by `bookReadAt` date. Within each
 * same-day group it elects one "primary" entry using `findPrimaryEntry`:
 *   - Scanning from oldest to newest, the first teacher entry that counts towards
 *     the reading target wins; otherwise the first parent/topic-access entry wins.
 *
 * Every entry that is *not* the primary gets `isOfSameDay: true`, collapsing it
 * under the primary in the UI. Its `showText` value tells the card which label to
 * render:
 *   - `'FIRST_ENTRY'`    — this entry appears before the primary in the list
 *   - `'WEEKLY_TARGET'`  — this entry appears after the primary
 *
 * Entries that are edited copies (`originalFeedbackId` is set) are excluded from
 * same-day grouping and always receive `isOfSameDay: false`.
 *
 * @param feedbacks - Array of feedback items to enrich. Must be pre-sorted
 *   descending by date (newest first) as returned by the API.
 * @returns A new array where every item is spread with `isOfSameDay` and `showText`.
 */
export const enrichFeedbacksWithSameDayFlag = <T extends FeedbackForSameDayEnrichment>(
    feedbacks: T[]
): (T & { isOfSameDay: boolean; showText: string | null })[] => {
    const findIndexById = (array: T[], id: string) => array.findIndex((item) => item.id === id);

    const findPrimaryEntry = (array: T[]): { id: string | null; index: number } => {
        for (let i = array.length - 1; i >= 0; i--) {
            const item = array[i];

            if (item.userType === TEACHER && item.includeInReadingTarget) {
                return { id: item.id, index: i };
            }

            if ([TOPICACCESS, PARENT, MAGICPARENT].includes(item.userType)) {
                return { id: item.id, index: i };
            }
        }

        return { id: null, index: -1 };
    };

    return feedbacks.map((feedback) => {
        if (feedback.type !== READING) {
            return { ...feedback, isOfSameDay: false, showText: null };
        }

        const sameDayEntries = feedbacks.filter(
            (x) => new Date(x.bookReadAt).toDateString() === new Date(feedback.bookReadAt).toDateString() && !feedback.originalFeedbackId
        );

        const primary = findPrimaryEntry(sameDayEntries);

        if (primary.id !== feedback.id) {
            const indexId = findIndexById(sameDayEntries, feedback.id);

            return {
                ...feedback,
                isOfSameDay: true,
                showText: indexId < primary.index ? 'FIRST_ENTRY' : 'WEEKLY_TARGET'
            };
        }

        return { ...feedback, isOfSameDay: false, showText: null };
    });
};

export const getPluralizedLabel = (count, label, suffix = 's') => {
    return count === 1 ? label : `${label}${suffix}`;
};

export const renderClassIcon = (classData) => {
    let classIcon = 'notIsFullProgramme_book.png';
    let isFullProgramOrOnlyReadyTeddy = false;

    if (classData?.isGroupAcrossClasses) {
        classIcon = 'group_across_classes_icon.svg';
        isFullProgramOrOnlyReadyTeddy = true;
    } else if (classData?.isFullProgramme) {
        classIcon = 'fullProgramme_book.png';
        isFullProgramOrOnlyReadyTeddy = true;
    } else if (classData?.isReadyTeddyEnabled && !classData?.IsReadingLogsEnabled) {
        classIcon = 'readyTeddy_bear.svg';
        isFullProgramOrOnlyReadyTeddy = true;
    }

    return {
        classIcon: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${classIcon}`,
        isFullProgramOrOnlyReadyTeddy,
        isGroupAcrossClasses: classData?.isGroupAcrossClasses || false
    };
};

export const isReadyTeddyEnabledClassOnly = (schoolClass: ILwpSchoolClass) => {
    return schoolClass?.isReadyTeddyEnabled && !schoolClass?.isFullProgramme && !schoolClass?.IsReadingLogsEnabled;
};

export const isPupilActiveInCurrentAcademicYear = (pupil: IPupil) => {
    if (pupil?.isInSchoolClassOrGroupAcrossClasses) return pupil?.hasTopicsInCurrentAcademicYear ?? false;

    return false;
};

export const getExternalResourcesLink = (token: { isSchoolLeader: boolean; userType: UserType }) => {
    const isAdminOrSchoolLeader = token?.isSchoolLeader || token?.userType === ADMIN;

    return isAdminOrSchoolLeader ? 'https://lwp.uk/leader-resources' : 'https://lwp.uk/teacher-resources';
};

export const isReadyTeddyNonPreadmission = (schoolClass: ILwpSchoolClass): boolean => {
    if (schoolClass?.isPreAdmissionClass) return false;
    if (schoolClass?.IsReadingLogsEnabled || schoolClass?.isFullProgramme) return false;

    return schoolClass?.isReadyTeddyEnabled ?? false;
};

export const defaultWeeklyReadingTarget = (): number => +sharedJson?.weeklyReadingTarget[3].key;

export const generateGraphId = (
    graphId: string,
    graphName: 'buildingEngagement' | 'engagementByYearGroup' | 'avgCompletionRateByYearGroup' | 'avgTopicSetByClass'
) => `${graphId}-${graphName}`;

export const getForbiddenRedirect = (err, resolvedUrl: string) => {
    const message = err?.message || err?.graphQLErrors?.[0]?.message || '';
    const code = err?.graphQLErrors?.[0]?.extensions?.code || err?.cause?.extensions?.code || '';

    if (message === 'Forbidden resource' || code === 'FORBIDDEN')
        return {
            redirect: {
                permanent: false,
                destination: `/unauthorized?returnTo=${resolvedUrl}`
            }
        };

    return null;
};

export const highChartPointFormatter = (count: number, lowColor: string, name: string, y: number, percentageOnYAxis: boolean) => {
    const pupilCount: string = count === 1 ? `${count} pupil` : `${count || 0} pupils`;

    return `<span style="color:${lowColor}">${name}</span>: <b>${y}${percentageOnYAxis ? '%' : ''}</b> of total ${pupilCount ? `<br /><p>(${pupilCount} in total)</p>` : ''}`;
};
