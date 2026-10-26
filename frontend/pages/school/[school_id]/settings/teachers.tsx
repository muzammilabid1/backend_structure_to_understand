import TeacherDetails from '../../../../components/School/SchoolSettings/TeacherDetails';
import { PageType } from '../../../../types/enums/PageType';

const TeacherDetailsPage = () => <TeacherDetails />;

TeacherDetailsPage.pageType = PageType.SCHOOL_LEADER;
TeacherDetailsPage.pageTitle = 'School settings: Teachers';

export default TeacherDetailsPage;
