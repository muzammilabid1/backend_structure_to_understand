/* eslint-disable @next/next/no-img-element */
import { gql, useQuery } from '@apollo/client';
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { getActiveStaticTrophy } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, SchoolClassStatus } from '../../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonPrioritySnackbar from '../../../Shared/CommonPrioritySnackBar';
import PurchaseClassModal from '../../../Shared/Modals/PurchaseClassModal';
import Paragraph from '../../../Shared/Typography/Paragraph';
import SelectPupilTable from '../../../Teacher/SelectPupilTable';
import HiddenClasses from './HiddenClasses';
import RegistrationClasses from './RegistrationClasses';
import GroupsAcrossClasses from './GroupsAcrossClasses';

// Queries
const getSchoolClassesForClassOverView = gql`
    query getSchoolClassesForSchoolOverview($schoolId: String!) {
        getSchoolClassesForSchoolOverview(schoolId: $schoolId) {
            id
            name
            schoolClassName
            classSize
            registerCount
            missingCount
            readingTarget
            status
            isRegistrationClass
            activeCount
            IsReadingLogsEnabled
            isFullProgramme
            isReadyTeddyEnabled
            isPreAdmissionClass
            canAutoScheduleMoneySkills
            school {
                id
                misName
                curentPeriod {
                    index
                }
            }
            currentTopic {
                id
                releaseDate
                dueDate
                topic {
                    teacherTopicName
                }
            }
            upcomingTopic {
                id
                releaseDate
                dueDate
                topic {
                    teacherTopicName
                }
            }
            period {
                index
                shortName
                isCurrentPeriod
            }
            importedSchoolClass {
                id
            }
            teachers {
                id
                firstname
                lastname
                lastLogin
                lastAccess
            }
            yearGroup {
                id
                year
            }
            mainTeacher {
                id
                firstname
                lastname
                nameForChildren
                lastLogin
                lastAccess
            }
            pupils {
                id
                trophies {
                    id
                    lastCertificateDownloaded
                    trophy {
                        id
                        title
                        isActive
                    }
                }
            }
            statistics {
                missing
                registered
                active
            }
        }
    }
`;

const getGroupsAcrossClassesForClassOverView = gql`
    query getGroupsAcrossClassesForSchoolOverview($schoolId: String!) {
        getGroupsAcrossClassesForSchoolOverview(schoolId: $schoolId) {
            id
            name
            schoolClassName
            classSize
            registerCount
            missingCount
            readingTarget
            isGroupAcrossClasses
            status
            isRegistrationClass
            activeCount
            IsReadingLogsEnabled
            isFullProgramme
            isReadyTeddyEnabled
            isPreAdmissionClass
            school {
                id
                misName
                curentPeriod {
                    index
                }
            }
            currentTopic {
                id
                releaseDate
                dueDate
                topic {
                    teacherTopicName
                }
            }
            upcomingTopic {
                id
                releaseDate
                dueDate
                topic {
                    teacherTopicName
                }
            }
            period {
                index
                shortName
                isCurrentPeriod
            }
            teachers {
                id
                firstname
                lastname
                lastLogin
                lastAccess
            }
            yearGroup {
                id
                year
            }
            mainTeacher {
                id
                firstname
                lastname
                nameForChildren
                lastLogin
                lastAccess
            }
            pupils {
                id
                trophies {
                    id
                    lastCertificateDownloaded
                    trophy {
                        id
                        title
                        isActive
                    }
                }
            }
            statistics {
                missing
                registered
                active
            }
        }
    }
`;

// Component
const useStyles = makeStyles({
    column: {
        flexBasis: '33.33%'
    },
    iconColor: {
        color: '#E8492A'
    },
    certificateIcon: {
        marginLeft: '8px'
    },
    progressCell: {
        maxWidth: '268px'
    },
    summaryParentLeft: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        marginLeft: '12px',
        '& div': {
            width: '238px'
        }
    },
    summaryParentRight: {
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-end',
        marginRight: '17px',
        '& h3': {
            cursor: 'pointer'
        }
    },
    unlinked: {
        cursor: 'default'
    }
});

