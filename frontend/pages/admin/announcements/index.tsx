import Announcements from '../../../components/Admin/Announcements';
import { PageType } from '../../../types/enums/PageType';

const AnnouncementsPage = () => <Announcements />;

AnnouncementsPage.pageType = PageType.ADMIN;
AnnouncementsPage.pageTitle = 'Admin: Announcements';

export default AnnouncementsPage;
