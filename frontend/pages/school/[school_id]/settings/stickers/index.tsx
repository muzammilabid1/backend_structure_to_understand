import SchoolStickers from '../../../../../components/School/SchoolSettings/SchoolStickers';
import { PageType } from '../../../../../types/enums/PageType';

const SchoolStickersPage = () => <SchoolStickers />;

SchoolStickersPage.pageType = PageType.SCHOOL_LEADER;
SchoolStickersPage.pageTitle = 'School settings: Stickers';

export default SchoolStickersPage;
