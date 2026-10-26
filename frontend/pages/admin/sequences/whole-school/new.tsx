import WholeSchoolSequenceForm from '../../../../components/Admin/Sequences/WholeSchool/WholeSchoolSequenceForm';
import { PageType } from '../../../../types/enums/PageType';

const CreateWholeSchoolSequencePage = () => <WholeSchoolSequenceForm />;

CreateWholeSchoolSequencePage.pageType = PageType.ADMIN;
CreateWholeSchoolSequencePage.pageTitle = 'Admin: New whole-school sequence';

export default CreateWholeSchoolSequencePage;
