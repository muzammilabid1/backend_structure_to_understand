import AdminPartnerships from '../../../components/Admin/Partnerships';
import { PageType } from '../../../types/enums/PageType';

const AdminPartnershipsPage = () => <AdminPartnerships />;

AdminPartnershipsPage.pageType = PageType.ADMIN;
AdminPartnershipsPage.pageTitle = 'Admin: Partnerships';

export default AdminPartnershipsPage;
