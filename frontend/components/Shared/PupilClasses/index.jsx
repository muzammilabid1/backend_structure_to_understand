import { useMutation, useQuery } from '@apollo/client';
import { TableCell, TableRow } from '@mui/material';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { removePupilsFromClass } from '../../../graphQl/mutations';
import { getPupilClasses, getPupilForClassGroups, getSchoolForDashboardWrapper } from '../../../graphQl/queries';
import { adminPath, TEACHER } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../Button/CommonIconButton';
import CommonDraggableTable from '../CommonDraggableTable';
import CommonListWithIcon from '../CommonListWithIcon';
import CommonLoading from '../CommonLoading';
import CommonTable from '../CommonTable';
import DialogWrapper from '../DialogWrapper';
import AddPupilToClassModal from '../Modals/AddPupilToClassModal';
import Heading2 from '../Typography/Heading2';
import Paragraph from '../Typography/Paragraph';

const PupilClasses = ({ isAdminView }) => {
    const queryParams = useParams();
    const [showAddClassModal, setShowAddClassModal] = useState(false);
    const [open, setOpen] = useState(false);
    const [ClassWillRemove, setClassWillRemove] = useState({});
    const [isClassRemoveConfirmed, setIsClassRemoveConfirmed] = useState(false);
    const { callSnackbar, token } = useContext(ThemeContext);
    const pupilId = queryParams?.pupil_id || queryParams?.child_id;

    const {
        loading: pupilClassLoading,
        error: pupilClassError,
        data: pupilClassData
    } = useQuery(getPupilClasses, {
        variables: { id: pupilId }
    });

    useEffect(() => {
        pupilClassError?.message && callSnackbar(pupilClassError, 'error');
    }, [pupilClassError]);

    const [removePupilsFromClassMutation, { loading, error: error }] = useMutation(removePupilsFromClass, {
        refetchQueries: [
            { query: getPupilClasses, variables: { id: pupilId } },
            { query: getPupilForClassGroups, variables: { id: pupilId } },
            {
                query: getSchoolForDashboardWrapper,
                variables: { id: pupilClassData?.['pupil']?.school?.id }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const list = [
        {
            text: pupilClassData?.pupil?.classes?.length > 0 ? 'Change class' : 'Add a class',
            icon: 'add',
            iconRight: true,
            dataTest: 'add-or-change-pupil-class-button',
            bold: true,
            onClick: () => setShowAddClassModal(true)
        }
    ];

    const removeClass = () => {
        removePupilsFromClassMutation({
            variables: { classId: ClassWillRemove?.id, pupilIds: [pupilId] }
        })
            .then(() => {
                callSnackbar('Pupil has been removed from class', 'success');
                setClassWillRemove({});
                setOpen(false);
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    const removeClassConfirmation = (schoolClass) => {
        setClassWillRemove(schoolClass);
        setOpen(true);
    };

    useEffect(() => {
        isClassRemoveConfirmed && removeClass();
    }, [isClassRemoveConfirmed]);

    const isTeacher = () => token?.userType === TEACHER && !token?.isSchoolLeader;

    let heading = ['Class name', 'Year group', 'Period', ''];

    if (isTeacher()) {
        heading = ['Class name', 'Year group', 'Period'];
    }

    let head = heading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Class name') {
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

    const row = (pupilClassData?.['pupil']?.classes || []).map((schoolClass) => {
        return {
            id: schoolClass?.id,
            col1: schoolClass?.name,
            col2: schoolClass?.yearGroup?.year,
            col3: schoolClass?.period?.longName ?? '-',
            col4: isTeacher() ? null : <CommonIconButton onClick={() => removeClassConfirmation(schoolClass)} icon="delete" />
        };
    });

    if (pupilClassLoading) return <CommonLoading />;

    return (
        <div className="pupil-registration-classes parents_carers_table_container mt16">
            {isTeacher() ? null : (
                <div className="header">
                    <Heading2 text="Classes" />
                    <CommonListWithIcon list={list} />
                </div>
            )}

            {isAdminView ? (
                <CommonDraggableTable rows={row} columns={head} />
            ) : (
                <CommonTable head={heading}>
                    {(pupilClassData?.['pupil']?.classes || []).map((schoolClass, index) => {
                        return (
                            <TableRow key={index}>
                                <TableCell width={300}>
                                    <Paragraph isTruncate text={`${schoolClass?.name}`} />
                                </TableCell>
                                <TableCell width={300}>
                                    <abbr title={parent?.email || parent?.phoneNumber}>
                                        <Paragraph isTruncate text={schoolClass?.yearGroup?.year} />
                                    </abbr>
                                </TableCell>
                                <TableCell>
                                    <Paragraph isTruncate text={schoolClass?.period?.shortName ?? '-'} />
                                    {/* <Paragraph text={truncate(schoolClass?.period?.longName, 10) ?? '-'} /> */}
                                </TableCell>
                                <TableCell width={200} align="right">
                                    {schoolClass?.period?.isCurrentPeriod &&
                                    schoolClass?.period?.index === schoolClass?.school?.curentPeriod?.index ? (
                                        <CommonIconButton
                                            onClick={() => removeClassConfirmation(schoolClass)}
                                            icon="delete"
                                            className="parents-carers-table-icons"
                                        />
                                    ) : null}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </CommonTable>
            )}

            {showAddClassModal && (
                <AddPupilToClassModal
                    handleClose={() => setShowAddClassModal(false)}
                    schoolId={pupilClassData?.['pupil']?.school?.id}
                    pupilId={pupilId}
                    defaultClassId={pupilClassData?.['pupil']?.classes[0]?.id}
                    refetchQueries={[{ query: getPupilClasses, variables: { id: pupilId } }]}
                />
            )}

            {open && (
                <DialogWrapper
                    open={open}
                    setOpen={() => setOpen(!open)}
                    cancelBtn
                    dialogFooter
                    primaryBtnHandler={() => setIsClassRemoveConfirmed(true)}
                    primaryBtnloading={loading}
                    primaryBtnText="Yes"
                    contentWidth="450px">
                    <Paragraph customClass="pt2 pb5">
                        Are you sure you wish to remove {pupilClassData?.['pupil']?.fullname} from {ClassWillRemove.name}?
                    </Paragraph>
                </DialogWrapper>
            )}
        </div>
    );
};

PupilClasses.propTypes = {
    isAdminView: PropTypes.bool
};

export default PupilClasses;
