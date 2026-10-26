import { useQuery } from '@apollo/client';
import { Checkbox, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import {} from '../../../graphQl/mutations';
import { getClassImportedPupils } from '../../../graphQl/queries';
import CommonLoading from '../../Shared/CommonLoading';
import DialogWrapper from './../../Shared/DialogWrapper';
import Heading3 from './../../Shared/Typography/Heading3';
import Paragraph from './../../Shared/Typography/Paragraph';

// Queries

const pupilParents = (pupil) => {
    return pupil?.importedParents?.map((pupilParent) => ({
        pupilParentId: pupilParent?.id,
        ...pupilParent.parent
    }));
};

const SendInvitationToParents = ({ onEmailSend, onClose, selectPupilModal, class_id, subHeading, btnLoading }) => {
    const [pupilData, setPupilData] = useState([]);

    const [selectedPupilParentIds, setSelectedPupilParentIds] = useState([]);
    const isSelected = (pupilParentId) => selectedPupilParentIds?.some((p) => p === pupilParentId);
    const isAnySelected = () => selectedPupilParentIds?.length > 0;
    const isAllSelected = () => pupilData.length > 0 && selectedPupilParentIds?.length === getAllParents(pupilData).length;
    const toggleSelect = (pupilParentId) => {
        isSelected(pupilParentId)
            ? setSelectedPupilParentIds((s) => s?.filter((selectedPupilParentId) => selectedPupilParentId !== pupilParentId))
            : setSelectedPupilParentIds((s) => [...s, pupilParentId]);
    };
    const clearAll = () => setSelectedPupilParentIds([]);
    const getAllParents = (pupilData) => {
        let allParentsArr = [];

        for (const pupil of pupilData) {
            if (pupil?.allParents) {
                for (const parent of pupil.allParents) {
                    if (parent?.pupilParentId) {
                        allParentsArr.push(parent.pupilParentId);
                    }
                }
            }
        }

        return allParentsArr;
    };
    const selectAll = () => {
        setSelectedPupilParentIds(getAllParents(pupilData));
    };
    const toggleAllSelect = () => {
        isAllSelected() ? clearAll() : selectAll();
    };

    const tableHeaders = ['Pupil', 'Parents to invite'];

    const {
        loading: pupilsLoading,
        error: pupilsError,
        data: pupils
    } = useQuery(getClassImportedPupils, {
        variables: { classId: `${class_id}` }
    });

    const onConfirm = () => {
        onEmailSend(selectedPupilParentIds);
    };

    const pupilToPupilView = (pupil) => {
        return {
            pupil,
            allParents: pupilParents(pupil)
        };
    };

    useEffect(() => {
        if (!pupilsLoading && !pupilsError) {
            const pp = pupils['getClassImportedPupils'];

            setPupilData([...pp].map(pupilToPupilView));
        }
    }, [pupils, pupilsLoading]);

    return (
        <DialogWrapper
            className="edit-class-detail-modal send-invitation-to-parents-modal"
            heading={`Confirm parent details for ${subHeading}`}
            open={selectPupilModal}
            setOpen={onClose}
            cancelBtn
            dialogFooter
            primaryBtnText="Confirm"
            cancelBtnText="Go back"
            primaryBtnDisabled={!(selectedPupilParentIds?.length > 0)}
            primaryBtnloading={btnLoading}
            primaryBtnHandler={() => onConfirm()}
            contentWidth="918px">
            <div className="common_table">
                <Paragraph customClass="invited-modal-text">
                    Parents will not be contacted until these details are confirmed. Parents can be added and removed on the pupil profile
                    page.
                </Paragraph>
                <TableContainer component={Paper} className="table-container">
                    <Table className="table-content">
                        <TableHead className="table-head">
                            <TableRow className="table-row">
                                {tableHeaders.map((header) => (
                                    <TableCell key={header} className={`nested-table-cell`}>
                                        <div className="justify-sb">
                                            <Heading3 text={header} />
                                            {header === 'Parents to invite' && (
                                                <Checkbox
                                                    indeterminate={!isAllSelected() && isAnySelected()}
                                                    checked={isAllSelected()}
                                                    onBlur={() => {}}
                                                    onClick={() => toggleAllSelect()}
                                                />
                                            )}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody className="table-body">
                            {(pupilData || []).map((pupil) => (
                                <TableRow key={pupil?.pupil.id} className="table-row extra">
                                    <TableCell component="th" scope="row" className="table-cell extra-width">
                                        <Paragraph text={`${pupil?.pupil?.firstname} ${pupil?.pupil?.lastname}`} />
                                    </TableCell>
                                    <TableCell component="th" scope="row" className="table-cell">
                                        {(pupil?.allParents || []).map((parent) => (
                                            <Grid container justifyContent={'space-between'} className="parent_invite_container">
                                                <Grid>
                                                    <Paragraph
                                                        text={`${parent.firstname} ${parent.lastname}`}
                                                        customClass="parent_invite_heading"
                                                    />
                                                    <p className="parent_invite_heading parent_invite_sub_heading">{parent.email}</p>
                                                    <Paragraph
                                                        text={parent.phoneNumber}
                                                        customClass="parent_invite_heading parent_invite_sub_heading"
                                                    />
                                                </Grid>
                                                <Grid>
                                                    <Checkbox
                                                        checked={isSelected(parent?.pupilParentId)}
                                                        onBlur={() => {}}
                                                        onClick={() => toggleSelect(parent?.pupilParentId)}
                                                    />
                                                </Grid>
                                            </Grid>
                                        ))}
                                        {pupil?.allParents?.length === 0 && (
                                            <div>
                                                <Paragraph text={'-'} />
                                                <Checkbox disabled={true} />
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        {/* )} */}
                    </Table>
                </TableContainer>
            </div>

            {pupilsLoading && <CommonLoading />}
        </DialogWrapper>
    );
};

SendInvitationToParents.propTypes = {
    onEmailSend: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    selectPupilModal: PropTypes.bool.isRequired,
    btnLoading: PropTypes.bool.isRequired,
    class_id: PropTypes.number.isRequired,
    subHeading: PropTypes.string.isRequired
};

export default SendInvitationToParents;
