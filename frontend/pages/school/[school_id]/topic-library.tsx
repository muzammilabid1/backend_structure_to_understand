import TopicLibrary from '../../../components/Shared/TopicLibrary';
import { PageType } from '../../../types/enums/PageType';

const TopicLibraryPage = () => <TopicLibrary />;

TopicLibraryPage.pageType = PageType.TEACHER;
TopicLibraryPage.pageTitle = 'School: Topic library';

export default TopicLibraryPage;
