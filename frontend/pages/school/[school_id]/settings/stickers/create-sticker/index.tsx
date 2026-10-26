import CreateNewSticker from '../../../../../../components/CreateNewSticker';
import SchoolSettingsWrapper from '../../../../../../components/School/SchoolSettings/SchoolSettingsWrapper';
import { PageType } from '../../../../../../types/enums/PageType';

const CreateStickerPage = () => {
    return (
        <SchoolSettingsWrapper>
            <CreateNewSticker />
        </SchoolSettingsWrapper>
    );
};

CreateStickerPage.pageType = PageType.SCHOOL_LEADER;
CreateStickerPage.pageTitle = 'School settings: Create sticker';

export default CreateStickerPage;
