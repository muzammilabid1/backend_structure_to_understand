import { gql } from '@apollo/client';

import ViewActivity from '../../../components/Parent/Activity';
import { getApolloClient } from '../../../lib/apolloClientConfig';
import { ACCESS_TOKEN_COOKIE } from '../../../shared/Constant';
import { checkAccessAllowedAndGetInterstitial, isCurrentClass } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const getPupilActivity = gql`
    query getPupilActivity($id: String!) {
        getPupilActivity(id: $id) {
            topic {
                id
                silverStars
            }
        }
    }
`;

ViewActivity.pageType = PageType.PARENT;
ViewActivity.pageTitle = 'Activity';

export default ViewActivity;

export const getServerSideProps = async (context) => {
    try {
        const intersitialData = await checkAccessAllowedAndGetInterstitial(context);

        if (intersitialData?.redirect) {
            return intersitialData;
        }

        const isCurrentClassData = await isCurrentClass(context);

        if (isCurrentClassData?.redirect) {
            return isCurrentClassData;
        }

        const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];

        const { activity_id } = context.query;

        if (!accessToken) {
            return {
                props: {}
            };
        }

        const client = getApolloClient();

        const { data } = await client.query({
            query: getPupilActivity,
            variables: { id: activity_id },
            fetchPolicy: 'network-only'
        });

        if (data?.getPupilActivity?.topic?.silverStars === 0) {
            return {
                redirect: {
                    destination: `/topic/${data?.getPupilActivity?.topic?.id}`,
                    permanent: false
                }
            };
        }
    } catch (e) {
        console.log('Error:', e);
    }

    return {
        props: {}
    };
};
