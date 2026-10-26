/* eslint-disable @typescript-eslint/no-explicit-any */
import { cloneDeep } from 'lodash';
import { useRouter } from 'next/compat/router';
import React, { useState } from 'react';

import { getCookie } from '../../../lib/manageCookies';
import { countWithPlural } from '../../../shared/Services/handler';
import Snackbar from '../Snackbar';
import Paragraph from '../Typography/Paragraph';

interface Params {
    schoolData?: { getSchool?: { misName?: string } };
    schoolId?: string;
    attentionRequiredPupilsCount?: number;
    onPupilsTabHandler?: () => void;
    onScheduleTabHandler?: () => void;
    onSendInviteClick?: () => void;
    setLinkPupilsToSimsModal?: (value: boolean) => void;
    schoolClass?: { school?: { misName?: string } };
    linkPupilsToSimsModal?: boolean;
    onSelectPupilModal?: any;
    certificate?: { title?: string; id?: string | number };
}

interface ConditionItem {
    key: string;
    value: boolean;
    isShow: boolean;
}

interface CommonPrioritySnackbarProps {
    conditions: Record<string, ConditionItem[]>;
    page: string;
    params?: Params;
}

const CommonPrioritySnackbar = ({ conditions, page, params }: CommonPrioritySnackbarProps) => {
    const [snackBarClose, setSnackBarClose] = useState(false);
    const router = useRouter();

    const {
        schoolData,
        schoolId,
        onSendInviteClick,
        onPupilsTabHandler,
        onScheduleTabHandler,
        setLinkPupilsToSimsModal,
        schoolClass,
        linkPupilsToSimsModal,
        onSelectPupilModal,
        certificate,
        attentionRequiredPupilsCount
    } = params || {};

    const Conditions = cloneDeep(conditions?.[page]);

    const findPriority = (condition) => {
        const updateKey = condition.map((t) => {
            const cookie = getCookie(t.key);

            if (cookie) {
                t.isShow = true;

                return t;
            }

            return t;
        });

        return updateKey.find((t) => !t.isShow && t.value)?.key;
    };

    const showSnackBar = {
        classOverViewPage: {
            snackbars: [
                {
                    key: 'pupils_not_linked_to_MIS_snackbar',
                    html: (
                        <>
                            <Snackbar
                                setSnackBarClose={setSnackBarClose}
                                snackBarClose={snackBarClose}
                                cookie="pupils_not_linked_to_MIS_snackbar"
                                className="info_snackbar  mt8"
                                icon="info_outline"
                                iconClassName={'snackbar_icon'}>
                                <Paragraph
                                    text={`There are pupils that currently aren’t linked to ${schoolData?.['getSchool']?.misName ?? '-'}.`}
                                />
                                <Paragraph
                                    customClass="premium_link"
                                    onClick={() => router?.push(`/school/${schoolId}/pupil-mis-linking`)}
                                    text={`Click here to view them.`}
                                />
                            </Snackbar>
                        </>
                    )
                }
            ]
        },
        pupilPage: {
            snackbars: [
                {
                    key: 'pupils_not_registered_snackbar',
                    html: (
                        <>
                            <Snackbar
                                setSnackBarClose={setSnackBarClose}
                                snackBarClose={snackBarClose}
                                cookie="pupils_not_registered_snackbar"
                                className="info_snackbar mt8"
                                icon="info_outline"
                                iconClassName={'info_snackbar_icon snackbar_icon'}>
                                <Paragraph>
                                    There are pupils in your class whose parents can&apos;t access the site.{' '}
                                    <span className="premium_link" onClick={onSendInviteClick}>
                                        Confirm parent details here
                                    </span>{' '}
                                    to invite them.
                                </Paragraph>
                            </Snackbar>
                        </>
                    )
                },
                {
                    key: 'pupils_not_linked_to_MIS_registerPage_snackbar',
                    html: (
                        <>
                            <Snackbar
                                setSnackBarClose={setSnackBarClose}
                                snackBarClose={snackBarClose}
                                cookie="pupils_not_linked_to_MIS_registerPage_snackbar"
                                className="info_snackbar mt8"
                                icon="info_outline"
                                iconClassName={'info_snackbar_icon snackbar_icon'}>
                                <Paragraph text={`Some pupils are not linked to your ${schoolClass?.school?.misName}.`} />
                                <Paragraph
                                    customClass="premium_link"
                                    onClick={() => setLinkPupilsToSimsModal(!linkPupilsToSimsModal)}
                                    text={`Click here to link them.`}
                                />
                            </Snackbar>
                        </>
                    )
                },
                {
                    key: 'pupil_new_certificate_snackbar',
                    html: (
                        <>
                            <Snackbar
                                setSnackBarClose={setSnackBarClose}
                                snackBarClose={snackBarClose}
                                cookie="pupil_new_certificate_snackbar"
                                className="certificate_snackbar mt8"
                                icon="info_outline"
                                iconClassName={'certificate_snackbar_icon snackbar_icon'}>
                                <Paragraph text={`You have new ${certificate?.title ?? 'Certificate'} in your class.`} />
                                <Paragraph
                                    customClass="premium_link"
                                    onClick={() => onSelectPupilModal(certificate?.id, certificate?.title)}
                                    text={`Download their certificates now.`}
                                />
                            </Snackbar>
                        </>
                    )
                },
                {
                    key: 'this_class_is_lock',
                    html: (
                        <>
                            <Snackbar
                                setSnackBarClose={setSnackBarClose}
                                snackBarClose={snackBarClose}
                                cookie="this_class_is_lock"
                                className="info_snackbar mt8"
                                icon="info_outline"
                                iconClassName={'info_snackbar_icon snackbar_icon'}>
                                <Paragraph text="This class is locked, pupils cannot be added to this class." />
                            </Snackbar>
                        </>
                    )
                },
                {
                    key: 'parents_not_receiving_notifications_snackbar',
                    html: (
                        <>
                            <Snackbar
                                setSnackBarClose={setSnackBarClose}
                                snackBarClose={snackBarClose}
                                cookie="parents_not_receiving_notifications_snackbar"
                                className="info_snackbar mt8"
                                icon="info_outline"
                                iconClassName={'info_snackbar_icon snackbar_icon'}>
                                <Paragraph>
                                    There are {countWithPlural('pupil', attentionRequiredPupilsCount)} whose parents are not receiving
                                    notifications.
                                </Paragraph>
                            </Snackbar>
                        </>
                    )
                },
                {
                    key: 'no_topics_scheduled',
                    html: (
                        <>
                            <Snackbar
                                setSnackBarClose={setSnackBarClose}
                                snackBarClose={snackBarClose}
                                cookie="no_topics_scheduled"
                                className="info_snackbar mt8"
                                icon="info_outline"
                                iconClassName={'info_snackbar_icon snackbar_icon'}>
                                <Paragraph>
                                    No topics scheduled -{' '}
                                    <span className="premium_link" onClick={onScheduleTabHandler}>
                                        add them from the schedule tab
                                    </span>
                                </Paragraph>
                            </Snackbar>
                        </>
                    )
                }
            ]
        },
        weekByWeekPage: {
            snackbars: [
                {
                    key: 'parents_not_receiving_notifications_snackbar',
                    html: (
                        <>
                            <Snackbar
                                setSnackBarClose={setSnackBarClose}
                                snackBarClose={snackBarClose}
                                cookie="parents_not_receiving_notifications_snackbar"
                                className="info_snackbar mt8"
                                icon="info_outline"
                                iconClassName={'info_snackbar_icon snackbar_icon'}>
                                <Paragraph>
                                    There are {countWithPlural('pupil', attentionRequiredPupilsCount)} whose parents are not receiving
                                    notifications.
                                    <span className="premium_link" onClick={onPupilsTabHandler}>
                                        Go to the Pupils tab to address this
                                    </span>
                                </Paragraph>
                            </Snackbar>
                        </>
                    )
                }
            ]
        },
        pupilTagPage: {
            snackbars: [
                {
                    key: 'pupil_tag',
                    html: (
                        <>
                            <Snackbar
                                setSnackBarClose={setSnackBarClose}
                                snackBarClose={snackBarClose}
                                cookie="pupil_tag"
                                className="info_snackbar mt8"
                                icon="info_outline"
                                iconClassName={'info_snackbar_icon'}>
                                <Paragraph
                                    text={`These tags are shared by all teachers across the school to tag pupils. They may be used for indicating
                                    pupil's reading level or anything else that is useful to view quickly.`}
                                />
                            </Snackbar>
                        </>
                    )
                }
            ]
        }
    };

    const snackbar = showSnackBar?.[page]?.snackbars.find((t) => t.key === findPriority(Conditions));

    return <>{snackbar?.html}</>;
};

export default CommonPrioritySnackbar;
