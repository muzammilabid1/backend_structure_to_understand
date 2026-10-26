import SequenceForm from '../../../components/Admin/Sequences/SequenceForm';
import { PageType } from '../../../types/enums/PageType';

const CreateSequencePage = () => <SequenceForm />;

CreateSequencePage.pageType = PageType.ADMIN;
CreateSequencePage.pageTitle = 'Admin: New sequence';

export default CreateSequencePage;
