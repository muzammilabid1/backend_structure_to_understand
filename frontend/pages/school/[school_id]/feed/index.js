import ActivityFeed from '../../../../components/Feed';
import { PageType } from '../../../../types/enums/PageType';

const SchoolFeedPage = () => <ActivityFeed />;

SchoolFeedPage.pageType = PageType.SCHOOL_LEADER;
SchoolFeedPage.pageTitle = 'School: Activity feed';

export default SchoolFeedPage;
