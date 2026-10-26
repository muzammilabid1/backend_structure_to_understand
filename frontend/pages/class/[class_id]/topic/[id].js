import gql from 'graphql-tag';
import React from 'react';

import WeekByWeek from '../../../../components/Teacher/WeekByWeek';
import { getApolloClient } from '../../../../lib/apolloClientConfig';
import { setCookieShimFromContext } from '../../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE } from '../../../../shared/Constant';
import { PageType } from '../../../../types/enums/PageType';

const TopicWeekByWeekPage = () => <WeekByWeek />;

TopicWeekByWeekPage.pageType = PageType.TEACHER;
TopicWeekByWeekPage.pageTitle = 'Class: Topic';

export default TopicWeekByWeekPage;

/**
 * Validity check for the topic ID in the URL. Same resolver the page itself calls, asking only for the
 * resolved topic ID - it errors when the topic does not belong to the class. Kept here because the check
 * below is its only caller.
 */
const getClassTopicIdForWeekByWeek = gql`
    query getClassTopicForWeekByWeek($classId: String!, $topicId: String) {
        getClassTopicForWeekByWeek(classId: $classId, topicId: $topicId) {
            topicId
        }
    }
`;

/**
 * The topic ID in the URL is not guaranteed to belong to the class - a link from a previous academic year,
 * or a topic that has since moved out of the class's reach, both leave the page with nothing to render.
 *
 * Send the teacher to the class's topic page when it does not resolve, where the current topic is picked
 * for them instead.
 */
export const getServerSideProps = async (context) => {
    setCookieShimFromContext(context);

    const { class_id, id } = context.query;

    if (!context.req.cookies[ACCESS_TOKEN_COOKIE]) {
        return {
            props: {}
        };
    }

    const client = getApolloClient();

    try {
        const { data } = await client.query({
            query: getClassTopicIdForWeekByWeek,
            variables: { classId: class_id, topicId: id }
        });

        if (data?.getClassTopicForWeekByWeek?.topicId) {
            return {
                props: {}
            };
        }
    } catch (error) {
        console.error('Error :', error);
    }

    return {
        redirect: {
            destination: `/class/${class_id}/topic`,
            permanent: false
        }
    };
};
