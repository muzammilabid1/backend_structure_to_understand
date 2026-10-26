import EditEmailTemplate from '../../../../components/Admin/EmailHandler/EditEmailTemplate';
import { PageType } from '../../../../types/enums/PageType';

const EditEmailTemplatePage = () => <EditEmailTemplate />;

EditEmailTemplatePage.pageType = PageType.ADMIN;
EditEmailTemplatePage.pageTitle = 'Admin: New email template';

export default EditEmailTemplatePage;
