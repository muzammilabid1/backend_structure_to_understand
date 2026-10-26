import Configuration from '../../../../components/School/SchoolSettings/Configuration';
import { PageType } from '../../../../types/enums/PageType';

const ConfigurationPage = () => <Configuration />;

ConfigurationPage.pageType = PageType.SCHOOL_LEADER;
ConfigurationPage.pageTitle = 'School settings: Configuration';

export default ConfigurationPage;
