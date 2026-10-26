import React from 'react';

import RouteTabs from '../../Shared/RouteTabs';
import Heading1 from '../../Shared/Typography/Heading1';

export enum SetATopicTab {
    TopicLibrary = 0,
    AutoSchedule = 1
}

/**
 * The "Set a topic" heading and its two tabs, for school leaders and admins (LEA-6687).
 *
 * Teachers never see this: whole-school scheduling is a leader action, and the Auto schedule page is
 * a school leader page, so a teacher following the tab would land on Unauthorized. They keep the
 * Topic library's own heading instead.
 */
const SetATopicHeader = ({ schoolId, active }: { schoolId: string; active: SetATopicTab }) => (
    <div className="set-a-topic-header" data-test="set-a-topic-header">
        <Heading1 text="Set a topic" dataTest="set-a-topic-heading" />
        <RouteTabs
            active={active}
            ariaLabel="Ways to set a topic"
            tabs={[
                { label: 'Topic library', href: `/school/${schoolId}/topic-library`, dataTest: 'set-a-topic-tab-topic-library' },
                { label: 'Auto schedule', href: `/school/${schoolId}/auto-schedule`, dataTest: 'set-a-topic-tab-auto-schedule' }
            ]}
        />
    </div>
);

export default SetATopicHeader;
