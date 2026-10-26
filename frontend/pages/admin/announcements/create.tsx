import AnnouncementForm from '../../../components/Admin/Announcements/AnnouncementForm';
import { PageType } from '../../../types/enums/PageType';

const AnnouncementFormPage = () => <AnnouncementForm />;

AnnouncementFormPage.pageType = PageType.ADMIN;
AnnouncementFormPage.pageTitle = 'Admin: Create announcement';

export default AnnouncementFormPage;
