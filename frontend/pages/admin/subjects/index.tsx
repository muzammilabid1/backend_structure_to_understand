import AdminSubjects from '../../../components/Admin/AdminSubjects';
import { PageType } from '../../../types/enums/PageType';

const AdminSubjectsPage = () => <AdminSubjects />;

AdminSubjectsPage.pageType = PageType.ADMIN;
AdminSubjectsPage.pageTitle = 'Admin: Subjects';

export default AdminSubjectsPage;
