import { useMutation } from '@apollo/client';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Collapse, IconButton, TableCell, TableRow } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { sendSchoolLeaderWelcomeEmails } from '../../../../graphQl/mutations';
import { ThemeContext } from '../../../../shared/Services/handler';
import CommonCheckBox from '../../CommonCheckBox';
import CommonLoading from '../../CommonLoading';
import CommonTable from '../../CommonTable';
import DialogWrapper from '../../DialogWrapper';
import Paragraph from '../../Typography/Paragraph';
import SendWelcomeEmailsLeaders from './SendWelcomeEmailsLeaders';

export interface SchoolAwaitingWelcome {
    schoolId: string;
    schoolName: string;
    leaderCount: number;
}

interface WelcomeEmailFailure {
    userId: string;
    name: string;
    reason: string;
}

interface SendWelcomeEmailsModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    schools: SchoolAwaitingWelcome[];
    // Called after a send that queued at least one email, so the caller can refetch and drop the sent schools.
    onSent?: () => void;
    // While the school list is still being fetched, suppress the possibly-stale list and disable the send button,
    // so no school is shown pre-checked from a previous fetch.
    loading?: boolean;
}

const pluralisedEmails = (count: number): string => `${count} welcome email${count === 1 ? '' : 's'}`;

// Name-based slug for the row dataTest, so tests can target a school by name rather than by id.
const schoolTestSlug = (school: SchoolAwaitingWelcome): string => school.schoolName.trim().toLowerCase().replace(/\s+/g, '-');

const MAX_FAILURES_LISTED = 5;

// Names the people who missed out, capped so a wholesale failure does not produce an unreadable wall of text.
const summariseFailures = (failures: WelcomeEmailFailure[]): string => {
    const listed = failures
        .slice(0, MAX_FAILURES_LISTED)
        .map((failure) => `${failure.name} (${failure.reason})`)
        .join('; ');
    const remaining = failures.length - MAX_FAILURES_LISTED;

    return remaining > 0 ? `${listed}; and ${remaining} more.` : `${listed}`;
};

