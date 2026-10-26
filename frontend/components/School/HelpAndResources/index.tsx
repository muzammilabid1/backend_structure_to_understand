import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

import { useDelegatedClaims } from '../../../context/DelegatedClaimsContext';
import { ADMIN } from '../../../shared/Constant';
import { getExternalResourcesLink } from '../../../shared/Services/handler';
import { useLwpAppContext } from '../../AuthProvider';
import Heading1 from '../../Shared/Typography/Heading1';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';

const HelpAndResources = () => {
    const params = useParams();
    const schoolId = params.school_id as string;
    const { token } = useLwpAppContext();
    const { setClaims } = useDelegatedClaims();
    const isAdminOrSchoolLeader = token?.isSchoolLeader || token?.userType === ADMIN;

    useEffect(() => {
        setClaims({ schoolId });
    }, [schoolId]);

    const helpAndResources = [
        {
            title: 'Resources',
            description: 'Keep your teachers, pupils and their parents informed and motivated through the year',
            link: getExternalResourcesLink(token),
            name: 'resources',
            icon: <OpenInNewIcon />,
            target: '_blank'
        },
        {
            title: 'How to guides',
            description: 'Need step-by-step help? Visit our how-to guides for instructions on logging reading, setting topics, and more',
            link: isAdminOrSchoolLeader ? 'https://lwp.uk/leader-howto' : 'https://lwp.uk/teacher-howto',
            name: 'how-to-guides',
            icon: <OpenInNewIcon />,
            target: '_blank'
        },
        {
            title: 'FAQs',
            description: 'Got questions? Find quick answers here',
            link: `/school/${schoolId}/resources/teacher-faqs`,
            name: 'faqs',
            icon: <ChevronRightIcon />,
            target: '_self'
        }
    ];

    return (
        <div className="school-settings-page">
            <Heading1 text="Help and resources" />
            <div className="settings-list">
                {helpAndResources.map((tab, index) => (
                    <Link key={index} href={tab.link} className="setting-item" target={tab.target} data-test={`teacher-${tab.name}`}>
                        <div>
                            <Heading2 text={tab.title} />
                            <Paragraph text={tab.description} />
                        </div>
                        {tab.icon}
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default HelpAndResources;
