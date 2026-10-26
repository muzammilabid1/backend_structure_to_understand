/* eslint-disable @next/next/no-img-element */
import { gql, useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { BlankCertificateType } from 'lwp-shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import ClassHeader from '../../../components/Class/ClassHeader';
import FindExistingClassPupil from '../../../components/Shared/Modals/FindExistingClassPupil';
import Paragraph from '../../../components/Shared/Typography/Paragraph';
import ClassStatsCard from '../../../components/Teacher/Cards/ClassStatsCard';
import EditClassDetailModal from '../../../components/Teacher/Modals/EditClassModalDetail';
import SelectPupilTable from '../../../components/Teacher/SelectPupilTable';
import SendAwaitingInvitationToParents from '../../../components/Teacher/SendAwaitingInvitationToParents';
import SendInvitationToParents from '../../../components/Teacher/SendInvitationToParents';
import {
    getActivityGridDataForGroupAcrossClasses,
    getClassImportedPupils,
    getClassPupilsForClassPupilsPage,
    getClassPupilsForRegisterTable,
    getClassPupilsForTeacher,
    getSchoolClassForRegister
} from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, SchoolClassStatus } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonPrioritySnackbar from '../../Shared/CommonPrioritySnackBar';
import CommonCard from './../../../components/Shared/Cards/CommonCard';
import CommonListWithIcon from './../../../components/Shared/CommonListWithIcon';
import CommonLoading from './../../../components/Shared/CommonLoading';
import CommonNavTabs from './../../../components/Shared/CommonNavTabs';
import CommonPopOver from './../../../components/Shared/CommonPopOver';
import FindExistingPupil from './../../../components/Shared/Modals/FindExistingPupil';
import LinkPupilsToSimsModal from './../../../components/Shared/Modals/LinkPupilsToSimsModal';

// Mutation
const blankCertificateForRegister = gql`
    mutation blankCertificate($type: BlankCertificateType!) {
        blankCertificate(type: $type)
    }
`;

const confirmAllParentDetailsForRegister = gql`
    mutation confirmAllParentDetails($input: [String!]!, $schoolId: String!) {
        confirmAllParentDetails(input: $input, schoolId: $schoolId)
    }
`;

const sendPupilParentInvitationImmediate = gql`
    mutation sendPupilParentInvitationImmediate($pupilParentIds: [String!]!) {
        sendPupilParentInvitationImmediate(pupilParentIds: $pupilParentIds)
    }
`;

interface TeacherClassWrapperProps {
    isVisibleClassInfo?: boolean;
}

