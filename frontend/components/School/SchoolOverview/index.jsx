import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';

import { setSchoolPeriodToCurrent } from '../../../graphQl/mutations';
import { getCookie, setCookie } from '../../../lib/manageCookies';
import { ADMIN, TEACHER } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonLoading from '../../Shared/CommonLoading';
import DialogWrapper from '../../Shared/DialogWrapper';
import SurveyModal from '../../Shared/Modals/SurveyModal';
import Heading1 from '../../Shared/Typography/Heading1';
import Heading2 from '../../Shared/Typography/Heading2';
import SchoolImportedDataSync from '../../Shared/SchoolImportedDataSync';
import Paragraph from '../../Shared/Typography/Paragraph';
import AutoSchedulePrompts from './AutoSchedulePrompts';
import ClassOverView from './ClassOverView';
import HeadCardSection from './HeadCardSection';
import MoneySkillsWelcomeModal, { isWelcomeSeenThisYear } from './MoneySkillsWelcomeModal';
import { wholeSchoolAutoSchedulePrompts } from '../WholeSchoolAutoSchedule/queries';
import { SubjectProgrammeType } from 'lwp-shared/enums';
import { getSchoolForSchoolOverviewPage } from '../../../graphQl/queries';
import { useDelegatedClaims } from '../../../context/DelegatedClaimsContext';

// Queries

const getUserForSchoolOverView = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            lastMoneySkillsAutoScheduleWelcomeSeen
            showInterstitial {
                id
                optedOut
            }
        }
    }
