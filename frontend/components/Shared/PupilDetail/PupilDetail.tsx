import { Grid, TableCell, TableRow } from '@mui/material';
import { PupilParentStatus } from 'lwp-shared';

import { PupilStatus } from '../../../shared/Constant';
import { showDate } from '../../../shared/Services/handler';
import { ParentDetails, PupilDetails } from '../../../types/IDataChange';
import CommonTable from '../CommonTable';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

interface PupilDetailProps {
    pupilDetails: PupilDetails;
    highlightedFields?: Array<string>;
}

import styles from './PupilDetail.module.scss';

/* The wording the teacher's pupil list uses for the same statuses (Teacher/Pupils). */
const PUPIL_STATUS_LABELS: Record<string, string> = {
    [PupilStatus.ACTIVE]: 'Active this term',
    [PupilStatus.REGISTERED]: 'Accessed the site',
    [PupilStatus.MISSING]: 'No linked parent'
};

const PupilDetail = ({ pupilDetails, highlightedFields }: PupilDetailProps) => {
    const pupilInfo: Array<{ title: string; content: string; isHighlighted: boolean; customClass: string }> = [
        {
            title: 'First name',
            content: pupilDetails?.firstname,
            isHighlighted: highlightedFields?.includes('firstname'),
            customClass: 'pupil-first-name'
        },
        {
            title: 'Last name',
            content: pupilDetails?.lastname,
            isHighlighted: highlightedFields?.includes('lastname'),
            customClass: 'pupil-last-name'
        },
        {
            title: 'Class',
            content: pupilDetails?.schoolClassName,
            isHighlighted: highlightedFields?.includes('schoolClassName'),
            customClass: 'pupil-class'
        },
        {
            title: 'Unique ID',
            content: pupilDetails?.id,
            isHighlighted: highlightedFields?.includes('id'),
            customClass: 'pupil-unique-id'
        },
        {
            title: 'UPN',
            content: pupilDetails?.UPN,
            isHighlighted: highlightedFields?.includes('UPN'),
            customClass: 'pupil-upn'
        },
        {
            title: 'Date of birth',
            content: pupilDetails?.dateOfBirth ? showDate({ date: +pupilDetails?.dateOfBirth, justDate: true }) : '-',
            isHighlighted: highlightedFields?.includes('dateOfBirth'),
            customClass: 'pupil-date-of-birth'
        },
        {
            title: 'Gender',
            content: pupilDetails?.gender,
            isHighlighted: highlightedFields?.includes('gender'),
            customClass: 'pupil-gender'
        },
        {
            title: 'Year group',
            content: pupilDetails?.yearGroup,
            isHighlighted: highlightedFields?.includes('yearGroup'),
            customClass: 'pupil-year-group'
        }
    ];

    /* Platform pupils carry activity stats; imported students do not, so the block is only
     * rendered when the backend supplied them. */
    const hasPlatformActivity = pupilDetails?.feedbackCount != null;
    /* A rejected parent is still listed in the table below (with its status) but is not linked. */
    const linkedParentCount = pupilDetails?.parents?.filter((parent) => parent?.status !== PupilParentStatus.REJECTED).length ?? 0;
    const activeParentCount = pupilDetails?.parents?.filter((parent) => parent?.status === PupilParentStatus.ACTIVE).length ?? 0;
    const showParentStatus = pupilDetails?.parents?.some((parent) => parent?.status != null) ?? false;

    const platformActivityInfo: Array<{ title: string; content: string; customClass: string }> = hasPlatformActivity
        ? [
              {
                  title: 'Status',
                  content: PUPIL_STATUS_LABELS[pupilDetails?.pupilStatus] ?? '-',
                  customClass: 'pupil-status'
              },
              {
                  title: 'Linked parents',
                  content: `${linkedParentCount} (${activeParentCount} active)`,
                  customClass: 'pupil-linked-parents'
              },
              {
                  title: 'Feedback left',
                  content: `${pupilDetails?.feedbackCount ?? 0}`,
                  customClass: 'pupil-feedback-count'
              },
              {
                  title: 'Last active',
                  content: pupilDetails?.lastActivity ? showDate({ date: pupilDetails?.lastActivity, justDate: true }) : 'Never',
                  customClass: 'pupil-last-active'
              }
          ]
        : [];

    return (
        <Grid className="pupil-detail-container" container rowGap={3}>
            <Grid container spacing={4} className="pupil-detail-grid" item xs={12}>
                {pupilInfo?.map((info: { title: string; content: string; isHighlighted: boolean; customClass: string }, index: number) => (
                    <Grid item key={index} display="flex" flexDirection="column" gap={'5px'} xs={12} sm={6} md={4} lg={3}>
                        <div className={info.isHighlighted ? styles.highlightedField : ''}>
                            <Heading3 text={info.title} />
                            <Paragraph customClass={info.customClass} text={info.content || '-'} isTruncate />
                        </div>
                    </Grid>
                ))}
            </Grid>

            {hasPlatformActivity ? (
                <Grid item xs={12} display="flex" flexDirection="column" gap={'16px'}>
                    <Heading3 text="Platform activity:" />
                    <Grid container spacing={4} className="pupil-platform-activity-grid">
                        {platformActivityInfo.map((info, index: number) => (
                            <Grid item key={index} display="flex" flexDirection="column" gap={'5px'} xs={12} sm={6} md={4} lg={3}>
                                <Heading3 text={info.title} />
                                <Paragraph customClass={info.customClass} text={info.content} isTruncate />
                            </Grid>
                        ))}
                    </Grid>
                </Grid>
            ) : null}

            {pupilDetails?.parents?.length > 0 ? (
                <Grid item xs={12} display="flex" flexDirection="column" gap={'16px'}>
                    <Heading3 text="Parent details:" />
                    <CommonTable
                        head={
                            showParentStatus
                                ? ['First name', 'Last name', 'Email', 'Phone no', 'Status']
                                : ['First name', 'Last name', 'Email', 'Phone no']
                        }
                        className="parent-list-table">
                        {pupilDetails?.parents.map((parent: ParentDetails, index: number) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Paragraph text={parent?.firstname} />
                                </TableCell>
                                <TableCell>
                                    <Paragraph text={parent?.lastname} />
                                </TableCell>
                                <TableCell>
                                    <Paragraph text={parent?.email ?? '-'} />
                                </TableCell>
                                <TableCell>
                                    <Paragraph text={parent?.phoneNumber ?? '-'} />
                                </TableCell>
                                {showParentStatus ? (
                                    <TableCell>
                                        <Paragraph customClass="parent-link-status" text={parent?.status ?? '-'} />
                                    </TableCell>
                                ) : null}
                            </TableRow>
                        ))}
                    </CommonTable>
                </Grid>
            ) : null}
        </Grid>
    );
};

export default PupilDetail;
