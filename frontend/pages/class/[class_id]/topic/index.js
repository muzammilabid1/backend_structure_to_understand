import React from 'react';

import WeekByWeek from '../../../../components/Teacher/WeekByWeek';
import { getSchoolClassForWeekByWeekPage } from '../../../../graphQl/queries';
import { getApolloClient } from '../../../../lib/apolloClientConfig';
import { setCookieShimFromContext } from '../../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, SchoolClassStatus } from '../../../../shared/Constant';
import { PageType } from '../../../../types/enums/PageType';

const TopicWeekByWeekPage = () => <WeekByWeek />;

TopicWeekByWeekPage.pageType = PageType.TEACHER;
TopicWeekByWeekPage.pageTitle = 'Class: Topics week by week';

export default TopicWeekByWeekPage;

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

        if (!data?.schoolClass?.classTopicContext?.hasTopics) {
            return {
                redirect: {
                    destination: `/class/${class_id}/readingweek`,
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
