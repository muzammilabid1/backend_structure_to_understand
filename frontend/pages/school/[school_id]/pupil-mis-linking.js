import PupilMisLinking from '../../../components/School/PupilMisLinking';
import { PageType } from '../../../types/enums/PageType';

const PupilMisLinkingPage = () => <PupilMisLinking />;

PupilMisLinkingPage.pageType = PageType.SCHOOL_LEADER;
PupilMisLinkingPage.pageTitle = 'School: Pupil MIS linking';

export default PupilMisLinkingPage;
