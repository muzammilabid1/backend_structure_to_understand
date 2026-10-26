import { gql, useMutation, useQuery } from '@apollo/client';
import { TableCell, TableRow } from '@mui/material';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { removePupilsFromClass } from '../../../graphQl/mutations';
import { adminPath, TEACHER } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../Button/CommonIconButton';
import CommonDraggableTable from '../CommonDraggableTable';
import CommonListWithIcon from '../CommonListWithIcon';
import CommonLoading from '../CommonLoading';
import CommonTable from '../CommonTable';
import DialogWrapper from '../DialogWrapper';
import SubjectTags from '../SubjectTags';
import Heading2 from '../Typography/Heading2';
import Paragraph from '../Typography/Paragraph';
import AddPupilToClassGroup from './AddPupilToClassGroup';

const getPupilForClassGroups = gql`
    query getPupilbyId($id: String!) {
        pupil(id: $id) {
            id
            school {
                id
            }
            fullname
            currentClass {
                id
            }
            classGroups {
                id
                name
                IsReadingLogsEnabled
                subjects {
                    name
                }
                mainTeacher {
                    firstname
                    lastname
                }
            }
        }
    }
`;

const PupilClassGroups = ({ isAdminView }) => {
    const queryParams = useParams();
    const [open, setOpen] = useState(false);
    const [ClassWillRemove, setClassWillRemove] = useState({});
    const { callSnackbar, token } = useContext(ThemeContext);
    const pupilId = queryParams?.pupil_id || queryParams?.child_id;

    const [showAddClassGroupModal, setShowAddClassGroupModal] = useState(false);

    const {
        loading: pupilClassLoading,
        error: pupilClassError,
        data: pupilWithClassGroupData
    } = useQuery(getPupilForClassGroups, {
        variables: { id: pupilId }
    });

    useEffect(() => {
        pupilClassError?.message && callSnackbar(pupilClassError, 'error');
    }, [pupilClassError?.message]);

    const [removePupilFromClassGroupMutation, { loading, error }] = useMutation(removePupilsFromClass, {
        refetchQueries: [{ query: getPupilForClassGroups, variables: { id: pupilId } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error?.message]);

    const removePupilFromClassGroup = () => {
        removePupilFromClassGroupMutation({
            variables: { classId: ClassWillRemove?.id, pupilIds: [pupilId] }
        })
            .then(() => {
                callSnackbar('Pupil has been removed from class group', 'success');
                setClassWillRemove({});
                setOpen(false);
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    const removeClassConfirmation = (schoolClass) => {
        setClassWillRemove(schoolClass);
        setOpen(true);
    };

    const isTeacher = () => token?.userType === TEACHER && !token?.isSchoolLeader;

    let heading = ['Group name', 'Main teacher', 'Group type', ''];

    let head = heading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Group name') {
            // eslint-disable-next-line react/display-name
            rowHead.Cell = (params) => {
                return (
                    <Link passHref href={`${adminPath}/class/${params?.row?.original?.id}`}>
                        <Paragraph customClass="arrow_cursor" text={params?.row?.original?.col1} />
                    </Link>
                );
            };
        }

        return rowHead;
    });

    const row = (pupilWithClassGroupData?.['pupil']?.classGroups || []).map((classGroup) => {
        return {
            id: classGroup?.id,
            col1: classGroup?.name,
            col2: `${classGroup?.mainTeacher?.firstname} ${classGroup?.mainTeacher?.lastname}`,
            col3: <SubjectTags type={classGroup?.subjects} isReadingClass={classGroup?.IsReadingLogsEnabled} />,
            col4: <CommonIconButton onClick={() => removeClassConfirmation(classGroup)} icon="delete" />
        };
    });

    const list = [
        {
            text: 'Add to group',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setShowAddClassGroupModal(true)
        }
    ];

    if (pupilClassLoading) return <CommonLoading />;

    return (
        <div className="pupil-class-groups parents_carers_table_container mt16">
            {isTeacher() ? null : (
                <div className="header">
                    <Heading2 text="Class groups" />
                    <CommonListWithIcon list={list} />
                </div>
            )}

            {isAdminView ? (
                <CommonDraggableTable rows={row} columns={head} />
            ) : (
                <CommonTable head={heading}>
                    {(pupilWithClassGroupData?.['pupil']?.classGroups || []).map((classGroup, index) => {
                        return (
                            <TableRow key={index}>
                                <TableCell width={300}>
                                    <Paragraph isTruncate text={`${classGroup?.name}`} />
                                </TableCell>
                                <TableCell width={300}>
                                    <Paragraph
                                        isTruncate
                                        text={`${classGroup?.mainTeacher?.firstname} ${classGroup?.mainTeacher?.lastname}`}
                                    />
                                </TableCell>
                                <TableCell width={300}>
                                    <SubjectTags type={classGroup?.subjects} isReadingClass={classGroup?.IsReadingLogsEnabled} />
                                </TableCell>
                                <TableCell width={200} align="right">
                                    <CommonIconButton
                                        onClick={() => removeClassConfirmation(classGroup)}
                                        icon="delete"
                                        className="parents-carers-table-icons"
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </CommonTable>
            )}

            {showAddClassGroupModal && (
                <AddPupilToClassGroup
                    handleClose={() => setShowAddClassGroupModal(false)}
                    classId={pupilWithClassGroupData?.pupil?.currentClass?.id}
                    pupilId={pupilId}
                    schoolId={pupilWithClassGroupData?.pupil?.school?.id}
                />
            )}

            {open && (
                <DialogWrapper
                    open={open}
                    setOpen={() => setOpen(!open)}
                    cancelBtn
                    dialogFooter
                    primaryBtnHandler={removePupilFromClassGroup}
                    primaryBtnloading={loading}
                    primaryBtnText="Yes"
                    contentWidth="450px">
                    <Paragraph customClass="pt2 pb5">
                        Are you sure you wish to remove {pupilWithClassGroupData?.['pupil']?.fullname} from {ClassWillRemove.name}?
                    </Paragraph>
                </DialogWrapper>
            )}
        </div>
    );
};

PupilClassGroups.propTypes = {
    isAdminView: PropTypes.bool
};

export default PupilClassGroups;
