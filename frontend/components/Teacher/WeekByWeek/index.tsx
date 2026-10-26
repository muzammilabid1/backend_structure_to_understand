import { useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { getSchoolClassForWeekByWeekPage } from '../../../graphQl/queries';
import { getCookie, setCookie } from '../../../lib/manageCookies';
import { ThemeContext } from '../../../shared/Services/handler';
import ClassHeader from '../../Class/ClassHeader';
import CommonLoading from '../../Shared/CommonLoading';
import CommonNavTabs from '../../Shared/CommonNavTabs';
import CommonPrioritySnackbar from '../../Shared/CommonPrioritySnackBar';
import Reading from './Reading';
import Topics from './Topics';

interface Options {
    subjects: string;
    pageView: string;
}

const WeekByWeek = () => {
    const { callSnackbar } = useContext(ThemeContext);

    const router = useRouter();
    const classId = router?.query?.class_id;

    const {
        error: schoolClassError,
        data: schoolClassData,
        loading: schoolClassLoading
    } = useQuery(getSchoolClassForWeekByWeekPage, {
        variables: { id: classId },
        skip: !classId
    });

    useEffect(() => {
        if (schoolClassError?.message) {
            callSnackbar(schoolClassError, 'error');
        }
    }, [schoolClassError]);

    const schoolClass = useMemo(() => schoolClassData?.schoolClass, [schoolClassData]);

    const getDefaultSubject = () => {
        const { hasReadingTopic, hasTopics } = schoolClass?.classTopicContext || {};

        if (!hasReadingTopic || !hasTopics) return hasReadingTopic ? 'READING' : 'TOPICS';

        return router?.pathname?.includes('readingweek') ? 'READING' : 'TOPICS';
    };

    const [options, setOptions] = useState<Options>({
        subjects: getDefaultSubject(),
        pageView: getCookie('pageView') ?? 'EXPANDED'
    });

    useEffect(() => {
        if (schoolClass) setOptions((prev) => ({ ...prev, subjects: getDefaultSubject() }));
    }, [schoolClass]);

    const handleOptionsChange = (newOption) => {
        const { query } = router;

        if (newOption?.pageView) {
            setCookie('pageView', newOption.pageView, { expires: 90 });
            setOptions({ ...options, pageView: newOption.pageView });
        }

        if (newOption?.subjects) {
            if (newOption.subjects === 'READING') {
                router.push(`/class/${query.class_id}/readingweek`);
            } else {
                router.push(`/class/${query.class_id}/topic`);
            }
        }
    };

    if (schoolClassLoading) return <CommonLoading />;

    return (
        <div>
            <ClassHeader schoolClassData={schoolClass} />
            <CommonNavTabs
                isReading={schoolClass?.IsReadingLogsEnabled}
                isFullProgramme={schoolClass?.isFullProgramme}
                isRegistrationClass={schoolClass?.isRegistrationClass}
                subjects={schoolClass?.subjects}
                attentionRequiredPupilsCount={schoolClass?.attentionRequiredPupilsCount}
                schoolClass={schoolClass}
            />
            <div className="week_by_week" data-test={'class-week-by-week-page'}>
                <div className="week_by_week_snackbar">
                    <CommonPrioritySnackbar
                        params={{
                            attentionRequiredPupilsCount: schoolClass?.attentionRequiredPupilsCount,
                            onPupilsTabHandler: () => router.push(`/class/${router?.query?.class_id}/pupils`)
                        }}
                        conditions={{
                            weekByWeekPage: [
                                {
                                    key: 'parents_not_receiving_notifications_snackbar',
                                    value: schoolClass?.attentionRequiredPupilsCount > 0,
                                    isShow: false
                                }
                            ]
                        }}
                        page={'weekByWeekPage'}
                    />
                </div>

                {options?.subjects === 'READING' ? (
                    <Reading options={options} handleOptionsChange={handleOptionsChange} schoolClass={schoolClass} />
                ) : (
                    <Topics options={options} handleOptionsChange={handleOptionsChange} schoolClass={schoolClass} />
                )}
            </div>
        </div>
    );
};

export default WeekByWeek;
