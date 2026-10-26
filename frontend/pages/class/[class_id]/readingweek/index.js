import React from 'react';

import WeekByWeek from '../../../../components/Teacher/WeekByWeek';
import { getSchoolClassForWeekByWeekPage } from '../../../../graphQl/queries';
import { getApolloClient } from '../../../../lib/apolloClientConfig';
import { setCookieShimFromContext } from '../../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, SchoolClassStatus } from '../../../../shared/Constant';
import { PageType } from '../../../../types/enums/PageType';

const ReadingWeekByWeekPage = () => <WeekByWeek />;

ReadingWeekByWeekPage.pageType = PageType.TEACHER;
ReadingWeekByWeekPage.pageTitle = 'Class: Reading week by week';

export default ReadingWeekByWeekPage;

export const getServerSideProps = async (context) => {
    setCookieShimFromContext(context);

    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];
    const { class_id } = context.query;

    if (!accessToken) {
        return {
            props: {}
        };
    }

    const client = getApolloClient();

    try {
        const { data } = await client.query({
            query: getSchoolClassForWeekByWeekPage,
            variables: { id: class_id }
        });

        if (
            data?.schoolClass?.status !== SchoolClassStatus.ACTIVE ||
            (!data?.schoolClass?.classTopicContext?.hasReadingTopic && !data?.schoolClass?.classTopicContext?.hasTopics)
        ) {
            return {
                redirect: {
                    destination: `/class/${class_id}/pupils`,
                    permanent: false
                }
            };
        }

        if (!data?.schoolClass?.classTopicContext?.hasReadingTopic) {
            return {
                redirect: {
                    destination: `/class/${class_id}/topic`,
                    permanent: false
                }
            };
        }
    } catch (error) {
        console.error('Error :', error);
    }

    return {
        props: {}
    };
};
