/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */

import { useMutation, useQuery } from '@apollo/client';
import { Checkbox, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { generateCertificates } from '../../../graphQl/mutations';
import {
    getClassPupilsForClassPupilsPage,
    getClassPupilsForTeacher,
    getRecentStaticTrophyForSelectPupilTable,
    getSchoolClassesForDashboard,
    getSchoolClassWithImportedStudents
} from '../../../graphQl/queries';
import { ADMIN, MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { showDate, ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../../Shared/CommonLoading';
import CommonSelectField from './../../Shared/CommonSelectField';
import DialogWrapper from './../../Shared/DialogWrapper';
import Heading3 from './../../Shared/Typography/Heading3';
import Paragraph from './../../Shared/Typography/Paragraph';

interface Pupil {
    id: string;
    firstname: string;
    lastname: string;
    starsEarned: { goldStars: number; silverStars: number };
    trophies?: Trophy[];
    lastCertificateSent?: string;
    lastCertificateDownloaded?: string;
}

interface Trophy {
    id: string;
    logCreatedAt?: string;
    lastCertificateEmailSent?: string;
    lastCertificateDownloaded?: string;
    trophy: { id: string };
}

interface SelectPupilTableProps {
    onClose: () => void;
    selectPupilModal: boolean;
    class_id: string | string[];
    schoolId?: string;
    subHeading: string;
    mainTeacherId?: string;
    setCertificateId?: any;
    certificateId?: string;
    certificateTitle?: string;
    activeTrophies?: { key: string; value: string }[];
}

const pupilToPupilView = (pupil: Pupil, certificateId: string | null) => {
    let dateEarned = '-';
    let lastTrophyCertificateEmailSent = '-';
    let lastTrophyCertificateDownloaded = '-';

    if (certificateId) {
        const recentTrophy: Trophy = (pupil?.trophies || [])?.find((pt) => pt?.trophy?.id === certificateId);

        if (recentTrophy) {
            dateEarned = showDate({ date: recentTrophy?.logCreatedAt, year: true });

            if (recentTrophy?.lastCertificateEmailSent)
                lastTrophyCertificateEmailSent = showDate({ date: recentTrophy?.lastCertificateEmailSent, year: true });

            if (recentTrophy?.lastCertificateDownloaded)
                lastTrophyCertificateDownloaded = showDate({ date: recentTrophy?.lastCertificateDownloaded, year: true });
        }
    }

    return {
        id: pupil.id,
        firstname: pupil.firstname,
        lastname: pupil.lastname,
        starsEarned: pupil?.starsEarned?.goldStars,
        dateEarned,
        lastTrophyCertificateEmailSent,
        lastTrophyCertificateDownloaded,
        lastCertificateSent: pupil.lastCertificateSent ? showDate({ date: pupil.lastCertificateSent, year: true }) : '-',
        lastCertificateDownloaded: pupil.lastCertificateDownloaded ? showDate({ date: pupil.lastCertificateDownloaded, year: true }) : '-',
        pupil
    };
};

const SelectPupilTable = ({
    onClose,
    selectPupilModal,
    class_id,
    schoolId,
    subHeading,
    mainTeacherId,
    setCertificateId,
    certificateId,
    certificateTitle,
    activeTrophies
}: SelectPupilTableProps) => {
    const { callSnackbar, token } = useContext(ThemeContext);
    const [pupilData, setPupilData] = useState([]);
    const [certificate, setCertificate] = useState(null);

    const [selectedPupils, setSelectedPupils] = useState([]);
    const isSelected = (p) => selectedPupils.includes(p);
    const isAnySelected = () => selectedPupils.length > 0;
    const isAllSelected = () => pupilData.length > 0 && selectedPupils.length === pupilData.length;
    const toggleSelect = (p) =>
        isSelected(p) ? setSelectedPupils((s) => s.filter((pu) => pu !== p)) : setSelectedPupils((s) => [...s, p]);
    const clearAll = () => setSelectedPupils([]);
    const selectAll = () => setSelectedPupils(pupilData || []);
    const toggleAllSelect = () => {
        if (isAllSelected()) {
            clearAll();
        } else {
            selectAll();
        }
    };

    const tableHeaders = ['Name', 'Stars earned', 'Downloaded'];

    if (certificateId !== '0') {
        tableHeaders[1] = 'Date earned';
    }

    const {
        loading: pupilsLoading,
        error: pupilsError,
        data: pupils
    } = useQuery(getClassPupilsForTeacher, {
        variables: { classId: class_id }
    });

    const { error: recentTrophyError, data: recentTrophy } = useQuery(getRecentStaticTrophyForSelectPupilTable);

    useEffect(() => {
        if (recentTrophyError?.message) {
            callSnackbar(recentTrophyError, 'error');
        }
    }, [recentTrophyError]);

    const schoolClass = [
        { query: getClassPupilsForTeacher, variables: { classId: class_id } },
        { query: getSchoolClassWithImportedStudents, variables: { id: class_id } },
        { query: getSchoolClassesForDashboard, variables: { schoolId } },
        { query: getClassPupilsForClassPupilsPage, variables: { id: class_id } }
    ];

    const withOutSchoolClass = [
        { query: getClassPupilsForTeacher, variables: { classId: class_id } },
        { query: getSchoolClassWithImportedStudents, variables: { id: class_id } },
        { query: getClassPupilsForClassPupilsPage, variables: { id: class_id } }
    ];

    const [generateCertificatesMutation, { loading: generateCertificatesLoading }] = useMutation(generateCertificates, {
        refetchQueries: token?.isSchoolLeader || token?.userType === ADMIN ? schoolClass : withOutSchoolClass,
        awaitRefetchQueries: true
    });

    const onDownload = () => {
        if (selectedPupils.length > 0) {
            generateCertificatesMutation({
                variables: {
                    input: {
                        teacherId: token?.userType === ADMIN ? mainTeacherId : token.sub,
                        pupilIds: selectedPupils.map((p) => p.pupil.id),
                        trophyId: certificateId
                    }
                }
            })
                .then((d) => {
                    const url = d && d.data && d.data['generateCertificates'];

                    if (url) {
                        clearAll();
                        window.location.href = url;
                        onClose();
                    }
                })
                .catch(({ ...err }) => {
                    callSnackbar(err, 'error');
                });
        }
    };

    useEffect(() => {
        if (!pupilsLoading && !pupilsError) {
            const pp = pupils['getClassPupils'];

            if (certificateId && certificateId !== '0') {
                setPupilData(
                    [...pp]
                        .filter((pp) => pp.trophies?.some((pt) => pt?.trophy?.id === certificateId))
                        .map((pp) => pupilToPupilView(pp, certificateId))
                );
            } else {
                setPupilData([...pp].map((pp) => pupilToPupilView(pp, certificateId)));
            }
        }
    }, [pupils, pupilsLoading, certificateId]);

    useEffect(() => {
        if (activeTrophies && activeTrophies?.length > 0) {
            setCertificate(activeTrophies);
            setCertificateId(activeTrophies?.[0]?.key);
        } else {
            if (certificateTitle) {
                setCertificate([{ key: certificateId, value: certificateTitle }]);
            } else if (recentTrophy) {
                setCertificate([{ key: recentTrophy?.getRecentStaticTrophy?.id, value: recentTrophy?.getRecentStaticTrophy?.title }]);
            } else {
                setCertificate(null);
            }
        }
    }, [recentTrophy, certificateTitle, activeTrophies]);

    useEffect(() => {
        if (generateCertificatesLoading) {
            callSnackbar('Downloading...', 'success');
        }
    }, [generateCertificatesLoading]);

    return (
        <DialogWrapper
            className="edit-class-detail-modal"
            heading="Select pupils"
            open={selectPupilModal}
            setOpen={onClose}
            cancelBtn
            dialogFooter
            primaryBtnText="Download"
            primaryBtnDisabled={selectedPupils.length === 0}
            primaryBtnHandler={() => onDownload()}
            contentWidth={'983px'}>
            <Paragraph text={subHeading} />
            <br />
            <Grid container>
                <CommonSelectField
                    label={'Certificate type'}
                    options={(certificate ? [...certificate] : [null])
                        .concat([{ key: '0', value: 'Default Certificate' }])
                        .filter((option) => option)}
                    value={certificateId}
                    onChange={(e) => {
                        setCertificateId(e.target.value);
                    }}
                    lg={6}
                    md={6}
                />
            </Grid>

            {!pupilsLoading ? (
                <div className="common_table">
                    <TableContainer component={Paper} className="table-container">
                        <Table className="table-content">
                            <TableHead className="table-head">
                                <TableRow className="table-row">
                                    {tableHeaders.map((header) => (
                                        <TableCell key={header} className={`nested-table-cell`}>
                                            <Heading3 text={header} />
                                        </TableCell>
                                    ))}
                                    <TableCell className={`nested-table-cell`} style={{ textAlign: 'center' }}>
                                        <Checkbox
                                            indeterminate={!isAllSelected() && isAnySelected()}
                                            checked={isAllSelected()}
                                            color="primary"
                                            onBlur={() => {}}
                                            onClick={() => toggleAllSelect()}
                                        />
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody className="table-body">
                                {(pupilData || []).map((pupil) => (
                                    <TableRow key={pupil.id} className="table-row extra">
                                        <TableCell component="th" scope="row" className="table-cell first-extra-width">
                                            <Paragraph text={`${pupil.firstname} ${pupil.lastname}`} />
                                        </TableCell>
                                        <TableCell component="th" scope="row" className="table-cell extra-width">
                                            {/* <Paragraph text={certificateId !== 0 ? pupil?.dateEarned : pupil?.starsEarned} /> */}

                                            <span className="certificate-container">
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/gold_outlined_check_star.svg`}
                                                    alt="star"
                                                    width={30}
                                                    height={30}
                                                />
                                                <Paragraph customClass="certi-gold">{pupil?.pupil?.starsEarned?.goldStars}</Paragraph>

                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/check_star.svg`}
                                                    alt="star"
                                                    width={30}
                                                    height={30}
                                                />
                                                <Paragraph customClass="certi-silver">{pupil?.pupil?.starsEarned?.silverStars}</Paragraph>
                                            </span>
                                        </TableCell>

                                        {/* <TableCell component="th" scope="row" className="table-cell extra-width">
                                        <Paragraph
                                            text={certificateId !== 0 ? pupil?.lastTrophyCertificateEmailSent : pupil.lastCertificateSent}
                                        />
                                    </TableCell> */}

                                        <TableCell component="th" scope="row" className="table-cell extra-width">
                                            <Paragraph
                                                text={
                                                    certificateId !== '0'
                                                        ? pupil?.lastTrophyCertificateDownloaded
                                                        : pupil.lastCertificateDownloaded
                                                }
                                            />
                                        </TableCell>

                                        <TableCell
                                            component="th"
                                            scope="row"
                                            className="table-cell extra-width"
                                            style={{ textAlign: 'center' }}>
                                            <Checkbox checked={isSelected(pupil)} onBlur={() => {}} onClick={() => toggleSelect(pupil)} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </div>
            ) : (
                <div className="modal_loader">
                    <CommonLoading />
                </div>
            )}
        </DialogWrapper>
    );
};

export default SelectPupilTable;
