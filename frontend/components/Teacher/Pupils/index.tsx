import { gql, useMutation, useQuery } from '@apollo/client';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ChangeCircleOutlinedIcon from '@mui/icons-material/ChangeCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Avatar, Chip, Collapse, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import { getClassPupilsForClassPupilsPage, getSchoolClassForRegister, getSchoolForDashboardWrapper } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, PupilStatus } from '../../../shared/Constant';
import { countWithPlural, getPupilStatusBorderColor, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonAddPupilInTag, { IDialogWrapperOptionPupilTag } from '../../Shared/CommonAddPupilInTag';
import EditTags from '../../Shared/CommonAddPupilInTag/EditTags';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonListWithIcon from '../../Shared/CommonListWithIcon';
import CommonLoading from '../../Shared/CommonLoading';
import CommonPopOver from '../../Shared/CommonPopOver';
import CommonTooltipIcon from '../../Shared/CommonTooltipIcon';
import AddPupilToClassModal from '../../Shared/Modals/AddPupilToClassModal';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import PupilBookHistoryModal from '../../Shared/Modals/PupilBookHistoryModal';
import AddPupilToClassGroup from '../../Shared/PupilClassGroups/AddPupilToClassGroup';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
import ParentsCaresDrawer from './ParentsCaresDrawer';
import PupulParentDetails from './PupulParentDetails';

const removePupilsFromClass = gql`
    mutation removePupilsFromClass($pupilIds: [String!]!, $classId: String!) {
        removePupilsFromClass(pupilIds: $pupilIds, classId: $classId)
    }
`;

const changePupilsClass = gql`
    mutation changePupilsClass($pupilIds: [String!]!, $newClassId: String!) {
        changePupilsClass(pupilIds: $pupilIds, newClassId: $newClassId)
    }
`;

interface Period {
    index: number;
}

interface YearGroup {
    year: string;
}

interface ParentClass {
    id: string;
    name: string;
}

interface Pupil {
    id: string;
}

interface School {
    id: string;
    misName: string;
    curentPeriod: Period;
}

interface ClassData {
    id: string;
    IsReadingLogsEnabled: boolean;
    isFullProgramme: boolean;
    isRegistrationClass: boolean;
    subjects: string[];
    status: string;
    isLocked: boolean;
    period: Period;
    school: School;
    pupils: Pupil[];
    name: string;
    yearGroup: YearGroup;
    parentClass: ParentClass | null;
}

interface PupilsProps {
    classData: ClassData | null;
}

const selectedPupilsInitialState = {
    ids: [],
    open: false,
    isActionsWithSinglePupil: false
};

const Pupils = ({ classData }: PupilsProps) => {
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const initialValue: IDialogWrapperOptionPupilTag = {
        isOpen: false,
        pupilIds: [],
        schoolId: classData?.school?.id
    };

    const query = useParams();

    const [selectPupils, setSelectPupils] = useState(selectedPupilsInitialState);
    const [bookHistoryModal, setBookHistoryModal] = useState({ open: false, name: '', pupilId: null });
    const [dialogWrapperOption, setDialogWrapperOption] = useState<IDialogWrapperOptionPupilTag>(initialValue);
    const [drawerState, setDrawerState] = useState({
        pupil: null,
        open: false
    });
    const [changeClassConfirmationModal, setChangeClassConfirmationModal] = useState(false);
    const [showAddClassGroupModal, setShowAddClassGroupModal] = useState(false);

    const { loading, error: error, data } = useQuery(getClassPupilsForClassPupilsPage, { variables: { id: query?.class_id } });

    const [removePupilsFromClassMutation, { loading: removePupilsFromClassLoading }] = useMutation(removePupilsFromClass, {
        refetchQueries: [
            { query: getClassPupilsForClassPupilsPage, variables: { id: query?.class_id } },
            {
                query: getSchoolForDashboardWrapper,
                variables: { id: classData?.school?.id }
            }
        ],
        awaitRefetchQueries: true
    });

    const [changePupilsClassMutation, { loading: changePupilClassLoading }] = useMutation(changePupilsClass, {
        refetchQueries: [
            { query: getClassPupilsForClassPupilsPage, variables: { id: query?.class_id } },
            { query: getSchoolClassForRegister, variables: { id: query?.class_id } }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    const getPupilStatusBackgroundColor = (allParentsRejectedOrImported, allParentsRejected, noParents) => {
        if (classData?.status !== 'ACTIVE') {
            return '';
        }

        if (allParentsRejected || noParents) {
            return '#FCF3F1 !important';
        }

        if (allParentsRejectedOrImported) {
            return '#E5F3FA !important';
        }
    };

    const pupilStatusIcon = (pupil) => {
        if (pupil?.allParentsRejected || pupil?.noParents) {
            return <WarningAmberOutlinedIcon />;
        }

        if (pupil?.allParentsRejectedOrImported) {
            return 'info_outlined';
        }

        if (pupil?.allParentsNotActiveAndAtLeastOneInvited) {
            return 'info_outlined';
        }

        return null;
    };

    const pupilStatusPopoverText = (pupil) => {
        if (pupil?.noParents) {
            return (
                <Paragraph>
                    There are no parent details for this pupil. Please click on the pupil name and go to the &ldquo;Details&ldquo; tab to
                    add parent details.
                </Paragraph>
            );
        }

        if (pupil?.allParentsRejected) {
            return (
                <Paragraph>
                    This pupil’s parent has rejected the invitation. Please click on the pupil name and go to the “Details” tab to check
                    their parent details are correct.
                </Paragraph>
            );
        }

        if (pupil?.allParentsRejectedOrImported) {
            return (
                <Paragraph>
                    <b>ACTION REQUIRED:</b> Please confirm parent details for sending notifications from the link in the blue bar above the
                    register.
                </Paragraph>
            );
        }

        if (pupil?.allParentsNotActiveAndAtLeastOneInvited) {
            return <Paragraph>This pupil’s parents are receiving notifications but they have not accessed the site yet.</Paragraph>;
        }

        return null;
    };

    const pupilStatusIconClassName = (pupil) => {
        if (pupil?.allParentsRejected || pupil?.noParents) {
            return 'warning_icon_color';
        }

        if (pupil?.allParentsRejectedOrImported) {
            return 'info_blue_color';
        }

        if (pupil?.allParentsNotActiveAndAtLeastOneInvited) {
            return 'info_yellow_color';
        }

        return null;
    };

    const onPupilClick = (id: number) => {
        const currentIds = selectPupils?.ids || [];

        if (currentIds.includes(id)) {
            setSelectPupils({ ids: currentIds.filter((x) => x !== id), open: false, isActionsWithSinglePupil: false });
        } else {
            setSelectPupils({ ids: [...currentIds, id], open: false, isActionsWithSinglePupil: false });
        }
    };

    const selectAllPupil = () => {
        if (selectPupils?.ids?.length > 0) {
            setSelectPupils(selectedPupilsInitialState);
        } else {
            setSelectPupils({
                ids: (data?.getClassPupilsForClassPupilsPage || [])?.map((pupil) => pupil?.id),
                open: false,
                isActionsWithSinglePupil: false
            });
        }
    };

    const list = (pupil) => [
        {
            text: 'Book history',
            image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/View_book_history_black_icon.svg`,
            onClick: () => setBookHistoryModal({ open: true, name: pupil.fullname, pupilId: pupil.id })
        },
        {
            text: 'Go to reading log',
            icon: 'menu_book',
            onClick: () => router?.push(`/pupil/${pupil?.id}/reading`)
        },
        {
            text: 'Remove pupil from the class',
            icon: 'delete',
            onClick: () => setSelectPupils({ ids: [pupil?.id], open: true, isActionsWithSinglePupil: true }),
            dataTest: 'remove-pupil-from-class-list-item'
        },
        ...(classData?.isRegistrationClass
            ? [
                  {
                      text: 'Change class',
                      icon: 'change_circle',
                      onClick: () => {
                          setChangeClassConfirmationModal(true);
                          setSelectPupils({ ...selectPupils, ids: [pupil?.id], isActionsWithSinglePupil: true });
                      }
                  },
                  {
                      text: 'Add to group',
                      icon: 'add_circle',
                      onClick: () => {
                          setShowAddClassGroupModal(true);
                          setSelectPupils({ ...selectPupils, ids: [pupil?.id], isActionsWithSinglePupil: true });
                      }
                  }
              ]
            : [])
    ];

    const pupilStatuses = {
        [PupilStatus.ACTIVE]: {
            name: 'Active this term',
            colour: '#99C95D'
        },
        [PupilStatus.REGISTERED]: {
            name: 'Accessed the site',
            colour: '#C6DD84'
        },
        [PupilStatus.MISSING]: {
            name: 'No linked parent',
            colour: '#FAF3B3'
        }
    };

    const renderParentPopover = (id: string, count: number, color: string, type: string) => (
        <CommonPopOver
            hover
            element={
                <Avatar
                    sx={{
                        width: '28px',
                        height: '28px',
                        fontSize: '14px',
                        color: '#000',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        bgcolor: color
                    }}>
                    {count}
                </Avatar>
            }>
            <PupulParentDetails id={id} type={type} />
        </CommonPopOver>
    );

    const handleChangePupilsClassOrAddInGroup = async (newClassId: string, selectedClassName: string) => {
        changePupilsClassMutation({
            variables: { newClassId, pupilIds: selectPupils.ids }
        })
            .then(() => {
                callSnackbar(
                    `${selectPupils.ids.length === 1 ? 'Pupil has' : 'Pupils have'} been added to "${selectedClassName}" ${showAddClassGroupModal ? 'group' : 'class'}`,
                    'success'
                );
                setSelectPupils(selectedPupilsInitialState);
                setChangeClassConfirmationModal(false);
                setShowAddClassGroupModal(false);
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    if (loading) return <CommonLoading />;

    return (
        <>
            <TableContainer className="pupil_table_body_container">
                <Table aria-label="simple table" className="pupil_table_body">
                    <TableHead>
                        <TableRow>
                            <TableCell width={'1px'}>
                                <CommonCheckBox
                                    sx={{
                                        margin: 0
                                    }}
                                    indeterminate={
                                        !selectPupils.isActionsWithSinglePupil &&
                                        selectPupils?.ids?.length > 0 &&
                                        selectPupils?.ids?.length !== data?.getClassPupilsForClassPupilsPage?.length
                                    }
                                    checked={!selectPupils.isActionsWithSinglePupil && selectPupils?.ids?.length > 0}
                                    onClick={selectAllPupil}
                                    dataTest="select-all-pupils-checkbox-in-class-pupils-page"
                                    name="selectAllPupils"
                                />
                            </TableCell>
                            <TableCell>Pupil name</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Tags</TableCell>
                            <TableCell>Parents</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data?.getClassPupilsForClassPupilsPage || []).map((pupil) => {
                            const tableCellBG = {
                                backgroundColor: getPupilStatusBackgroundColor(
                                    pupil?.allParentsRejectedOrImported,
                                    pupil?.allParentsRejected,
                                    pupil?.noParents
                                )
                            };

                            const statusDetails = pupilStatuses[pupil?.pupilStatus];

                            return (
                                <TableRow key={pupil?.id} className={'table-row'}>
                                    <TableCell
                                        className={`${getPupilStatusBorderColor(pupil?.pupilStatus)}`}
                                        sx={{
                                            ...tableCellBG
                                        }}>
                                        <CommonCheckBox
                                            sx={{
                                                margin: 0
                                            }}
                                            dataTest={`select-pupil-${(pupil?.fullname || '')?.split(' ').join('-')}-checkbox-in-class-pupils-page`}
                                            checked={!selectPupils?.isActionsWithSinglePupil && selectPupils?.ids?.includes(pupil?.id)}
                                            onClick={() => onPupilClick(pupil?.id)}
                                        />
                                    </TableCell>
                                    <TableCell
                                        className={`table-cell`}
                                        sx={{
                                            ...tableCellBG
                                        }}>
                                        <div className="pupil-name-status-container">
                                            <Paragraph
                                                customClass="cp ul"
                                                text={pupil?.fullname}
                                                dataTest="class-pupil-page-pupil-name"
                                                onClick={() => {
                                                    router?.push(`/pupil/${pupil?.id}`);
                                                }}
                                            />
                                            {classData?.status === 'ACTIVE' && (
                                                <CommonTooltipIcon
                                                    text={pupilStatusPopoverText(pupil)}
                                                    customIconClass={pupilStatusIconClassName(pupil)}
                                                    icon={pupilStatusIcon(pupil)}
                                                    iconComponent={pupilStatusIcon(pupil)}
                                                />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            ...tableCellBG
                                        }}>
                                        <Chip
                                            style={{
                                                backgroundColor: statusDetails?.colour,
                                                borderRadius: '4px'
                                            }}
                                            label={statusDetails?.name}
                                        />
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            ...tableCellBG
                                        }}>
                                        <CommonAddPupilInTag
                                            tags={pupil.tags}
                                            pupilId={pupil?.id}
                                            schoolId={classData?.school?.id}
                                            query={getClassPupilsForClassPupilsPage}
                                            variables={{ id: query?.class_id }}
                                        />
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            ...tableCellBG
                                        }}>
                                        <Grid display={'flex'} gap={0.5}>
                                            {pupil?.activeParentsCount > 0 &&
                                                renderParentPopover(pupil.id, pupil.activeParentsCount, '#65B32E', 'ACTIVE')}
                                            {pupil?.invitedParentsCount > 0 &&
                                                renderParentPopover(pupil.id, pupil.invitedParentsCount, '#FDC300', 'INVITED')}
                                            {pupil?.importedParentsCount > 0 &&
                                                renderParentPopover(pupil.id, pupil.importedParentsCount, '#D6D1CB', 'IMPORTED')}
                                            {pupil?.rejectedParentsCount > 0 &&
                                                renderParentPopover(pupil.id, pupil.rejectedParentsCount, '#E8492A', 'REJECTED')}

                                            <CommonTooltipIcon
                                                icon={'read_more'}
                                                text={null}
                                                onClick={() => {
                                                    setDrawerState({
                                                        pupil: pupil,
                                                        open: true
                                                    });
                                                }}
                                            />
                                        </Grid>
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            ...tableCellBG
                                        }}>
                                        <CommonPopOver dataTest={`class-pupil-page-pupil-pop-over`} icon="more_horiz">
                                            <CommonListWithIcon list={list(pupil)} />
                                        </CommonPopOver>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Collapse
                unmountOnExit
                in={selectPupils?.ids?.length > 0 && !selectPupils?.isActionsWithSinglePupil}
                sx={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 1
                }}>
                <Grid
                    component={Paper}
                    sx={{
                        mt: 1,
                        px: 4,
                        py: 3
                    }}>
                    <Grid container justifyContent={'space-between'} alignItems={'center'} gap={1}>
                        <Heading3 text="Actions:" />
                        <Grid display={'flex'} alignItems={'center'} gap={1} flexWrap="wrap">
                            {classData?.isRegistrationClass ? (
                                <>
                                    <LWPButton
                                        btnText={`Change class`}
                                        startIcon={<ChangeCircleOutlinedIcon />}
                                        sx={{
                                            borderRadius: '4px',
                                            border: '1px solid  #999591',
                                            fontWeight: '400 !important',
                                            fontSize: '14px'
                                        }}
                                        onClick={() => {
                                            setChangeClassConfirmationModal(true);
                                            setSelectPupils((pre) => ({ ...pre, isActionsWithSinglePupil: false }));
                                        }}
                                        dataTest="change-pupil-class-button"
                                        variant="outlined"
                                        color="inherit"
                                    />
                                    <LWPButton
                                        btnText={`Add to group`}
                                        startIcon={<AddCircleOutlineIcon />}
                                        sx={{
                                            borderRadius: '4px',
                                            border: '1px solid  #999591',
                                            fontWeight: '400 !important',
                                            fontSize: '14px'
                                        }}
                                        onClick={() => {
                                            setShowAddClassGroupModal(true);
                                            setSelectPupils((pre) => ({ ...pre, isActionsWithSinglePupil: false }));
                                        }}
                                        variant="outlined"
                                        color="inherit"
                                        dataTest="add-pupil-to-group-button"
                                    />
                                </>
                            ) : null}

                            <LWPButton
                                btnText={`Add tag`}
                                startIcon={<AddCircleOutlineIcon />}
                                sx={{
                                    borderRadius: '4px',
                                    border: '1px solid  #999591',
                                    fontWeight: '400 !important',
                                    fontSize: '14px'
                                }}
                                onClick={() => setDialogWrapperOption({ ...initialValue, pupilIds: selectPupils?.ids, isOpen: true })}
                                variant="outlined"
                                color="inherit"
                            />
                            <LWPButton
                                btnText={`Remove ${countWithPlural('pupil', selectPupils?.ids.length, false)}`}
                                startIcon="delete"
                                sx={{
                                    borderRadius: '4px',
                                    border: '1px solid  #999591',
                                    fontWeight: '400 !important',
                                    fontSize: '14px'
                                }}
                                onClick={() => setSelectPupils((pre) => ({ ...pre, open: true, isActionsWithSinglePupil: false }))}
                                variant="outlined"
                                color="inherit"
                            />
                            <CommonTooltipIcon icon={'close'} text={null} onClick={selectAllPupil} />
                        </Grid>
                    </Grid>
                </Grid>
            </Collapse>

            <ParentsCaresDrawer drawerState={drawerState} setDrawerState={setDrawerState} />

            <ConfirmationModal
                open={selectPupils?.open}
                onCancel={() => setSelectPupils((pre) => ({ ...pre, open: false, ids: pre.isActionsWithSinglePupil ? [] : pre.ids }))}
                loading={removePupilsFromClassLoading}
                heading={`Remove pupil${selectPupils?.ids.length > 1 ? 's' : ''} from this class?`}
                btnText="Yes"
                onConfirm={() => {
                    removePupilsFromClassMutation({
                        variables: {
                            pupilIds: selectPupils?.ids,
                            classId: query?.class_id
                        }
                    })
                        .then(() => {
                            setSelectPupils(selectedPupilsInitialState);
                            callSnackbar(`pupil${selectPupils?.ids.length > 1 ? 's' : ''} deleted!`, 'success');
                        })
                        .catch(({ ...err }) => {
                            setSelectPupils((pre) => ({ ...pre, open: false }));
                            callSnackbar(err, 'error');
                        });
                }}>
                <Paragraph
                    text={`Are you sure you wish to remove these ${
                        selectPupils?.ids.length > 1
                            ? 'pupils'
                            : data?.getClassPupilsForClassPupilsPage?.find((X) => X.id === selectPupils?.ids[0])?.fullname
                    } from ${classData?.name}?`}
                />
            </ConfirmationModal>

            <PupilBookHistoryModal
                open={bookHistoryModal?.open}
                setOpen={setBookHistoryModal}
                name={bookHistoryModal?.name}
                pupilId={bookHistoryModal?.pupilId}
            />

            <EditTags
                tags={[]}
                options={dialogWrapperOption}
                handleClose={() => {
                    setDialogWrapperOption(initialValue);
                }}
                onSuccess={() => {
                    setDialogWrapperOption(initialValue);
                    setSelectPupils(selectedPupilsInitialState);
                }}
                query={getClassPupilsForClassPupilsPage}
                variables={{ id: query?.class_id }}
                pupils={data?.getClassPupilsForClassPupilsPage}
            />

            {changeClassConfirmationModal && (
                <AddPupilToClassModal
                    handleClose={() => setChangeClassConfirmationModal(false)}
                    defaultClassId={query?.class_id as string}
                    schoolId={classData?.school?.id}
                    open={changeClassConfirmationModal}
                    onPupilClassChange={handleChangePupilsClassOrAddInGroup}
                    loading={changePupilClassLoading}
                    isRemovedDefaultClass={true}
                />
            )}

            {showAddClassGroupModal && (
                <AddPupilToClassGroup
                    handleClose={() => setShowAddClassGroupModal(false)}
                    classId={query?.class_id as string}
                    pupilId={null}
                    schoolId={classData?.school?.id}
                    onPupilAddToGroup={handleChangePupilsClassOrAddInGroup}
                    loading={changePupilClassLoading}
                />
            )}
        </>
    );
};

export default Pupils;
