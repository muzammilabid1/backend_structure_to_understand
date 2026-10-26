import gql from 'graphql-tag';

import WeekByWeek from '../../../../components/Teacher/WeekByWeek';
import { getApolloClient } from '../../../../lib/apolloClientConfig';
import { setCookieShimFromContext } from '../../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE } from '../../../../shared/Constant';
import { PageType } from '../../../../types/enums/PageType';

const ReadingWeekByWeekPage = () => <WeekByWeek />;

ReadingWeekByWeekPage.pageType = PageType.TEACHER;
ReadingWeekByWeekPage.pageTitle = 'Class: Reading week';

export default ReadingWeekByWeekPage;

/**
 * Validity check for the topic ID in the URL. These are the same resolvers the page itself calls, asking
 * only for what the check needs - the reading topic resolvers error, or resolve the topic to null, when
 * the topic does not belong to the class. Kept here because the check below is their only caller.
 */
const getSchoolClassIsGroupAcrossClasses = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            isGroupAcrossClasses
        }
    }
`;

const getClassReadingTopicIdForWeekByWeek = gql`
    query getClassReadingTopicForWeekByWeek($classId: String!, $topicId: String) {
        getClassReadingTopicForWeekByWeek(classId: $classId, topicId: $topicId) {
            topicId
        }
    }
`;

const getGroupAcrossClassesReadingTopicIdForWeekByWeek = gql`
    query getGroupAcrossClassesReadingTopicForWeekByWeek($classId: String!, $topicId: String) {
        getGroupAcrossClassesReadingTopicForWeekByWeek(classId: $classId, topicId: $topicId) {
            topicId
        }
    }
`;

/**
 * The topic ID in the URL is not guaranteed to belong to the class - a link from a previous academic year,
 * or a topic that has since moved out of the class's reach, both leave the page with nothing to render and
 * no `classTopicId` to save a reading note against.
 *
 * Send the teacher to the class's reading page when it does not resolve, where the current week is picked
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
        const { data: classData } = await client.query({
            query: getSchoolClassIsGroupAcrossClasses,
            variables: { id: class_id }
        });

        const isGroupAcrossClasses = classData?.schoolClass?.isGroupAcrossClasses;

        const { data } = await client.query({
            query: isGroupAcrossClasses ? getGroupAcrossClassesReadingTopicIdForWeekByWeek : getClassReadingTopicIdForWeekByWeek,
            variables: { classId: class_id, topicId: id }
        });

        const topicId = isGroupAcrossClasses
            ? data?.getGroupAcrossClassesReadingTopicForWeekByWeek?.topicId
            : data?.getClassReadingTopicForWeekByWeek?.topicId;

        if (topicId) {
            return {
                props: {}
            };
        }
    } catch (error) {
        console.error('Error :', error);
    }

    return {
        redirect: {
            destination: `/class/${class_id}/readingweek`,
            permanent: false
        }
    };
};
