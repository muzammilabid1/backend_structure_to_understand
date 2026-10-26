/* eslint-disable @next/next/no-img-element */
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import SearchIcon from '@mui/icons-material/Search';
import { Collapse, debounce, List, TextField, useMediaQuery } from '@mui/material';
import { Autocomplete } from '@mui/material';
import { useTheme } from '@mui/styles';
import { FeatureTooltipTargets, ImportStatus } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import { useContext, useEffect, useMemo, useState } from 'react';

import { useDelegatedClaimsSubscriber } from '../../../context/DelegatedClaimsContext';
import { getSearchResults } from '../../../graphQl/queries';
import { SchoolClassStatus } from '../../../shared/Constant';
import { ADMIN, adminPath, CLASS, MINIO_PUBLIC_PATHS, PARENT, PUPIL, SCHOOL, SCHOOLLEADER, TEACHER } from '../../../shared/Constant';
import { toSpmDashboardUrl } from '../../../shared/externalAppLinks';
import { isAdminViewAsMode, ThemeContext } from '../../../shared/Services/handler';
import CommonNestedList from '../CommonNestedList';
import CommonPopOver from '../CommonPopOver';
import CommonSideBarMini from '../CommonSideBarMini';
import CommonListWithIcon from './../CommonListWithIcon';
import Divider from './../Divider';
import Heading1 from './../Typography/Heading1';
import SurveyModal from '../Modals/SurveyModal';
import { ExpandLess, ExpandMore } from '@mui/icons-material';