const SendWelcomeEmailsModal = ({ open, setOpen, schools, onSent, loading = false }: SendWelcomeEmailsModalProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [checkedSchoolIds, setCheckedSchoolIds] = useState<string[]>([]);
    const [expandedSchoolIds, setExpandedSchoolIds] = useState<string[]>([]);

    useEffect(() => {
        setCheckedSchoolIds(schools.map((school) => school.schoolId));
        setExpandedSchoolIds([]);
    }, [schools]);

    const [sendWelcomeEmailsMutation, { loading: sending }] = useMutation(sendSchoolLeaderWelcomeEmails);

    const toggleSchool = (schoolId: string): void => {
        setCheckedSchoolIds((current) => (current.includes(schoolId) ? current.filter((id) => id !== schoolId) : [...current, schoolId]));
    };

    const allChecked = schools.length > 0 && checkedSchoolIds.length === schools.length;

    const toggleAll = (): void => {
        setCheckedSchoolIds(allChecked ? [] : schools.map((school) => school.schoolId));
    };

    const toggleExpanded = (schoolId: string): void => {
        setExpandedSchoolIds((current) => (current.includes(schoolId) ? current.filter((id) => id !== schoolId) : [...current, schoolId]));
    };

    const onSend = async (): Promise<void> => {
        try {
            const { data } = await sendWelcomeEmailsMutation({ variables: { schoolIds: checkedSchoolIds } });
            const { sentCount = 0, failures = [] } = data?.sendSchoolLeaderWelcomeEmails ?? {};

            // A partial failure must not read as a clean success. 'error' is deliberate even when some were
            // queued: it renders the dismissable dialog rather than a snackbar that auto-hides after three
            // seconds, so the admin actually reads who missed out.
            //
            // "queued" rather than "sent" because the notification cron does the delivery, so the emails are not
            // in anyone's inbox the moment this returns.
            if (failures.length) {
                callSnackbar(
                    `${pluralisedEmails(sentCount)} queued for sending. ${failures.length} could not be queued. ${summariseFailures(failures)}`,
                    'error',
                    'Some welcome emails were not queued'
                );
            } else {
                callSnackbar(`${pluralisedEmails(sentCount)} queued for sending`, 'success');
            }

            if (sentCount > 0) onSent?.();
            setOpen(false);
        } catch (error) {
            callSnackbar(error, 'error');
        }
    };

    // The emails the selection adds up to, which is what the admin is really agreeing to send.
    const emailCount = schools
        .filter((school) => checkedSchoolIds.includes(school.schoolId))
        .reduce((total, school) => total + school.leaderCount, 0);

    // With one school there is nothing to choose between, so list its leaders straight away instead of a table
    // whose checkbox only does what Cancel does.
    const singleSchool = schools.length === 1 ? schools[0] : null;

    return (
        <DialogWrapper
            open={open}
            setOpen={() => setOpen(false)}
            heading="Send welcome emails"
            subHeading={
                <>
                    {!loading && (
                        <Paragraph
                            customClass="staff-email-count"
                            dataTest="send-welcome-emails-count"
                            text={`${pluralisedEmails(emailCount)} will be sent.`}
                        />
                    )}
                    <Paragraph
                        customClass="staff-email-subtitle"
                        text={
                            singleSchool ? (
                                <>
                                    The welcome email will be sent to these school leaders at <strong>{singleSchool.schoolName}</strong>.
                                    Only school leaders who have not already had it are listed.
                                </>
                            ) : (
                                'Every school ticked below will have the welcome email sent to all of its school leaders. Only school leaders who have not already had it are counted.'
                            )
                        }
                    />
                </>
            }
            dialogFooter
            cancelBtn
            primaryBtnText="Send"
            primaryBtnHandler={onSend}
            primaryBtnloading={sending}
            primaryBtnDisabled={emailCount === 0 || loading}
            contentWidth="800px"
            dataTest="send-welcome-emails-modal">
            {loading ? (
                <CommonLoading />
            ) : singleSchool ? (
                <div className="staff-email-list">
                    <SendWelcomeEmailsLeaders schoolId={singleSchool.schoolId} dataTest="send-welcome-emails-leaders" />
                </div>
            ) : (
                <div className="staff-email-list">
                    <CommonTable
                        isChild
                        head={[
                            {
                                label: '',
                                icon: (
                                    <CommonCheckBox
                                        name="welcome-school-all"
                                        label="School name"
                                        checked={allChecked}
                                        indeterminate={checkedSchoolIds.length > 0 && !allChecked}
                                        onChange={toggleAll}
                                        dataTest="send-welcome-emails-select-all"
                                    />
                                )
                            },
                            'School leaders',
                            ''
                        ]}>
                        {schools.map((school) => {
                            const isExpanded = expandedSchoolIds.includes(school.schoolId);

                            return (
                                <React.Fragment key={school.schoolId}>
                                    <TableRow className={isExpanded ? 'staff-email-school-expanded' : ''}>
                                        <TableCell>
                                            <CommonCheckBox
                                                name={`welcome-school-${school.schoolId}`}
                                                label={school.schoolName}
                                                checked={checkedSchoolIds.includes(school.schoolId)}
                                                onChange={() => toggleSchool(school.schoolId)}
                                                dataTest={`send-welcome-emails-row-${schoolTestSlug(school)}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Paragraph text={`${school.leaderCount}`} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                aria-label="expand row"
                                                aria-expanded={isExpanded}
                                                size="small"
                                                data-test={`send-welcome-emails-expand-${schoolTestSlug(school)}`}
                                                onClick={() => toggleExpanded(school.schoolId)}>
                                                {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>

                                    <TableRow>
                                        <TableCell colSpan={3} style={{ padding: 0, border: 'none' }}>
                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                <SendWelcomeEmailsLeaders
                                                    schoolId={school.schoolId}
                                                    dataTest={`send-welcome-emails-leaders-${schoolTestSlug(school)}`}
                                                />
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            );
                        })}
                    </CommonTable>
                </div>
            )}
        </DialogWrapper>
    );
};

export default SendWelcomeEmailsModal;