const ClassOverView = ({ schoolId, schoolData }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const _classes = useStyles();

    const [selectPupilModal, setSelectPupilModal] = useState(false);
    const [certificateId, setCertificateId] = useState('0');
    const [certificateTitle, setCertificateTitle] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [activeTrophies, setActiveTrophies] = useState([]);
    const [purchaseClassModal, setPurchaseClassModal] = useState(false);

    const { loading, error: error, data: allClasses } = useQuery(getSchoolClassesForClassOverView, { variables: { schoolId } });
    const {
        loading: groupAcrossClassesLoading,
        error: groupAcrossClassesError,
        data: groupAcrossClassesData
    } = useQuery(getGroupsAcrossClassesForClassOverView, { variables: { schoolId } });

    const { error: activeTrophiesError, data: activeTrophiesData } = useQuery(getActiveStaticTrophy);

    useEffect(() => {
        const trophies = (activeTrophiesData?.getActiveStaticTrophy || [])?.map((at) => ({ key: at?.id, value: at?.title }));

        setActiveTrophies(trophies);
    }, [activeTrophiesData]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, groupAcrossClassesError);
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, activeTrophiesError);
    }, [error, groupAcrossClassesError, activeTrophiesError]);

    const school = schoolData?.['getSchool'];

    const snackbarText = () => {
        const remainingTotalAllowedClasses = school?.remainingAllowedClassesInfo?.total;

        const remainingFullProgrammeClasses = school?.remainingAllowedClassesInfo?.fullProgramme;

        // If no allowed classes, no full program classes
        if (remainingTotalAllowedClasses === 0 && remainingFullProgrammeClasses === 0) {
            return `You cannot activate any more classes.`;
        }

        const getClassLabel = (count) => {
            return count === 1 ? 'class' : 'classes';
        };

        return (
            <>
                You{' '}
                {remainingTotalAllowedClasses > 0 ? (
                    <>
                        can activate{' '}
                        <b>
                            {remainingTotalAllowedClasses} more {getClassLabel(remainingTotalAllowedClasses)}
                        </b>
                    </>
                ) : remainingTotalAllowedClasses === 0 ? (
                    `cannot activate any classes`
                ) : (
                    `cannot activate any more classes`
                )}{' '}
                for the current academic year, you {remainingFullProgrammeClasses > 0 ? 'can' : 'cannot'} add topics and activities to{' '}
                {remainingFullProgrammeClasses > 0 ? (
                    <b>
                        {remainingFullProgrammeClasses} {getClassLabel(remainingFullProgrammeClasses)}
                    </b>
                ) : school?.numOfFullProgrammeClassesAllowed === 0 ? (
                    'any classes'
                ) : (
                    'any more classes'
                )}
                .
            </>
        );
    };

    const { registrationClasses, readyTeddyClasses, hiddenClasses } = useMemo(() => {
        const allSchoolClasses = allClasses?.getSchoolClassesForSchoolOverview || [];

        const registrationClasses = allSchoolClasses.filter(
            (classes) =>
                classes.status != SchoolClassStatus.HIDDEN &&
                (classes?.period?.index == classes?.school?.curentPeriod?.index || classes?.period?.isCurrentPeriod)
        );

        const readyTeddyClasses = allSchoolClasses.filter(
            (classes) => classes.status != SchoolClassStatus.HIDDEN && classes?.period?.index > classes?.school?.curentPeriod?.index
        );

        const hiddenClasses = allSchoolClasses.filter((classes) => classes.status === SchoolClassStatus.HIDDEN);

        return { registrationClasses, readyTeddyClasses, hiddenClasses };
    }, [allClasses]);

    if (loading || groupAcrossClassesLoading) return <CommonLoading />;

    return (
        <div className="school-overview-classDetail-page" data-test={'classes-overview-tab-section'}>
            <CommonPrioritySnackbar
                params={{ schoolId: schoolId, schoolData: schoolData }}
                conditions={{
                    classOverViewPage: [
                        { key: 'pupils_not_linked_to_MIS_snackbar', value: school?.pupilsWithoutMISCount > 0, isShow: false }
                    ]
                }}
                page="classOverViewPage"
            />

            <div className="school-overview-alert-container">
                <div className="school-overview-left">
                    <div className="school-overview-alert-mathscot-container">
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/programme-mathscot-alert-image.png`}
                        />
                    </div>
                    <div className="school-overview-alert-text">
                        <Paragraph>
                            {snackbarText()}{' '}
                            <u
                                className="cp"
                                data-test="school-overview-purchase-class-licence-link"
                                onClick={() => setPurchaseClassModal(!purchaseClassModal)}>
                                Purchase additional class licences
                            </u>
                        </Paragraph>
                    </div>
                </div>
            </div>

            <RegistrationClasses
                schoolId={schoolId}
                setSelectedClass={setSelectedClass}
                setSelectPupilModal={setSelectPupilModal}
                selectPupilModal={selectPupilModal}
                _classes={_classes}
                getSchoolClassesForClassOverView={getSchoolClassesForClassOverView}
                schoolClasses={registrationClasses}
                title="Registration classes"
                isVisibleAddClass={school?.enableAddClasses}
                dataTest="registration-classes"
            />

            <GroupsAcrossClasses
                schoolId={schoolId}
                _classes={_classes}
                dataTest="group-across-classes"
                title="Groups"
                schoolClasses={groupAcrossClassesData?.getGroupsAcrossClassesForSchoolOverview || []}
            />

            {school?.isReadyTeddyAvailable ? (
                <RegistrationClasses
                    schoolId={schoolId}
                    setSelectedClass={setSelectedClass}
                    setSelectPupilModal={setSelectPupilModal}
                    selectPupilModal={selectPupilModal}
                    _classes={_classes}
                    isVisibleAddClass={true}
                    currentYearClasses={false}
                    getSchoolClassesForClassOverView={getSchoolClassesForClassOverView}
                    schoolClasses={readyTeddyClasses}
                    title={`${school?.curentPeriod?.nextPeriod?.shortName ?? ''} classes`}
                    dataTest="next-academic-year-classes"
                />
            ) : null}

            <HiddenClasses hiddenClasses={hiddenClasses} />

            {selectPupilModal && (
                <SelectPupilTable
                    subHeading={`${selectedClass?.name}`}
                    selectPupilModal={selectPupilModal}
                    onClose={() => setSelectPupilModal(false)}
                    setCertificateId={setCertificateId}
                    certificateId={certificateId}
                    certificateTitle={certificateTitle}
                    setCertificateTitle={setCertificateTitle}
                    class_id={selectedClass?.id}
                    mainTeacherId={selectedClass?.mainTeacherId}
                    schoolId={selectedClass?.schoolId}
                    activeTrophies={activeTrophies}
                />
            )}

            {purchaseClassModal && (
                <PurchaseClassModal schoolId={schoolId} open={purchaseClassModal} setOpen={() => setPurchaseClassModal(false)} />
            )}
        </div>
    );
};

ClassOverView.propTypes = { schoolId: PropTypes.string, schoolData: PropTypes.object };

export default ClassOverView;
