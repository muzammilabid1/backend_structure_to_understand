import ReadingGroup from '../../../components/Class/ClassReading/ReadingGroup';
import { PageType } from '../../../types/enums/PageType';

const ReadingGroupPage = () => <ReadingGroup />;

ReadingGroupPage.pageType = PageType.TEACHER;
ReadingGroupPage.pageTitle = 'School: Log reading';

export default ReadingGroupPage;
