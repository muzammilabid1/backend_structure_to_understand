import Features from '../../../components/Admin/Features';
import { PageType } from '../../../types/enums/PageType';

const FeaturesPage = () => <Features />;

FeaturesPage.pageType = PageType.ADMIN;
FeaturesPage.pageTitle = 'Admin: Features';

export default FeaturesPage;
