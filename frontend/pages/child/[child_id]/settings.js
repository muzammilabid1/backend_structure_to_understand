import ChildSettings from '../../../components/Parent/ChildSettings';
import { checkAccessAllowedAndGetInterstitial } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

ChildSettings.pageType = PageType.PARENT;
ChildSettings.pageTitle = 'Child: Settings';

export default ChildSettings;

export const getServerSideProps = async (context) => {
    const intersitialData = await checkAccessAllowedAndGetInterstitial(context);

    if (intersitialData?.redirect) {
        return intersitialData;
    }

    return {
        props: {}
    };
};
