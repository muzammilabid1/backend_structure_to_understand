/* eslint-disable @typescript-eslint/no-explicit-any */
import ScrapbookEntryPageComponent from '../../../components/Parent/Scrapbook/ScrapbookEntryPage';
import { checkAccessAllowedAndGetInterstitial } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const ScrapbookEntryPage = () => <ScrapbookEntryPageComponent />;

ScrapbookEntryPage.pageType = PageType.PARENT;
ScrapbookEntryPage.pageTitle = 'Scrapbook';

export default ScrapbookEntryPage;

export const getServerSideProps = async (context: any) => {
    const interstitialData: any = await checkAccessAllowedAndGetInterstitial(context);

    if (interstitialData?.redirect) {
        return interstitialData;
    }

    return {
        props: {}
    };
};
