import ViewTopic from '../../../components/Parent/Topic';
import { checkAccessAllowedAndGetInterstitial, isCurrentClass } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

ViewTopic.pageType = PageType.PARENT;
ViewTopic.pageTitle = 'Topic';

export default ViewTopic;

export const getServerSideProps = async (context) => {
    const intersitialData = await checkAccessAllowedAndGetInterstitial(context);

    if (intersitialData?.redirect) {
        return intersitialData;
    }

    const isCurrentClassData = await isCurrentClass(context);

    if (isCurrentClassData?.redirect) {
        return isCurrentClassData;
    }

    return {
        props: {}
    };
};
