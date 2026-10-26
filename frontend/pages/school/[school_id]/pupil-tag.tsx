import PupilTag from '../../../components/School/PupilTag';
import { PageType } from '../../../types/enums/PageType';

const PupilTagPage = () => <PupilTag />;

PupilTagPage.pageType = PageType.TEACHER;
PupilTagPage.pageTitle = 'School: Pupil tag';

export default PupilTagPage;
