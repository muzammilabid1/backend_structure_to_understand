import { gql, useQuery } from '@apollo/client';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Alert, Grid } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { isReadyTeddyEnabledClassOnly, ThemeContext } from '../../../shared/Services/handler';
import Paragraph from '../../Shared/Typography/Paragraph';
import ChildSummaryCard from '../../Teacher/Cards/ChildSummaryCard';
import CommonCard from './../../Shared/Cards/CommonCard';
import CommonAddPupilInTag from './../../Shared/CommonAddPupilInTag';
import CommonListWithIcon from './../../Shared/CommonListWithIcon';
import CommonLoading from './../../Shared/CommonLoading';
import CommonTabs from './../../Shared/CommonTabs';
import AddParent from './../../Shared/Modals/AddParent';
import EditChildModal from './../../Shared/Modals/EditChildModal';
import PupilBookHistoryModal from './../../Shared/Modals/PupilBookHistoryModal';
import Heading1 from './../../Shared/Typography/Heading1';
import Activities from './Activities';
import EditPupilMathscot from './EditPupilMathscot';
import PupilDetails from './PupilDetails';
import PupilTrophiesDetails from './PupilTrophies';
import Reading from './Reading';

// Queries

export const getPupilForTeacherForChildDetails = gql`
    query pupil($id: String!) {
        pupil(id: $id) {
            id
            fullname
            firstname
            lastname
            pupilStatus
            lastLogin
            lastActivity
            videoCount
            watchedVideoCount
            activityCount
            feedbackCount
            isPremium
            yearGroup
            UPN
            currentClassOrGroupAcrossClasses {
                id
                name
                isRegistrationClass
                isReadyTeddyEnabled
                isPreAdmissionClass
                isFullProgramme
                IsReadingLogsEnabled
            }
            classGroups {
                id
                name
            }
            parentsContext {
                allParentsRejectedOrImported
                allParentsRejected
                allParentsNotActiveAndAtLeastOneInvited
            }
            currentReadingTopic {
                id
                class {
                    id
                    IsReadingLogsEnabled
                }
            }
            school {
                id
                misName
                schoolName
                importedSchool {
                    id
                }
                curentPeriod {
                    index
                }
            }
            tags {
                id
                name
                color
            }
            classes {
                id
                name
                IsReadingLogsEnabled
                isRegistrationClass
                period {
                    index
                }
                importedSchoolClass {
                    name
                    id
                    yearGroup {
                        year
                    }
                }
            }
            parents {
                status
                parent {
                    id
                    firstname
                    lastname
                    email
                    phoneNumber
                    userStatus
                    resetPassToken
                    importedContacts {
                        id
                        forename
                        surname
                        email
                        phoneNumber
                        importedStudentContacts {
                            parental_responsibility
                            priority
                            importedStudent {
                                id
                                lwpPupil {
                                    id
                                }
                            }
                        }
                    }
                }
            }
            mathscotUrl {
                thumbnailImage
            }
            allTopics {
                id
                watchedVideo
                topic {
                    teacherTopicName
                    isReading
                }
                activities {
                    id
                    earnedStar
                    activity {
                        name
                    }
                    feedbacks {
                        id
                        parentComment
                        pupilComment
                        photos {
                            id
                            filename
                        }
                        logCreatedBy {
                            id
                            firstname
                            lastname
                            nameForChildren
                            type
                        }
                        logCreatedAt
                        sharingAllowed
                        lastAction {
                            updatedAt
                        }
                        originalFeedbackId
                        entryDeletedAt
                        reasonToDelete
                    }
                }
            }

            importedStudent {
                id
                mis_id
                forename
                surname
                initials
                UPN
                gender
                isPremium
            }
        }
    }
`;

