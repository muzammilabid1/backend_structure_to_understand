import AdminSequences from '../../../components/Admin/Sequences';
import { PageType } from '../../../types/enums/PageType';

const AdminSequencesPage = () => <AdminSequences />;

AdminSequencesPage.pageType = PageType.ADMIN;
AdminSequencesPage.pageTitle = 'Admin: Sequences';

export default AdminSequencesPage;
