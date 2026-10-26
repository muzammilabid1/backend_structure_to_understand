import { gql } from '@apollo/client';

import Welcome from '../../../components/Welcome';
import { getApolloClient } from '../../../lib/apolloClientConfig';
import { setCookieShimFromContext } from '../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE } from '../../../shared/Constant';
import { getForbiddenRedirect } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

Welcome.pageType = PageType.PARENT;
Welcome.pageTitle = 'Welcome';

const getPupilParent = gql`
    query getPupilParent($pupilParentId: String!) {
        getPupilParent(pupilParentId: $pupilParentId) {
            id
        }
    }
`;

export const getServerSideProps = async (context) => {
    setCookieShimFromContext(context);

    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];
    const { pupilParentId } = context.query;

    if (!accessToken) {
        return {
            props: {}
        };
    }

    const client = getApolloClient();

    try {
        await client.query({
            query: getPupilParent,
            variables: { pupilParentId }
        });
    } catch (error) {
        const forbiddenRedirect = getForbiddenRedirect(error, context?.resolvedUrl);

        if (forbiddenRedirect?.redirect) return forbiddenRedirect;
    }

    return {
        props: {}
    };
};

export default Welcome;