const TeacherClassWrapper = ({ isVisibleClassInfo = false }: TeacherClassWrapperProps) => {
    const queryParams = useParams();
    const { query, pathname, push } = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const [selectPupilModal, setSelectPupilModal] = useState(false);
    const [sendInvitesModal, setSendInvitesModal] = useState(false);
    const [sendAwaitingInvitesModal, setSendAwaitingInvitesModal] = useState(false);
    const [editPremiumPupil, setEditPremiumPupil] = useState(false);
    const [addPupilToClassModal, setAddPupilToClassModal] = useState(false);
    const [addPupilForGroup, setAddPupilForGroup] = useState(false);
    const [schoolMIS, setSchoolMIS] = useState(null);
    const [certificateId, setCertificateId] = useState<string>('0');
    const [certificateTitle, setCertificateTitle] = useState(null);

    const [linkPupilsToSimsModal, setLinkPupilsToSimsModal] = useState(false);
    const [certificate, setCertificate] = useState(null);

    const showAddPupil = pathname === '/class/[class_id]/pupils';

    const {
        loading: schoolClassLoading,
        error: schoolClassError,
        data: classData
    } = useQuery(getSchoolClassForRegister, {
        variables: { id: query?.class_id }
    });

    const [blankCertificateMutation] = useMutation(blankCertificateForRegister);

    const [confirmParentDetailsMutation, { loading: sendInvitationLoading }] = useMutation(confirmAllParentDetailsForRegister, {
        refetchQueries: [
            { query: getClassPupilsForTeacher, variables: { classId: query?.class_id } },
            { query: getClassPupilsForRegisterTable, variables: { id: query?.class_id } },
            { query: getActivityGridDataForGroupAcrossClasses, variables: { id: query?.class_id } },
            { query: getClassImportedPupils, variables: { classId: query?.class_id } },
            { query: getClassPupilsForClassPupilsPage, variables: { id: query?.class_id } }
        ]
    });

    const [sendPupilParentInvitaionMutation, { loading: sendPupilParentInvitaionLoading }] = useMutation(
        sendPupilParentInvitationImmediate,
        {
            refetchQueries: [
                { query: getClassPupilsForTeacher, variables: { classId: query?.class_id } },
                { query: getClassPupilsForRegisterTable, variables: { id: query?.class_id } },
                { query: getActivityGridDataForGroupAcrossClasses, variables: { id: query?.class_id } },
                { query: getClassImportedPupils, variables: { classId: query?.class_id } },
                { query: getClassPupilsForClassPupilsPage, variables: { id: query?.class_id } }
            ]
        }
    );

    useEffect(() => {
        if (schoolClassError?.message) {
            callSnackbar(schoolClassError, 'error');
        }
    }, [schoolClassError]);

    useEffect(() => {
        const pupils =
            classData?.schoolClass?.pupils?.filter((p) =>
                p?.trophies?.some((pt) => !pt?.lastCertificateDownloaded && pt?.trophy?.isActive)
            ) ?? [];

        if (pupils?.length) {
            const trophies = pupils?.[0]?.trophies?.filter((pt) => !pt?.lastCertificateDownloaded && pt?.trophy?.isActive) ?? [];

            if (trophies?.length) {
                setCertificate({ id: trophies?.[0]?.trophy?.id, title: trophies?.[0]?.trophy?.title });
            } else {
                setCertificate(null);
            }
        } else {
            setCertificate(null);
        }
    }, [classData]);

    const isDifferenceInSims = () =>
        classData?.schoolClass?.school?.misName && classData?.schoolClass?.pupils.some((p) => !p.importedStudent?.id);

    const isDownloadCertificate = () =>
        classData?.schoolClass?.isRegistrationClass && certificate?.id && certificate?.title ? true : false;

    const isMissing = () =>
        classData?.['schoolClass']?.['pupils']?.some(
            (pupil) => !pupil?.parentsContext?.allParentsRejected && pupil?.parentsContext?.allParentsRejectedOrImported
        );

    const hasAwaitingInviteParents = () =>
        classData?.['schoolClass']?.['pupils']?.some(
            (pupil) => pupil?.parentsContext?.allAwaitingInviteParents && pupil?.isCurrentYearTopicsReleased
        );

    const onSendInvite = (pupilParentIds) => {
        confirmParentDetailsMutation({
            variables: { input: pupilParentIds, schoolId: classData?.schoolClass?.school?.id }
        })
            .then(() => {
                callSnackbar(`Details of ${pupilParentIds.length} parents confirmed.`, 'success');
            })
            .catch(({ ...err }) => {
                setSendInvitesModal(false);
                callSnackbar(err, 'error');
            })
            .finally(() => {
                setSendInvitesModal(false);
            });
    };

    const onSendAwatingInvite = (pupilParentIds) => {
        sendPupilParentInvitaionMutation({
            variables: { pupilParentIds: pupilParentIds }
        })
            .then(() => {
                callSnackbar(`Invitation sent to ${pupilParentIds.length} parents.`, 'success');
            })
            .catch(({ ...err }) => {
                callSnackbar(err, 'error');
            })
            .finally(() => {
                setSendAwaitingInvitesModal(false);
            });
    };

    const onSelectStudent = () => {
        setSelectPupilModal(true);
        setCertificateTitle(null);
        setCertificateId('0');
    };

    const onDownloadBlankCertificate = (type: BlankCertificateType) => {
        blankCertificateMutation({ variables: { type } })
            .then((res) => {
                window.open(res?.data?.blankCertificate, '_blank');
            })
            .catch(({ ...err }) => {
                callSnackbar(err, 'error');
            });
    };

    const isRegistrationClass = classData?.schoolClass?.isRegistrationClass; //false
    const list = [];

    const certificateModalList = [
        { text: 'Select students', onClick: onSelectStudent, iconRight: true },
        {
            text: 'Download blank certificate',
            onClick: () => onDownloadBlankCertificate(BlankCertificateType.FULL_PROGRAMME),
            iconRight: true
        },
        ...(classData?.schoolClass?.IsReadingLogsEnabled
            ? [
                  {
                      text: 'Download reading certificate',
                      onClick: () => onDownloadBlankCertificate(BlankCertificateType.READING),
                      iconRight: true
                  }
              ]
            : [])
    ];

    const addPupilHandler = () => {
        setAddPupilToClassModal(!addPupilToClassModal);
        setSchoolMIS(classData?.schoolClass?.school?.misName);
    };

    if (hasAwaitingInviteParents() && classData?.schoolClass?.status === SchoolClassStatus.ACTIVE) {
        list.push({
            text: 'Send invites now',
            icon: 'mail',
            iconRight: true,
            onClick: () => setSendAwaitingInvitesModal(true)
        });
    }

    if (isMissing() && classData?.schoolClass?.status === SchoolClassStatus.ACTIVE) {
        list.push({
            text: 'Confirm parent details',
            icon: 'how_to_reg',
            iconRight: true,
            onClick: () => setSendInvitesModal(true)
        });
    }

    if (showAddPupil) {
        if (
            isRegistrationClass &&
            !classData?.schoolClass?.isLocked &&
            classData?.schoolClass?.period?.index >= classData?.schoolClass?.school?.curentPeriod?.index
        ) {
            list.unshift({
                text: 'Add pupils',
                icon: 'add_circle_outlined',
                iconRight: true,
                onClick: () => addPupilHandler()
            });
        } else if (!isRegistrationClass) {
            list.unshift({
                text: 'Add pupils',
                icon: 'add_circle_outlined',
                iconRight: true,
                onClick: () => setAddPupilForGroup(!addPupilForGroup)
            });
        }
    }

    if (classData?.schoolClass?.status === SchoolClassStatus.ACTIVE) {
        list.unshift({
            image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/trophy.png`,
            iconRight: true,
            onClick: () => {},
            text: (
                <CommonPopOver text="Certificates">
                    <div>
                        <CommonListWithIcon list={certificateModalList} />
                    </div>
                </CommonPopOver>
            )
        });
    }

    if (schoolClassLoading) return <CommonLoading />;

    return (
        <div className="register" data-test={'class-register-page'}>
            <ClassHeader schoolClassData={classData?.schoolClass} />

            {classData?.schoolClass?.status === SchoolClassStatus.ACTIVE ? (
                <CommonNavTabs
                    isReading={classData?.schoolClass?.IsReadingLogsEnabled}
                    isFullProgramme={classData?.schoolClass?.isFullProgramme}
                    isRegistrationClass={classData?.schoolClass?.isRegistrationClass}
                    subjects={classData?.schoolClass?.subjects}
                    attentionRequiredPupilsCount={classData?.schoolClass?.attentionRequiredPupilsCount}
                    schoolClass={classData?.schoolClass}
                />
            ) : (
                <div className="not-active-class-alert-container">
                    <div className="not-active-class-alert-mathscot-container">
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/programme-mathscot-alert-image.png`}
                        />
                    </div>
                    <div className="not-active-class-alert-text">
                        <Paragraph>
                            This class is not activated yet. If you&apos;re happy that the register below has the right pupils,{' '}
                            <Link
                                passHref
                                className="not-active-class-link-text"
                                data-test="class-register-activate-link"
                                href={`/class/${classData?.schoolClass?.id}/activate`}>
                                click here to activate now
                            </Link>
                            .
                        </Paragraph>
                    </div>
                </div>
            )}

            {isVisibleClassInfo ? (
                <>
                    <Grid container spacing={2}>
                        <CommonCard className="register-cards-grid" cardClassName="class-progrees-card" lg={8} md={8}>
                            <ClassStatsCard cardData={classData?.['schoolClass'].statistics} />
                        </CommonCard>
                        {list?.length > 0 ? (
                            <CommonCard lg={4} md={4} className="register-card">
                                <CommonListWithIcon dataTest="class-actions-list" list={list} />
                            </CommonCard>
                        ) : null}
                    </Grid>

                    <div className="register-table-container">
                        <div className="register-table-snackbar">
                            {classData?.schoolClass?.status === SchoolClassStatus.ACTIVE && (
                                <CommonPrioritySnackbar
                                    params={{
                                        onSendInviteClick: () => setSendInvitesModal(!sendInvitesModal),
                                        setLinkPupilsToSimsModal,
                                        linkPupilsToSimsModal,
                                        schoolClass: classData?.schoolClass,
                                        certificate,
                                        onSelectPupilModal: (certificateId, cTitle) => {
                                            setCertificateId(certificateId);
                                            setCertificateTitle(cTitle);
                                            setSelectPupilModal(!selectPupilModal);
                                        },
                                        attentionRequiredPupilsCount: classData?.schoolClass?.attentionRequiredPupilsCount,
                                        onPupilsTabHandler: () => push(`/class/${queryParams?.class_id}/pupils`),
                                        onScheduleTabHandler: () => push(`/class/${queryParams?.class_id}/schedule`)
                                    }}
                                    conditions={{
                                        pupilPage: [
                                            { key: 'pupils_not_registered_snackbar', value: isMissing(), isShow: false },
                                            {
                                                key: 'pupils_not_linked_to_MIS_registerPage_snackbar',
                                                value: isDifferenceInSims(),
                                                isShow: false
                                            },
                                            { key: 'pupil_new_certificate_snackbar', value: isDownloadCertificate(), isShow: false },
                                            { key: 'this_class_is_lock', value: classData?.schoolClass?.isLocked, isShow: false },
                                            {
                                                key: 'parents_not_receiving_notifications_snackbar',
                                                value: classData?.schoolClass?.attentionRequiredPupilsCount > 0,
                                                isShow: false
                                            },
                                            {
                                                key: 'no_topics_scheduled',
                                                value: !(
                                                    classData?.schoolClass?.classTopicContext?.hasReadingTopic ||
                                                    classData?.schoolClass?.classTopicContext?.hasTopics
                                                ),
                                                isShow: false
                                            }
                                        ],
                                        weekByWeekPage: [
                                            {
                                                key: 'parents_not_receiving_notifications_snackbar',
                                                value: classData?.schoolClass?.attentionRequiredPupilsCount > 0,
                                                isShow: false
                                            }
                                        ]
                                    }}
                                    page={showAddPupil ? 'pupilPage' : 'weekByWeekPage'}
                                />
                            )}
                        </div>
                    </div>
                </>
            ) : null}

            {linkPupilsToSimsModal && (
                <LinkPupilsToSimsModal
                    hideLinkedPupils
                    subHeading={classData?.schoolClass?.name}
                    open={linkPupilsToSimsModal}
                    toggle={() => setLinkPupilsToSimsModal(false)}
                    schoolMisIntegrationVariable={classData?.schoolClass?.school?.misName}
                    classId={queryParams?.class_id}
                    schoolId={classData?.schoolClass?.school?.id}
                />
            )}
            {editPremiumPupil && (
                <EditClassDetailModal
                    open={editPremiumPupil}
                    setOpen={() => setEditPremiumPupil(!editPremiumPupil)}
                    data={classData?.schoolClass?.pupils}
                />
            )}

            {selectPupilModal && (
                <SelectPupilTable
                    subHeading={classData?.['schoolClass'].name}
                    selectPupilModal={selectPupilModal}
                    onClose={() => setSelectPupilModal(false)}
                    setCertificateId={setCertificateId}
                    certificateId={certificateId}
                    certificateTitle={certificateTitle}
                    class_id={query?.class_id}
                    schoolId={classData?.['schoolClass']?.school?.id}
                    mainTeacherId={classData?.['schoolClass']?.mainTeacher?.id}
                />
            )}
            {sendInvitesModal && (
                <SendInvitationToParents
                    onEmailSend={onSendInvite}
                    subHeading={`${classData?.['schoolClass'].name}`}
                    selectPupilModal={sendInvitesModal}
                    onClose={() => setSendInvitesModal(false)}
                    btnLoading={sendInvitationLoading}
                    class_id={+query?.class_id}
                />
            )}
            {sendAwaitingInvitesModal && (
                <SendAwaitingInvitationToParents
                    onEmailSend={onSendAwatingInvite}
                    selectPupilModal={sendAwaitingInvitesModal}
                    onClose={() => setSendAwaitingInvitesModal(false)}
                    btnLoading={sendPupilParentInvitaionLoading}
                    class_id={+query?.class_id}
                />
            )}
            {sendAwaitingInvitesModal && (
                <SendAwaitingInvitationToParents
                    onEmailSend={onSendAwatingInvite}
                    selectPupilModal={sendAwaitingInvitesModal}
                    onClose={() => setSendAwaitingInvitesModal(false)}
                    btnLoading={sendPupilParentInvitaionLoading}
                    class_id={+query?.class_id}
                />
            )}

            {addPupilToClassModal && (
                <FindExistingPupil
                    classPupils={classData?.schoolClass?.pupils}
                    class_name={classData?.schoolClass?.name}
                    classYear={classData?.schoolClass?.yearGroup?.year}
                    classId={query?.class_id}
                    schoolId={classData?.schoolClass?.school?.id}
                    open={addPupilToClassModal}
                    setOpen={() => addPupilHandler()}
                    schoolMIS={schoolMIS}
                    onAddPupilClick={() => push(`/class/${query?.class_id}/add-pupil`)}
                />
            )}

            {addPupilForGroup && (
                <FindExistingClassPupil
                    classPupils={classData?.schoolClass?.pupils}
                    class_name={classData?.schoolClass?.name}
                    classId={query?.class_id}
                    schoolId={classData?.schoolClass?.school?.id}
                    isGroupAcrossClasses={classData?.schoolClass?.isGroupAcrossClasses}
                    open={addPupilForGroup}
                    setOpen={() => setAddPupilForGroup(!addPupilForGroup)}
                    parentClass={classData?.schoolClass?.parentClass}
                    getSchoolClassForRegister={getSchoolClassForRegister}
                />
            )}
        </div>
    );
};

export default TeacherClassWrapper;
