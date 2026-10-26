import AdminWholeSchoolSequences from '../../../../components/Admin/Sequences/WholeSchool';
import { PageType } from '../../../../types/enums/PageType';

const AdminWholeSchoolSequencesPage = () => <AdminWholeSchoolSequences />;

AdminWholeSchoolSequencesPage.pageType = PageType.ADMIN;
AdminWholeSchoolSequencesPage.pageTitle = 'Admin: Whole-school sequences';

export default AdminWholeSchoolSequencesPage;
