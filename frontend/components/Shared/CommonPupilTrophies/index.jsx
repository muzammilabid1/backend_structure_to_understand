import { useLazyQuery, useMutation } from '@apollo/client';
import { makeStyles } from '@mui/styles';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deletePupilTrophy } from '../../../graphQl/mutations';
import { getPupilForAdminPupilView } from '../../../graphQl/queries';
import { showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../Button/CommonIconButton';
import CommonDraggableTable from './../CommonDraggableTable';
import CommonListWithIcon from './../CommonListWithIcon';
import DialogWrapper from './../DialogWrapper';
import AwardTrophy from './../Modals/AwardTrophy';
import Heading2 from './../Typography/Heading2';
import Paragraph from './../Typography/Paragraph';

// Queries

const generatePupilCertificateForCommonPupilTrophies = gql`
    query generatePupilCertificate($pupilId: String!, $schoolClassId: String, $trophyId: String!) {
        generatePupilCertificate(pupilId: $pupilId, schoolClassId: $schoolClassId, trophyId: $trophyId)
    }
`;

const useStyles = makeStyles({
    mar: {
        margin: '0px !important'
    }
});

const CommonPupilTrophies = ({ pupilTrophies, child_id, class_id }) => {
    const classes = useStyles();
    const [openAwardTrophy, setOpenAwardTrophy] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedTrophy, setSelectedTrophy] = useState({});
    const [isTrophyRemoveConfirmed, setIsTrophyRemoveConfirmed] = useState(false);
    const { callSnackbar } = useContext(ThemeContext);

    const [deletePupilTrophyMutation, { loading, error: error }] = useMutation(deletePupilTrophy, {
        refetchQueries: [{ query: getPupilForAdminPupilView, variables: { id: child_id } }],
        awaitRefetchQueries: true
    });

    const [pupilCertificateQuery, { error: pupilCertificateError, data: pupilCertificate }] = useLazyQuery(
        generatePupilCertificateForCommonPupilTrophies
    );

    useEffect(() => {
        error?.messages && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        pupilCertificateError?.messages && callSnackbar(pupilCertificateError, 'error');
    }, [pupilCertificateError]);

    useEffect(() => {
        if (pupilCertificate?.generatePupilCertificate) {
            window.location.href = pupilCertificate?.generatePupilCertificate;
        }
    }, [pupilCertificate]);

    const list = [
        {
            text: 'Add a trophy',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setOpenAwardTrophy(true)
        }
    ];

    const removeTrophy = () => {
        deletePupilTrophyMutation({ variables: { id: selectedTrophy?.id } })
            .then(() => {
                callSnackbar('Pupil Trophy removed successfully!', 'success');
                setSelectedTrophy({});
                setOpen(false);
                setIsTrophyRemoveConfirmed(false);
            })
            .catch(({ ...err }) => {
                callSnackbar(err, 'error');
                setSelectedTrophy({});
                setOpen(false);
                setIsTrophyRemoveConfirmed(false);
            });
    };

    const removeTrophyConfirmation = (pupilTrophy) => {
        setSelectedTrophy(pupilTrophy);
        setOpen(true);
    };

    useEffect(() => {
        isTrophyRemoveConfirmed && removeTrophy();
    }, [isTrophyRemoveConfirmed]);

    const head = [
        {
            accessor: 'col1',
            Header: 'Trophy'
        },
        {
            accessor: 'col2',
            Header: 'Date Awarded',
            Cell: ({ value }) => (value ? showDate({ date: value, year: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col2, b.original?.col2)
        },
        { accessor: 'col3', Header: 'Awarded By' },
        { accessor: 'col4', Header: '' }
    ];

    const row = (pupilTrophies || []).map((pupilTrophy) => {
        return {
            id: pupilTrophy.id,
            col1: pupilTrophy?.trophy?.title,
            col2: pupilTrophy?.logCreatedAt,
            col3: pupilTrophy?.logCreatedBy ? `${pupilTrophy?.logCreatedBy?.firstname} ${pupilTrophy?.logCreatedBy?.lastname}` : '-',
            col4: (
                <>
                    <CommonIconButton
                        toolTipTitle="Download"
                        onClick={() => {
                            pupilCertificateQuery({
                                variables: {
                                    trophyId: pupilTrophy?.trophy?.id,
                                    schoolClassId: class_id,
                                    pupilId: child_id
                                }
                            });
                        }}
                        icon="download"
                    />
                    <CommonIconButton toolTipTitle="Delete" onClick={() => removeTrophyConfirmation(pupilTrophy)} icon="delete" />
                </>
            )
        };
    });

    return (
        <div className="parents_carers_table_container mt16">
            <div className={`header ${classes.alignment}`}>
                <Heading2 customClass={classes.mar} text="Pupil Trophies" />
                <CommonListWithIcon list={list} />
            </div>

            {/* <CommonTable head={head}>
                {(pupilTrophies || []).map((pupilTrophy, index) => {
                    return (
                        <TableRow key={index}>
                            <TableCell>
                                <Paragraph customClass="truncate" text={pupilTrophy?.trophy?.title} />
                            </TableCell>

                            <TableCell>
                                <Paragraph customClass="truncate" text={showDate({date:pupilTrophy?.logCreatedAt ,year: true})} />
                            </TableCell>
                            <TableCell>
                                <Paragraph
                                    customClass="truncate"
                                    text={
                                        pupilTrophy?.logCreatedBy
                                            ? `${pupilTrophy?.logCreatedBy?.firstname} ${pupilTrophy?.logCreatedBy?.lastname}`
                                            : '-'
                                    }
                                />
                            </TableCell>
                            <TableCell align="left">
                                <CommonIconButton
                                    toolTipTitle="Download"
                                    onClick={() => {
                                        pupilCertificateQuery({
                                            variables: {
                                                trophyId: pupilTrophy?.trophy?.id,
                                                schoolClassId: class_id,
                                                pupilId: child_id
                                            }
                                        });
                                    }}
                                    icon="download"
                                />
                                <CommonIconButton
                                    toolTipTitle="Delete"
                                    onClick={() => removeTrophyConfirmation(pupilTrophy)}
                                    icon="delete"
                                />
                            </TableCell>
                        </TableRow>
                    );
                })}
            </CommonTable> */}

            <CommonDraggableTable rows={row} columns={head} />
            {openAwardTrophy && <AwardTrophy open={openAwardTrophy} setOpen={setOpenAwardTrophy} child_id={child_id} isAdminView />}
            {open && (
                <DialogWrapper
                    open={open}
                    setOpen={() => setOpen(!open)}
                    cancelBtn
                    dialogFooter
                    primaryBtnHandler={() => setIsTrophyRemoveConfirmed(true)}
                    primaryBtnloading={loading}
                    primaryBtnText="Remove trophy"
                    heading="Remove this trophy?">
                    <Paragraph customClass="pt2 pb5">Are you sure you want to remove this pupil trophy?</Paragraph>
                </DialogWrapper>
            )}
        </div>
    );
};

CommonPupilTrophies.propTypes = {
    pupilTrophies: PropTypes.array.isRequired,
    child_id: PropTypes.number.isRequired,
    class_id: PropTypes.number.isRequired
};

export default CommonPupilTrophies;
