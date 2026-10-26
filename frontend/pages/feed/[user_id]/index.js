import ActivityFeed from '../../../components/Feed';
import { getJwtDecoded } from '../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE } from '../../../shared/Constant';
import { PageType } from '../../../types/enums/PageType';

const FeedPage = () => {
    // For regular teachers, render the feed normally
    return <ActivityFeed />;
};

FeedPage.pageType = PageType.TEACHER;
FeedPage.pageTitle = 'Teacher: Activity feed';

export default FeedPage;

export async function getServerSideProps(context) {
    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];

    if (!accessToken) {
        return {
            props: {}
        };
    }

    try {
        const decodedToken = getJwtDecoded(accessToken);

        // School leaders should be redirected to the school feed page
        // Note: Admins don't have schoolId in their token and navigate via /admin routes
        // When admins use "View as Teacher" mode, they navigate directly to /school/[school_id]/feed
        // using the DelegatedClaimsContext (not through this redirect)
        if (decodedToken?.isSchoolLeader && decodedToken?.schoolId) {
            return {
                redirect: {
                    destination: `/school/${decodedToken.schoolId}/feed`,
                    permanent: false
                }
            };
        }
    } catch (error) {
        console.error('Error decoding token:', error);
    }

    return {
        props: {}
    };
}
