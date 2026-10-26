import TeacherFaqs from '../../../../../components/School/HelpAndResources/TeacherFaqs';
import { PageType } from '../../../../../types/enums/PageType';

const TeacherFaqsPage = () => <TeacherFaqs />;

TeacherFaqsPage.pageType = PageType.TEACHER;
TeacherFaqsPage.pageTitle = 'School: Teacher FAQs';

export default TeacherFaqsPage;