const CommonDrawer = ({
    getSchoolClassesData,
    getGroupsAcrossClassesData,
    getSchoolAllClassesData,
    preAdmissionClassesData,
    setOpen,
    toggle,
    adminAndTeacherProfilePopOverList,
    setToggle,
    userDetails,
    schoolDetails
}) => {
    const router = useRouter();
    const { token, userId } = useContext(ThemeContext);
    const theme = useTheme();
    const queryParams = useParams();

    const { schoolId: selectedSchoolIdForViewAsAdmin } = useDelegatedClaimsSubscriber();

    const isMediumDesktop = useMediaQuery(theme.breakpoints.down('lg'));
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const showSchoolLeaderSideBar = isAdminViewAsMode(token?.userType, router.pathname);

    const [keyword, setKeyword] = useState('');
    const [openSurveyModal, setOpenSurveyModal] = useState(false);
    const [allClassesCollapse, setAllClassesCollapse] = useState(false);
    const [preAdmissionClassesCollapse, setPreAdmissionClassesCollapse] = useState(false);

    const [getSearchResultsForSearchBar, { data: searchResult }] = useLazyQuery(getSearchResults);

    const schoolId = showSchoolLeaderSideBar ? selectedSchoolIdForViewAsAdmin : token?.schoolId;

    const getUrl = (searchResult) => {
        switch (searchResult?.type) {
            case PARENT:
                return `${adminPath}/parent/${searchResult?.id}`;

            case ADMIN:
                return `${adminPath}/admins/${searchResult?.id}`;

            case TEACHER:

            case SCHOOLLEADER:
                return `${adminPath}/teacher/${searchResult?.id}`;

            case CLASS:
                return `${adminPath}/class/${searchResult?.id}`;

            case PUPIL:
                return `${adminPath}/child/${searchResult?.id}`;

            case SCHOOL:
                return `${adminPath}/school/${searchResult?.id}`;

            case 'WONDESCHOOL':
                return `${adminPath}/school/${searchResult?.id}`;

            case 'WONDESCHOOLCLASS':
                return `${adminPath}/wondeclass/${searchResult?.wondeId}`;

            case 'WONDESTUDENT':
                return `${adminPath}/wondechild/${searchResult?.wondeId}`;

            case 'WONDECONTACT':
                return `${adminPath}/wondecontact/${searchResult?.wondeId}`;

            default:
                router?.push({ pathname: '/admin/search-results', query: { search: `${searchResult.name}` } });
                break;
        }
    };

    const _onChange = (_, value) => {
        if (value && typeof value === 'object') {
            router?.push({ pathname: getUrl(value) });
        } else if (value && typeof value === 'string') {
            router?.push({ pathname: '/admin/search-results', query: { search: `${value}` } });
        } else {
            return;
        }
    };

    const _onInputChange = (_, value) => {
        setKeyword(value);
        getSearchResultsForSearchBar({ variables: { query: value } });
    };

    const totalNumberOfPupilsWithoutClasses =
        schoolDetails?.pupilsWithoutClassesCount?.currentYear + schoolDetails?.pupilsWithoutClassesCount?.nextYearNonIgnoredPupils;

    const spmDashboardUrl = toSpmDashboardUrl();

    const adminTabs = [
        {
            text: 'Site data',
            isVisible: !token?.adminRestrictions?.siteData,
            labels: [
                {
                    text: 'All activity',
                    icon: 'query_builder',
                    route: `/admin/all-feeds`,
                    dataTest: 'all-activity-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/all-feeds`)
                },
                {
                    text: 'Schools',
                    icon: 'school',
                    route: '/admin/schools/active',
                    dataTest: 'schools-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/schools/active`)
                },
                {
                    text: 'Export data',
                    icon: 'class',
                    route: '/admin/export-data',
                    dataTest: 'export-data-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/export-data`)
                },
                // Another app on another host, so it cannot go through handleClickTabs: that calls
                // router.push, which only navigates within this origin.
                {
                    text: 'SPM Dashboard',
                    icon: 'open_in_new',
                    route: spmDashboardUrl,
                    external: true,
                    dataTest: 'spm-dashboard-common-drawer-list',
                    onClick: () => setToggle(false)
                }
            ]
        },
        {
            text: 'Regularly updated',
            isVisible: true,
            labels: [
                {
                    text: 'News',
                    icon: 'menu_book',
                    route: '/admin/news',
                    dataTest: 'news-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/news`)
                },
                {
                    text: 'Site forms',
                    icon: 'assignment',
                    route: '/admin/site-forms',
                    onClick: () => handleClickTabs(`/admin/site-forms`),
                    dataTest: 'site-forms-common-drawer-list'
                },
                {
                    text: 'Trophy certificates',
                    icon: 'emoji_events',
                    route: '/admin/trophy-certificates',
                    onClick: () => handleClickTabs(`/admin/trophy-certificates`),
                    dataTest: 'trophy-certificates-common-drawer-list'
                }
            ]
        },
        {
            text: 'Content creation',
            isVisible: true,
            labels: [
                {
                    text: 'Topics',
                    icon: 'topic',
                    route: '/admin/topics',
                    dataTest: 'topics-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/topics`)
                },
                {
                    text: 'Subjects',
                    icon: 'subject',
                    route: '/admin/subjects',
                    dataTest: 'subjects-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/subjects`)
                },
                {
                    text: 'Domains',
                    icon: 'topic',
                    route: '/admin/domains',
                    dataTest: 'domains-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/domains`)
                },
                {
                    text: 'Sequences',
                    icon: 'low_priority',
                    route: '/admin/sequences',
                    dataTest: 'sequences-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/sequences`)
                },
                {
                    text: 'Activity tabs/modals',
                    icon: 'add_to_queue',
                    route: '/admin/activity-modals',
                    dataTest: 'activity-tabs-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/activity-modals`)
                },
                {
                    text: 'Tags',
                    icon: 'tag',
                    route: '/admin/tags',
                    dataTest: 'tags-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/tags`)
                },
                {
                    text: 'Stickers',
                    image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/sticker_icon_inactive.svg`,
                    activeImage: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/sticker_icon_active.svg`,
                    route: '/admin/stickers',
                    dataTest: 'stickers-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/stickers`)
                },
                {
                    text: 'Partnerships',
                    icon: 'handshake',
                    route: '/admin/partnerships',
                    dataTest: 'partnerships-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/partnerships`)
                },
                {
                    text: 'Page announcements',
                    icon: 'insert_comment',
                    route: '/admin/announcements',
                    dataTest: 'page-announcements-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/announcements`)
                }
            ]
        },
        {
            text: 'Other settings',
            isVisible: true,

            labels: [
                {
                    text: 'Email templates',
                    icon: 'email',
                    route: '/admin/email-templates',
                    dataTest: 'email-templates-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/email-templates`)
                },
                {
                    text: 'Data queries',
                    icon: 'class',
                    route: '/admin/data-queries',
                    dataTest: 'data-queries-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/data-queries`)
                },
                {
                    text: 'FAQs',
                    icon: 'get_app',
                    route: '/admin/faqs',
                    dataTest: 'faqs-common-drawer-list',
                    onClick: () => handleClickTabs(`/admin/faqs`)
                },
                // Hiding Teacher resources tab from admin view for now
                // {
                //     text: 'Teacher resources',
                //     icon: 'dashboard',
                //     route: '/admin/teacher-resources',
                //     onClick: () => router?.push('/admin/teacher-resources')
                // },
                {
                    text: 'Public documents',
                    icon: 'file_upload',
                    route: '/admin/upload-file',
                    onClick: () => handleClickTabs(`/admin/upload-file`),
                    dataTest: 'public-documents-common-drawer-list'
                },
                {
                    text: 'Term dates',
                    icon: 'date_range',
                    route: '/admin/terms',
                    onClick: () => handleClickTabs(`/admin/terms`),
                    dataTest: 'term-dates-common-drawer-list'
                },
                {
                    text: 'Academic years',
                    icon: 'event',
                    route: '/admin/academic-years',
                    onClick: () => handleClickTabs(`/admin/academic-years`),
                    dataTest: 'academic-years-common-drawer-list'
                },
                ...(!token?.adminRestrictions?.siteAdmins
                    ? [
                          {
                              text: 'Site admins',
                              icon: 'supervisor_account',
                              route: '/admin/admins',
                              onClick: () => handleClickTabs(`/admin/admins`),
                              dataTest: 'site-admins-common-drawer-list'
                          }
                      ]
                    : []),
                {
                    text: 'Year groups',
                    icon: 'event',
                    route: '/admin/year-groups',
                    onClick: () => handleClickTabs(`/admin/year-groups`),
                    dataTest: 'year-groups-common-drawer-list'
                },
                {
                    text: 'Impact report email',
                    icon: 'email',
                    route: '/admin/impact-report-email',
                    onClick: () => handleClickTabs(`/admin/impact-report-email`)
                },
                {
                    text: 'Features',
                    icon: 'flag',
                    route: '/admin/features',
                    onClick: () => handleClickTabs(`/admin/features`),
                    dataTest: 'features-common-drawer-list'
                }
            ]
        },
        {
            text: 'Tech toolkit',
            isVisible: !token?.adminRestrictions?.techToolKit,
            labels: [
                {
                    text: 'Run tasks',
                    icon: 'work',
                    route: '/admin/run-cron-jobs',
                    onClick: () => router?.push('/admin/run-cron-jobs'),
                    dataTest: 'run-tasks-common-drawer-list'
                },
                {
                    text: 'Bad email parameters',
                    icon: 'email',
                    route: '/admin/email-bad-params',
                    onClick: () => router?.push('/admin/email-bad-params'),
                    dataTest: 'bad-email-parameters-common-drawer-list'
                },
                {
                    text: 'Failed Emails',
                    icon: 'email',
                    route: '/admin/failed-emails',
                    onClick: () => router?.push('/admin/failed-emails'),
                    dataTest: 'failed-emails-common-drawer-list'
                },
                {
                    text: 'Site parameters',
                    icon: 'label_important',
                    route: '/admin/parameters',
                    onClick: () => router?.push('/admin/parameters'),
                    dataTest: 'site-parameters-common-drawer-list'
                },
                {
                    text: 'Send test email',
                    icon: 'email',
                    route: '/admin/test-email',
                    onClick: () => router?.push('/admin/test-email'),
                    dataTest: 'send-test-email-common-drawer-list'
                }
            ]
        }
    ];

    const isAdminOrLeader = token?.userType === ADMIN || token?.userType === SCHOOLLEADER;
    const activityFeedRoute = isAdminOrLeader ? `/school/${schoolId}/feed` : `/feed/${userId}`;

    const schoolLeaderAndTeacherTabs = [
        {
            text: 'Actions',
            labels: [
                {
                    key: 'setTopic',
                    text: 'Set a topic',
                    icon: 'topic',
                    dataTest: 'sidebar-set-a-topic-btn',
                    route: `/school/${schoolId}/topic-library`,
                    // The Auto schedule tab and the subject pages it leads to sit under Set a topic.
                    activeRoutes: [`/school/${schoolId}/auto-schedule`],
                    onClick: () => handleClickTabs(`/school/${schoolId}/topic-library`)
                },
                {
                    key: 'logReading',
                    text: 'Log reading',
                    icon: 'local_library',
                    dataTest: 'sidebar-log-reading-btn',
                    route: `/school/${schoolId}/log-reading`,
                    onClick: () => handleClickTabs(`/school/${schoolId}/log-reading`)
                },
                {
                    key: 'pupilsWithoutClass',
                    text: 'Pupils not in a class',
                    icon: 'group',
                    badge: totalNumberOfPupilsWithoutClasses || null,
                    route: `/school/${schoolId}/pupil-not-assigned`,
                    dataTest: 'sidebar-pupils-not-in-class-btn',
                    onClick: () => handleClickTabs(`/school/${schoolId}/pupil-not-assigned?type=current-year-pupils`)
                },
                {
                    key: 'dataChangesReview',
                    text: `Changes from ${schoolDetails?.misName === 'CSV' ? 'CSV' : 'wonde'}`,
                    icon: 'sync',
                    route: `/school/${schoolId}/data-changes`,
                    dataTest: 'sidebar-data-changes-review-btn',
                    badge: schoolDetails?.pendingImportActionsCount || null,
                    onClick: () => handleClickTabs(`/school/${schoolId}/data-changes`)
                },
                {
                    key: 'survey',
                    text: userDetails?.showInterstitial?.name ?? 'Survey',
                    dataTest: 'sidebar-site-form-btn',
                    icon: (
                        <div className="survey-drawer">
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/exclamation_mark.png`}
                            />
                        </div>
                    ),
                    onClick: () => setOpenSurveyModal(true)
                }
            ]
        },
        {
            text: 'Overview & insights',
            labels: [
                {
                    key: 'schoolOverview',
                    text: 'School overview',
                    dataTest: 'school-overview-tab',
                    icon: 'home',
                    route: `/school/${schoolId}`,
                    onClick: () => handleClickTabs(`/school/${schoolId}`)
                },
                {
                    key: 'activityFeed',
                    text: 'Activity feed',
                    dataTest: 'activity-feed-tab',
                    icon: 'query_builder',
                    route: activityFeedRoute,
                    onClick: () => handleClickTabs(activityFeedRoute)
                },
                {
                    key: 'news',
                    text: 'News',
                    icon: 'menu_book',
                    route: '/lwpnews',
                    onClick: () => handleClickTabs('/lwpnews')
                },
                {
                    key: 'schoolAnalytics',
                    text: 'Analytics & reports',
                    icon: 'ballot',
                    route: `/school/${schoolId}/reports`,
                    dataTest: 'sidebar-school-analytics-and-reports-btn',
                    onClick: () => handleClickTabs(`/school/${schoolId}/reports`)
                }
            ]
        }
    ];

    const options = (searchResult?.getSearchResults || []).map((option) => ({ ...option }));

    let activeSideBar = true;

    const getCombinedClassData = () =>
        [
            ...(getSchoolAllClassesData?.getSchoolClassesAndGroups || []),
            ...(getSchoolClassesData?.getSchoolClassesAndGroups || []),
            ...(preAdmissionClassesData || [])
        ].filter((item) => item.status === SchoolClassStatus.ACTIVE);

    const isAdminOrSchoolLeader = token?.isSchoolLeader || showSchoolLeaderSideBar;

    const isTopicLibraryVisible = (classData) => {
        const hasMoneySkillsEligibleClass =
            schoolDetails?.isMoneySkillsAvailable &&
            classData.some((item) => (item?.isMyClass || isAdminOrSchoolLeader) && (item.isFullProgramme || item.IsReadingLogsEnabled));

        const hasVisibleClassOrGroup = classData.some((item) =>
            item?.isMyClass || isAdminOrSchoolLeader
                ? item.isFullProgramme || item.isReadyTeddyEnabled
                : item?.groups?.some((group) => group?.hasTopics)
        );

        return hasVisibleClassOrGroup || hasMoneySkillsEligibleClass;
    };

    const isLogReadingVisible = (classData) =>
        classData.some((item) =>
            item?.isMyClass || isAdminOrSchoolLeader ? item.IsReadingLogsEnabled : item?.groups?.some((group) => group?.isReadingClass)
        );

    const classData = getCombinedClassData();
    const topicLibraryVisible = isTopicLibraryVisible(classData);
    const logReadingVisible = isLogReadingVisible(classData);

    const handleClickTabs = (path) => {
        router.push(path);
        setToggle(false);
    };

    const isSchoolLeaderTab = (token?.userType === ADMIN && showSchoolLeaderSideBar) || token?.isSchoolLeader;

    /**
     * pupilsWithoutClass: This tab is visible for school leaders only if there are pupils without classes or if the user is already on the page.
     *  If the user is already on the page and the leader has sorted out all pupils without classes, then the tab still needs to be visible whenever the user is on the page.
     */

    const pathname = router?.pathname;

    const labelVisibility = {
        setTopic: topicLibraryVisible,
        logReading: logReadingVisible,
        pupilsWithoutClass: isSchoolLeaderTab ? totalNumberOfPupilsWithoutClasses > 0 || pathname?.includes('/pupil-not-assigned') : false,
        survey: Boolean(userDetails?.showInterstitial?.id) && pathname !== '/feedback',
        schoolOverview: isSchoolLeaderTab,
        activityFeed: true,
        news: true,
        resources: true,
        schoolAnalytics: isSchoolLeaderTab,
        dataChangesReview: isSchoolLeaderTab
            ? schoolDetails?.isDataImportReviewEnabledForSchool && schoolDetails?.pendingImportActionsCount > 0
            : false
    };

    const isAdminNotViewingMode = token?.userType === ADMIN && !showSchoolLeaderSideBar;

    const myClassesAndGroups = (getSchoolClassesData?.getSchoolClassesAndGroups ?? [])?.filter(
        (item) => item.status !== SchoolClassStatus.HIDDEN
    );
    const myGroupsAcrossClasses = getGroupsAcrossClassesData?.getGroupsAcrossClasses ?? [];
    const getSchoolAllClasses = (getSchoolAllClassesData?.getSchoolClassesAndGroups ?? [])?.filter(
        (item) => item.status !== SchoolClassStatus.HIDDEN
    );

    const preAdmissionClasses = preAdmissionClassesData?.filter((item) => item.status !== SchoolClassStatus.HIDDEN);

    const siteBarTabs = useMemo(() => {
        if (![ADMIN, TEACHER].includes(token?.userType)) return [];

        if ((token?.userType === ADMIN && showSchoolLeaderSideBar) || token?.userType === TEACHER) {
            return schoolLeaderAndTeacherTabs
                .map((tab) => {
                    const visibleLabels = tab.labels.filter((label) => labelVisibility[label.key]);
                    return visibleLabels.length > 0 ? { ...tab, labels: visibleLabels } : null;
                })
                .filter(Boolean);
        }

        if (isAdminNotViewingMode) {
            return adminTabs.filter((tab) => tab.isVisible);
        }
    }, [token, showSchoolLeaderSideBar, schoolLeaderAndTeacherTabs, adminTabs, isAdminNotViewingMode, labelVisibility]);

    const schoolLeaderFooterTabs = [
        isSchoolLeaderTab
            ? {
                  text: 'Settings',
                  icon: 'settings',
                  route: `/school/${schoolId}/settings`,
                  onClick: () => handleClickTabs(`/school/${schoolId}/settings`),
                  dataTest: 'school-settings'
              }
            : {
                  text: 'Tags',
                  icon: 'tag',
                  route: `/school/${schoolId}/pupil-tag`,
                  onClick: () => handleClickTabs(`/school/${schoolId}/pupil-tag`),
                  dataTest: 'pupil-tags'
              },
        {
            text: 'Help and resources',
            icon: 'help_outline',
            route: `/school/${schoolId}/resources`,
            onClick: () => handleClickTabs(`/school/${schoolId}/resources`)
        }
    ];

    return (
        <div className="side-drawer-container">
            {isMobile ? (
                <div className="drawer-header">
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/profile-logo.png`}
                        alt="Learning with Parents logo"
                        className="profile-logo"
                    />
                    <CommonPopOver text={`${token?.firstName} ${token?.lastName}`} icon="expand_more" iconClassName="ml2">
                        <CommonListWithIcon list={adminAndTeacherProfilePopOverList} />
                    </CommonPopOver>
                </div>
            ) : null}

            <div className={`sidebar-options-list-container ${isAdminNotViewingMode ? 'pb8' : ''}`} data-test={'common-drawer-list'}>
                {isAdminNotViewingMode && (
                    <div className="sidebar-options-list admin-search-bar-container">
                        <Heading1 text="Search Bar" />
                        <Divider />
                        <Autocomplete
                            className="admin-search-bar"
                            options={options.sort((a, b) => -b?.type.localeCompare(a?.type))}
                            groupBy={(option) => option?.type}
                            onChange={_onChange}
                            onInputChange={debounce(_onInputChange, 500)}
                            getOptionLabel={(option) => {
                                if (keyword.includes('@')) {
                                    return option.email ?? '';
                                } else if (keyword.includes('+')) {
                                    return option.phone ?? '';
                                } else {
                                    return option.name ?? '';
                                }
                            }}
                            style={{ paddingTop: 10 }}
                            onFocus={() => setOpen(true)}
                            onBlur={() => isMediumDesktop && setOpen(false)}
                            freeSolo
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: <SearchIcon icon="material-symbols:search" />
                                    }}
                                />
                            )}
                        />
                    </div>
                )}

                {siteBarTabs.map((tab, index) => (
                    <List className="sidebar-options-list" key={index}>
                        <div className="sidebar-tabs-header">
                            <Heading1 text={tab.text} />
                            <Divider />
                        </div>
                        <CommonListWithIcon
                            list={tab.labels}
                            input={{
                                userDetails,
                                isMobile,
                                toggle
                            }}
                        />
                    </List>
                ))}

                {token?.userType === TEACHER || token?.userType === ADMIN ? (
                    <>
                        {myClassesAndGroups?.length > 0 ? (
                            <List className="sidebar-options-list">
                                <div className="sidebar-tabs-header">
                                    <Heading1 text={'My classes'} id={FeatureTooltipTargets.MY_CLASSES_AND_GROUPS} />
                                    <Divider />
                                </div>
                                {myClassesAndGroups.map((item) => {
                                    const isClassActive =
                                        queryParams?.class_id == item?.id || item?.groups?.some((gro) => gro?.id == queryParams?.class_id);

                                    if (isClassActive) {
                                        activeSideBar = false;
                                    }

                                    return (
                                        <>
                                            <CommonNestedList
                                                data={item}
                                                isSchoolLeader={token?.isSchoolLeader}
                                                dataTest={`my-classes-common-drawer-list`}
                                                active={isClassActive}
                                            />
                                            <CommonSideBarMini data={item} active={isClassActive} />
                                        </>
                                    );
                                })}
                            </List>
                        ) : null}

                        {myGroupsAcrossClasses?.length > 0 ? (
                            <List className="sidebar-options-list">
                                <div className="sidebar-tabs-header">
                                    <Heading1 text={'My groups'} id={FeatureTooltipTargets.MY_CLASSES_AND_GROUPS} />
                                    <Divider />
                                </div>
                                {myGroupsAcrossClasses.map((item) => {
                                    const isClassActive =
                                        queryParams?.class_id == item?.id || item?.groups?.some((gro) => gro?.id == queryParams?.class_id);

                                    if (isClassActive) {
                                        activeSideBar = false;
                                    }

                                    return (
                                        <>
                                            <CommonNestedList
                                                data={item}
                                                isSchoolLeader={token?.isSchoolLeader}
                                                dataTest={`my-classes-common-drawer-list`}
                                                active={isClassActive}
                                            />
                                            <CommonSideBarMini data={item} active={isClassActive} />
                                        </>
                                    );
                                })}
                            </List>
                        ) : null}

                        {getSchoolAllClasses?.length > 0 && schoolDetails ? (
                            <List className="sidebar-options-list">
                                <div className="sidebar-tabs-header">
                                    <div
                                        className="all-classes-header"
                                        onClick={() => setAllClassesCollapse(!allClassesCollapse)}
                                        data-test="all-classes-collapse-header">
                                        <Heading1 text={`All ${schoolDetails?.curentPeriod?.shortName} classes`} />
                                        {allClassesCollapse ? <ExpandLess /> : <ExpandMore />}
                                    </div>
                                    <Divider />
                                </div>
                                <Collapse in={allClassesCollapse} timeout="auto" unmountOnExit>
                                    {getSchoolAllClasses.map((item) => {
                                        const isClassActive =
                                            queryParams?.class_id == item?.id ||
                                            item?.groups?.some((gro) => gro?.id == queryParams?.class_id);

                                        if (isClassActive) {
                                            activeSideBar = false;
                                        }

                                        return (
                                            <>
                                                <CommonNestedList
                                                    data={item}
                                                    isSchoolLeader={token?.isSchoolLeader}
                                                    active={isClassActive}
                                                    nonItalic={false}
                                                />
                                                <CommonSideBarMini data={item} active={isClassActive && activeSideBar} />
                                            </>
                                        );
                                    })}
                                </Collapse>
                            </List>
                        ) : null}

                        {preAdmissionClasses?.length > 0 && schoolDetails?.curentPeriod ? (
                            <List className="sidebar-options-list">
                                <div className="sidebar-tabs-header">
                                    <div
                                        className="all-classes-header"
                                        onClick={() => setPreAdmissionClassesCollapse(!preAdmissionClassesCollapse)}>
                                        <Heading1 text={`${schoolDetails?.curentPeriod?.nextPeriod?.shortName} classes`} />
                                        {preAdmissionClassesCollapse ? <ExpandLess /> : <ExpandMore />}
                                    </div>
                                    <Divider />
                                </div>
                                <Collapse in={preAdmissionClassesCollapse} timeout="auto" unmountOnExit>
                                    {preAdmissionClasses.map((item) => {
                                        const isClassActive =
                                            queryParams?.class_id == item?.id ||
                                            item?.groups?.some((gro) => gro?.id == queryParams?.class_id);

                                        if (isClassActive) {
                                            activeSideBar = false;
                                        }

                                        return (
                                            <>
                                                <CommonNestedList
                                                    data={item}
                                                    isSchoolLeader={token?.isSchoolLeader}
                                                    active={isClassActive}
                                                    nonItalic={false}
                                                />
                                                <CommonSideBarMini data={item} active={isClassActive && activeSideBar} />
                                            </>
                                        );
                                    })}
                                </Collapse>
                            </List>
                        ) : null}
                    </>
                ) : null}

                {!isAdminNotViewingMode ? (
                    <List className="sidebar-options-list sidebar-footer-container">
                        <CommonListWithIcon
                            list={schoolLeaderFooterTabs}
                            input={{
                                userDetails,
                                isMobile,
                                toggle
                            }}
                        />
                    </List>
                ) : null}
            </div>

            {openSurveyModal && <SurveyModal open={openSurveyModal} setOpen={setOpenSurveyModal} viewType={TEACHER} />}
        </div>
    );
};

CommonDrawer.propTypes = {
    getSchoolClassesData: PropTypes.object,
    getGroupsAcrossClassesData: PropTypes.object,
    getSchoolAllClassesData: PropTypes.object,
    adminAndTeacherProfilePopOverList: PropTypes.array,
    setOpen: PropTypes.func,
    open: PropTypes.bool,
    toggle: PropTypes.bool,
    preAdmissionClassesData: PropTypes.array,
    showSchoolLeaderSideBar: PropTypes.bool,
    userDetails: PropTypes.object
};

export default CommonDrawer;
