import { Box } from '@mui/material';
import { behaviour } from 'lwp-shared';

import CommonTag from '../CommonTag';
import Paragraph from '../Typography/Paragraph';

interface AnnouncementTargetPagesProps {
    targetPages?: string[];
    dataTest?: string;
}

/** The pages a page announcement is aimed at, as tags, or "All pages" when it has none. */
const AnnouncementTargetPages = ({ targetPages, dataTest = 'announcement-target-pages' }: AnnouncementTargetPagesProps) => {
    const labels = behaviour.announcementPages.getTargetPageLabels(targetPages);

    // Pages that left the registry have no label, and an announcement aimed only at them must not read as "All pages".
    if (!labels.length) return <Paragraph text={targetPages?.length ? 'No valid pages' : 'All pages'} dataTest={dataTest} />;

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }} data-test={dataTest}>
            {labels.map((label) => (
                <CommonTag key={label} name={label} dataTest="announcement-target-page" sx={{ fontSize: '12px' }} />
            ))}
        </Box>
    );
};

export default AnnouncementTargetPages;
