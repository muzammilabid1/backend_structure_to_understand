import MessageLogs from '../../../components/Admin/EmailHandler/MessageLogs';
import { PageType } from '../../../types/enums/PageType';

const MessageLogsPage = () => <MessageLogs />;

MessageLogsPage.pageType = PageType.ADMIN;
MessageLogsPage.pageTitle = 'Admin: Message logs';

export default MessageLogsPage;
