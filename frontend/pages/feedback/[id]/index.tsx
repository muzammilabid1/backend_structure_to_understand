import Feedback from '../../../components/Feedback';
import { PageType } from '../../../types/enums/PageType';

const FeedbackPage = () => <Feedback />;

FeedbackPage.pageType = PageType.GENERAL;
FeedbackPage.pageTitle = 'Feedback: Detail';

export default FeedbackPage;
