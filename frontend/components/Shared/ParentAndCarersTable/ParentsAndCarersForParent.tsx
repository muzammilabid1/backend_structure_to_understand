import { Tooltip } from '@mui/material';
import { PupilParentStatus, UserStatus } from 'lwp-shared';
import React from 'react';

import SummaryCard from '../Cards/SummaryCard';
import CommonBadge from '../CommonBadge';

interface Parent {
    id?: string;
    firstname?: string;
    lastname?: string;
    userStatus?: string;
}

interface PupilParent {
    status?: string;
    parent?: Parent;
}

interface ParentsAndCarersForParentProps {
    pupil?: { pupil?: { parents?: PupilParent[] } };
}

const getPupilParentStatusDescription = (pupilParentStatus?: string): string => {
    if (pupilParentStatus === PupilParentStatus.ACTIVE) {
        return 'Is linked to the pupil and can access their activities.';
    } else if (pupilParentStatus === PupilParentStatus.INVITED) {
        return 'Has been sent an invitation to join the pupil.';
    } else {
        return '';
    }
};

const getPupilLinkBadgeSettings = (pupilParentStatus?: string, cssClass?: boolean): string => {
    if (pupilParentStatus === PupilParentStatus.ACTIVE) {
        return cssClass ? 'badge_registered_color' : 'Linked';
    } else if (pupilParentStatus === PupilParentStatus.INVITED) {
        return cssClass ? 'badge_pending_color' : 'Invited';
    } else if (pupilParentStatus === PupilParentStatus.IMPORTED) {
        return cssClass ? 'badge_imported_color' : 'Not Yet Invited';
    } else {
        return cssClass ? 'badge_red_color' : 'Rejected request';
    }
};

const ParentsAndCarersForParent = ({ pupil }: ParentsAndCarersForParentProps) => (
    <div className="parents-carer-card-list">
        {(pupil?.pupil?.parents || []).map((pupilParent, index) => {
            const parent = pupilParent?.parent;
            const needsAttention = pupilParent?.status === PupilParentStatus.REJECTED || parent?.userStatus === UserStatus.DEACTIVATED;

            return (
                <SummaryCard
                    key={parent?.id ?? index}
                    dataTest="parents-carer-parent-card"
                    className={`parents-carer-summary-card ${needsAttention ? 'parents-carer-summary-card-attention' : ''}`.trim()}
                    rows={[
                        {
                            columns: [
                                [
                                    {
                                        label: 'Parent name',
                                        value: parent?.firstname,
                                        dataTest: 'parents-carer-parent-name',
                                        isTruncate: true
                                    }
                                ],
                                [
                                    {
                                        label: 'Status',
                                        value: (
                                            <Tooltip title={getPupilParentStatusDescription(pupilParent?.status)}>
                                                <div data-test="parents-carer-parent-status">
                                                    <CommonBadge
                                                        className={getPupilLinkBadgeSettings(pupilParent?.status, true)}
                                                        badgeContent={getPupilLinkBadgeSettings(pupilParent?.status, false)}
                                                    />
                                                </div>
                                            </Tooltip>
                                        )
                                    }
                                ]
                            ]
                        }
                    ]}
                />
            );
        })}
    </div>
);

export default ParentsAndCarersForParent;