`;

const SchoolOverView = () => {
    const queryParams = useParams();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [openSurveyModal, setOpenSurveyModal] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const { callSnackbar, userId, token } = useContext(ThemeContext);
    const schoolId = queryParams?.school_id;
    const { setClaims } = useDelegatedClaims();

    useEffect(() => {
        setClaims({ schoolId });
    }, [schoolId]);

    const {
        loading,
        data,
        error: schoolError
    } = useQuery(getSchoolForSchoolOverviewPage, {
        variables: { id: schoolId },
        skip: !schoolId
    });

    const {
        error: getUserError,
        data: user,
        loading: getUserLoading
    } = useQuery(getUserForSchoolOverView, {
        variables: { id: userId },
        fetchPolicy: 'cache-first'
    });

    const [setSchoolPeriodToCurrentMutation, { loading: setSchoolPeriodToCurrentLoading }] = useMutation(setSchoolPeriodToCurrent);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, schoolError);
        handleErrorSnackbar(callSnackbar, getUserError);
    }, [getUserError, schoolError]);

    /*
     * The auto-schedule prompts (LEA-6688): programmes the school is entitled to, has published content
     * for this year, and has not scheduled yet. Fetched from the network every time, so a leader coming
     * back from scheduling does not see a prompt again from the cache. A failed request shows nothing:
     * it is a nudge, and the page's own content matters more.
     */
    const { data: promptsData, loading: promptsLoading } = useQuery(wholeSchoolAutoSchedulePrompts, {
        variables: { schoolId },
        skip: !schoolId,
        fetchPolicy: 'network-only'
    });
    const prompts = promptsData?.wholeSchoolAutoSchedulePrompts ?? [];

    /*
     * The Money Skills welcome (LEA-6505), once per academic year, built only from what this page already
     * loads, so it costs no request of its own. It shows when the prompts above include Money Skills (the
     * banner's rule) and this leader has not seen it this year, from their last sighting on the user and
     * the start of the school's current year on the school. Never for an admin viewing the school, so
     * they cannot use up a leader's view.
     */
    const client = useApolloClient();
    const isSeenThisYear = isWelcomeSeenThisYear(
        user?.getUser?.lastMoneySkillsAutoScheduleWelcomeSeen,
        data?.getSchool?.curentPeriod?.startDate
    );
    const moneySkillsPrompt = prompts.find((programme) => programme.programmeType === SubjectProgrammeType.MONEY_SKILLS);
    const welcomeLoading = getUserLoading || loading || promptsLoading;
    const [isWelcomeClosed, setIsWelcomeClosed] = useState(false);
    const welcome =
        token?.userType === ADMIN || !user?.getUser || isWelcomeClosed || isSeenThisYear ? null : moneySkillsPrompt;

    /*
     * One modal at a time, and the welcome goes first: the survey waits until the welcome has answered,
     * and does not open while it shows. Closing the welcome clears the just-logged-in cookie the survey
     * waits for, so the survey comes at the next login rather than straight after this one.
     *
     * The cached user is given the new date too, so returning to this page in the same session does not
     * show it again: the user query is cache-first.
     */
    const closeWelcome = () => {
        setCookie('isInterstitial', false);
        setIsWelcomeClosed(true);
        client.writeFragment({
            id: client.cache.identify(user.getUser),
            fragment: gql`
                fragment MoneySkillsWelcomeSeenFragment on LwpUser {
                    lastMoneySkillsAutoScheduleWelcomeSeen
                }
            `,
            data: { lastMoneySkillsAutoScheduleWelcomeSeen: moment().toISOString() }
        });
    };

    useEffect(() => {
        const isInterstitialCookie = getCookie('isInterstitial');
        const isInterstitial = String(isInterstitialCookie) === 'true';

        if (welcomeLoading || welcome) return;

        if (user?.getUser?.showInterstitial?.id && !user?.getUser?.showInterstitial?.optedOut && isInterstitial) {
            setOpenSurveyModal(true);
        }
    }, [user, welcomeLoading, welcome]);

    const _onSubmit = () => {
        setSchoolPeriodToCurrentMutation({
            variables: {
                schoolId
            }
        })
            .then(() => {
                setOpen(false);
                callSnackbar('Your new classes have been launched', 'success');
                router?.push(`/`);
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    const schoolData = data?.getSchool;

    return (
        <div className="school-overview" data-test={'school-overview-page'}>
            {schoolData ? <SchoolImportedDataSync school={schoolData} /> : null}

            <div className="activity-feed-header school-overview-header">
                <Heading1 text={'School overview'} />
            </div>
            {getUserLoading || loading ? (
                <CommonLoading />
            ) : (
                <>
                    <HeadCardSection schoolId={schoolId} schoolData={schoolData} />

                    <AutoSchedulePrompts schoolId={schoolId} prompts={prompts} />

                    <ClassOverView schoolId={schoolId} schoolData={data} />

                    {welcome ? <MoneySkillsWelcomeModal schoolId={schoolId} subjectId={welcome.subjectId} onClose={closeWelcome} /> : null}
                    {openSurveyModal && <SurveyModal open={openSurveyModal} setOpen={setOpenSurveyModal} viewType={TEACHER} />}
                    {open && (
                        <DialogWrapper
                            open={open}
                            setOpen={() => setOpen(!open)}
                            dialogFooter
                            cancelBtn
                            primaryBtnHandler={() => _onSubmit()}
                            primaryBtnDisabled={!isChecked}
                            primaryBtnloading={setSchoolPeriodToCurrentLoading}
                            primaryBtnText="Launch classes"
                            contentWidth="500px">
                            <Heading2 text="Are you ready to launch your new classes?" />
                            <Paragraph customClass="pt2 ">
                                Once you launch, your teachers will only see the classes for this academic year and the pupils will only see
                                the topics for this academic year.
                            </Paragraph>
                            <CommonCheckBox
                                name="confirmationCheckbox"
                                checked={isChecked}
                                onChange={() => setIsChecked(!isChecked)}
                                label="I confirm that I want to launch my new classes."
                                className="mt8"
                            />
                        </DialogWrapper>
                    )}
                </>
            )}
        </div>
    );
};

export default SchoolOverView;
