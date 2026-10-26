import WholeSchoolSequenceForm from '../../../../components/Admin/Sequences/WholeSchool/WholeSchoolSequenceForm';
import { PageType } from '../../../../types/enums/PageType';

const EditWholeSchoolSequencePage = () => <WholeSchoolSequenceForm />;

EditWholeSchoolSequencePage.pageType = PageType.ADMIN;
EditWholeSchoolSequencePage.pageTitle = 'Admin: Edit whole-school sequence';

export default EditWholeSchoolSequencePage;
