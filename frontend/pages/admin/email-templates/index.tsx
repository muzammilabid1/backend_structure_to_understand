import EmailHandler from '../../../components/Admin/EmailHandler';
import { PageType } from '../../../types/enums/PageType';

const EmailHandlerPage = () => <EmailHandler />;

EmailHandlerPage.pageType = PageType.ADMIN;
EmailHandlerPage.pageTitle = 'Admin: Email templates';

export default EmailHandlerPage;
