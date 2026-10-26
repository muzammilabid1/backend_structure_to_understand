import { gql } from '@apollo/client';

import MathscotSelection from '../../../components/Parent/MathscotSelection';
import { getApolloClient } from '../../../lib/apolloClientConfig';
import { getJwtDecoded, setCookieShimFromContext } from '../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE } from '../../../shared/Constant';
import { getForbiddenRedirect, getPupilAccessRedirect } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

MathscotSelection.pageType = PageType.PARENT;
MathscotSelection.pageTitle = 'Child: Select Mathscot';

const getPupil = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
        }
    }
`;

export const getServerSideProps = async (context) => {
    setCookieShimFromContext(context);

    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];
    const { child_id } = context.query;
    const { resolvedUrl } = context;

    if (!accessToken) {
        return {
            props: {}
        };
    }

    const decodedToken = getJwtDecoded(accessToken);

    const accessRedirect = getPupilAccessRedirect(decodedToken, child_id, resolvedUrl);

    if (accessRedirect?.redirect) return accessRedirect;

    try {
        const client = getApolloClient();

        await client.query({
            query: getPupil,
            variables: { id: child_id }
        });
    } catch (error) {
        const forbiddenRedirect = getForbiddenRedirect(error, resolvedUrl);

        if (forbiddenRedirect?.redirect) return forbiddenRedirect;
    }

    return {
        props: {}
    };
};

export default MathscotSelection;
