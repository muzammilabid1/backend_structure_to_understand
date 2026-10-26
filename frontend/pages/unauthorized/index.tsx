import Unauthorized from '../../components/Unauthorized';
import { PageType } from '../../types/enums/PageType';

const UnauthorizedPage = () => <Unauthorized />;

UnauthorizedPage.pageType = PageType.GENERAL;
UnauthorizedPage.pageTitle = 'Not authorised';

export default UnauthorizedPage;
