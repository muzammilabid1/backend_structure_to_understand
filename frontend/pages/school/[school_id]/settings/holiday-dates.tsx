import HolidayDate from '../../../../components/School/SchoolSettings/HolidayDate';
import { PageType } from '../../../../types/enums/PageType';

const HolidayDatePage = () => <HolidayDate />;

HolidayDatePage.pageType = PageType.SCHOOL_LEADER;
HolidayDatePage.pageTitle = 'School settings: Holiday dates';

export default HolidayDatePage;