const ChildDetails = () => {
    const queryParams = useParams();
    const router = useRouter();

    const [editChildModal, setEditChildModal] = useState(false);
    const [addParentModal, setAddParentModal] = useState(false);
    const [bookHistoryModal, setBookHistoryModal] = useState({ open: false });
    const { callSnackbar } = useContext(ThemeContext);
    const [active, setActive] = useState(0);

    const {
        loading,
        error,
        data: pupil
    } = useQuery(getPupilForTeacherForChildDetails, {
        variables: { id: queryParams?.pupil_id }
    });

    const pupilName = pupil?.pupil?.parents?.map((pupilName) => {
        return pupilName?.parent;
    });

    const classId = pupil?.pupil?.classes?.map((classId) => {
        return classId?.id;
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const list = [
        {
            text: 'Edit child',
            icon: 'edit',
            onClick: () => setEditChildModal(!editChildModal),
            iconRight: true,
            dataTest: 'edit-child-action'
        },
        {
            text: 'Add a parent',
            icon: 'add_circle_outlined',
            onClick: () => setAddParentModal(!addParentModal),
            iconRight: true,
            dataTest: 'add-parent-action'
        },
        {
            text: 'Go to parent view',
            icon: 'visibility',
            iconRight: true,
            onClick: () => router?.push(`/child/${queryParams?.pupil_id}`),
            route: `/child/${queryParams?.pupil_id}`
        },
        ...(pupil?.pupil?.currentReadingTopic?.id && pupil?.pupil?.currentReadingTopic?.class?.IsReadingLogsEnabled
            ? [
                  {
                      text: 'Reading log',
                      icon: 'menu_book',
                      iconRight: true,
                      dataTest: 'reading-log-menu-on-pupil-details-page',
                      onClick: () =>
                          router?.push(`/pupil/${queryParams?.pupil_id}/reading?topicId=${pupil?.pupil?.currentReadingTopic?.id}`),
                      route: `/pupil/${queryParams?.pupil_id}/reading?topicId=${pupil?.pupil?.currentReadingTopic?.id}`
                  }
              ]
            : []),

        {
            text: 'Book history',
            image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/View_book_history_black_icon.svg`,
            iconRight: true,
            onClick: () => setBookHistoryModal({ open: true, name: pupil?.pupil?.fullname, pupilId: pupil?.pupil?.id })
        }
        // {
        //     text: 'Download certificate',
        //     icon: 'emoji_events',
        //     iconRight: true
        // },
    ];

    const isReadingEnable = pupil?.pupil?.classes.some((item) => item.IsReadingLogsEnabled);

    useEffect(() => {
        if (active !== 0) {
            setActive(isReadingEnable ? active + 1 : active - 1);
        }
    }, [isReadingEnable]);

    const head = [
        { label: 'Activities', dataTest: 'pupil-details-activities-tab' },
        { label: 'Reading', dataTest: 'pupil-details-reading-tab' },
        { label: 'Awards', dataTest: 'pupil-details-awards-tab' },
        { label: 'Details', dataTest: 'pupil-details-details-tab' },
        { label: 'Mathscot', dataTest: 'pupil-details-mathscot-tab' }
    ];
    const body = [
        <Activities loading={loading} pupilTopics={pupil?.pupil?.allTopics} pupil={pupilName} />,
        <Reading pupilId={queryParams?.pupil_id} pupil={pupil} classId={classId} />,
        <PupilTrophiesDetails isTeacherView={true} />,
        <PupilDetails pupil={pupil} />,
        <EditPupilMathscot pupilId={queryParams?.pupil_id} />
    ];

    if (!isReadingEnable) {
        head.splice(1, 1);
        body.splice(1, 1);
    }

    const showAlert = (parentsContext) => {
        if (
            (!parentsContext?.allParentsRejected && parentsContext?.allParentsRejectedOrImported) ||
            parentsContext?.allParentsNotActiveAndAtLeastOneInvited
        ) {
            const pupilParentStatus =
                !parentsContext?.allParentsRejected && parentsContext?.allParentsRejectedOrImported ? 'IMPORTED' : 'INVITED';

            return (
                <Alert
                    severity={pupilParentStatus === 'INVITED' ? 'warning' : 'info'}
                    icon={pupilParentStatus === 'INVITED' ? <HelpOutlineIcon /> : <InfoOutlinedIcon />}>
                    {pupilParentStatus === 'INVITED'
                        ? 'This pupil’s parents are receiving notifications, but have not accessed the site yet. You can check contact details and send reminders from the “Details” tab below.'
                        : `Please confirm the contact details for this pupil's parents on the "Details" tab so that they start receiving notifications.`}
                </Alert>
            );
        }

        return null;
    };

    let pupilClasses = [];

    if (pupil?.pupil) {
        const pupilClassGroups = pupil.pupil.classGroups?.length > 0 ? pupil?.pupil?.classGroups : [];

        pupilClasses = [pupil?.pupil?.currentClassOrGroupAcrossClasses, ...pupilClassGroups];
    }

    const pupilDetails = pupil?.pupil;

    const pupilMathscot = useMemo(() => {
        const mathscot = pupilDetails?.mathscotUrl?.thumbnailImage || '';

        if (!mathscot && isReadyTeddyEnabledClassOnly(pupilDetails?.currentClassOrGroupAcrossClasses))
            return `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/teddy.png`;

        return mathscot;
    }, [pupilDetails]);

    if (loading) return <CommonLoading />;

    return (
        <div className="child_detail_container">
            {pupil?.pupil?.currentClassOrGroupAcrossClasses?.isRegistrationClass ? (
                <div className="child_pupil_classes">
                    {pupilClasses.map((pupilClass) => (
                        <Paragraph customClass="cp" onClick={() => router?.push(`/class/${pupilClass?.id}/readingweek`)}>
                            <u> {pupilClass?.name}</u>
                        </Paragraph>
                    ))}
                </div>
            ) : (
                ''
            )}
            <Grid container alignItems={'center'} spacing={3} py={2}>
                <Grid item>
                    <Heading1 text={pupil?.pupil?.fullname} dataTest="pupil-details-fullname" />
                </Grid>
                <Grid item>
                    <CommonAddPupilInTag
                        tags={pupil?.pupil.tags}
                        pupilId={pupil?.pupil?.id}
                        schoolId={pupil?.pupil?.school?.id}
                        query={getPupilForTeacherForChildDetails}
                        variables={{ id: queryParams?.pupil_id }}
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <ChildSummaryCard
                    child_img={pupilMathscot}
                    class_name={
                        (pupil?.pupil?.classes || [])
                            ?.filter((c) => c?.period?.index >= pupil?.pupil?.school?.curentPeriod?.index)
                            ?.map((c) => c.name)
                            ?.join(', ') || '-'
                    }
                    pupilStatus={pupil?.pupil?.pupilStatus}
                    lastLogin={pupil?.pupil?.lastLogin}
                    lastActivity={pupil?.pupil?.lastActivity}
                    videoCount={pupil?.pupil?.videoCount || 0}
                    watchedVideoCount={pupil?.pupil?.watchedVideoCount || 0}
                    activityCount={pupil?.pupil?.activityCount}
                    feedbackCount={pupil?.pupil?.feedbackCount}
                />

                <CommonCard lg={4} md={4} className="register-card">
                    <CommonListWithIcon list={list} />
                </CommonCard>
            </Grid>

            <br />
            {showAlert(pupil?.pupil?.parentsContext)}

            <br />

            <CommonTabs tebs={head} value={active} onChange={setActive}>
                {body[active]}
            </CommonTabs>

            {editChildModal && (
                <EditChildModal
                    isPremium={pupil?.pupil?.isPremium}
                    firstname={pupil?.pupil?.firstname}
                    lastname={pupil?.pupil?.lastname}
                    id={pupil?.pupil?.id}
                    open={editChildModal}
                    setOpen={() => setEditChildModal(!editChildModal)}
                />
            )}

            {addParentModal && <AddParent open={addParentModal} setOpen={setAddParentModal} child_id={queryParams?.pupil_id} />}
            <PupilBookHistoryModal
                open={bookHistoryModal?.open}
                setOpen={setBookHistoryModal}
                name={bookHistoryModal?.name}
                pupilId={bookHistoryModal?.pupilId}
            />
        </div>
    );
};

export default ChildDetails;
