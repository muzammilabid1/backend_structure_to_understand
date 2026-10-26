import PupilNotAssginedToAClass from '../../../components/School/PupilNotAssginedToAClass';
import { PageType } from '../../../types/enums/PageType';

const PupilNotAssginedToAClassPage = () => <PupilNotAssginedToAClass />;

PupilNotAssginedToAClassPage.pageType = PageType.SCHOOL_LEADER;
PupilNotAssginedToAClassPage.pageTitle = 'School: Pupils not assigned';

export default PupilNotAssginedToAClassPage;
