import PupilTag from '../../../../components/School/PupilTag';
import SchoolSettingsWrapper from '../../../../components/School/SchoolSettings/SchoolSettingsWrapper';
import { PageType } from '../../../../types/enums/PageType';

const PupilTagPage = () => (
    <SchoolSettingsWrapper>
        <PupilTag />
    </SchoolSettingsWrapper>
);

PupilTagPage.pageType = PageType.SCHOOL_LEADER;
PupilTagPage.pageTitle = 'School settings: Pupil tags';

export default PupilTagPage;
