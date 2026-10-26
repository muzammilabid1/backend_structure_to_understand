import SequenceForm from '../../../components/Admin/Sequences/SequenceForm';
import { PageType } from '../../../types/enums/PageType';

const EditSequencePage = () => <SequenceForm />;

EditSequencePage.pageType = PageType.ADMIN;
EditSequencePage.pageTitle = 'Admin: Edit sequence';

export default EditSequencePage;
