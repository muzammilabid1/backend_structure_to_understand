import AddPupilToASchoolClass from '../../../components/Class/AddPupil';
import { PageType } from '../../../types/enums/PageType';

const AddPupilToASchoolClassPage = () => <AddPupilToASchoolClass />;

AddPupilToASchoolClassPage.pageType = PageType.TEACHER;
AddPupilToASchoolClassPage.pageTitle = 'Class: Add pupil';

export default AddPupilToASchoolClassPage;
