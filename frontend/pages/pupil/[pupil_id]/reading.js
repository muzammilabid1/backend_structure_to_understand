import { gql } from '@apollo/client';

import ReadingLog from '../../../components/Parent/ReadingLog';
import { getApolloClient } from '../../../lib/apolloClientConfig';
import { setCookieShimFromContext } from '../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE } from '../../../shared/Constant';
import { PageType } from '../../../types/enums/PageType';

ReadingLog.pageType = PageType.TEACHER;
ReadingLog.pageTitle = 'Pupil: Reading';

export default ReadingLog;

const getReadingTopicsReadingLog = gql`
    query getReadingTopics($pupilId: String!) {
        getReadingTopics(pupilId: $pupilId) {
            releaseDate
            id
            readingLogFeedbacks {
                id
                userType
                bookReadAt
                includeInReadingTarget
                logCreatedAt
                bookName
                lastAction {
                    updatedAt
                }
            }
        }
    }
`;

export const getServerSideProps = async (context) => {
    setCookieShimFromContext(context);

    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];

    const { child_id, topicId, pupil_id } = context.query;

    if (topicId || !accessToken) {
        return {
            props: {}
        };
    }

    const pupilId = child_id || pupil_id;

    const asPath = context?.resolvedUrl;

    const client = getApolloClient({ asPath: context?.resolvedUrl }, accessToken);

    const { data: pupilReadingTopics } = await client.query({
        query: getReadingTopicsReadingLog,
        variables: { pupilId }
    });

    try {
        if (pupilReadingTopics?.getReadingTopics.length && !topicId) {
            const pathWithoutQueryParams = asPath.split('?')[0];
            const queryObject = Object.assign({}, context.query);

            delete queryObject?.child_id;
            delete queryObject?.pupil_id;
            queryObject.topicId = pupilReadingTopics?.getReadingTopics[0]?.id;

            return {
                redirect: {
                    destination: `${pathWithoutQueryParams}?topicId=${queryObject?.topicId}`, // Specify the destination route
                    permanent: false // If true, the redirect will be cached by the browser
                }
            };
        }
    } catch (error) {
        console.error('Error fetching pupils:', error);
    }

    return {
        props: {}
    };
};
