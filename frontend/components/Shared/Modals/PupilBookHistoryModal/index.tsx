/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress, Grid } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import LWPButton from '../../Button/LWPButton';
import CommonStatus from '../../CommonStatus';
import DialogWrapper from '../../DialogWrapper';
import KeyToIcons from '../../KeyToIcons';
import Heading2 from '../../Typography/Heading2';
import BookHistoryForm from './BookHistoryForm';
import BookHistoryList from './BookHistoryList';

const getPupilBookHistoryForTeacher = gql`
    query getPupilBookHistoryForTeacher($input: PupilBookHistoryInput!) {
        getPupilBookHistoryForTeacher(input: $input) {
            bookName
            readingType
            pageNumber
            isBookFinished
            isReadAtHome
            isReadAtSchool
            isReadingWithGroup
        }
    }
`;

const keyToIcons = [
    {
        icon: 'readingHomeIcon.svg',
        name: 'Read at home'
    },
    {
        icon: 'readingSchoolIcon.svg',
        name: 'Read at school with a teacher'
    },
    {
        icon: 'team_teacher.svg',
        name: 'Read at school in a group'
    }
];

type PupilBookHistoryModalProps = {
    open: boolean;
    setOpen: any;
    name: string;
    pupilId: string;
    isSchoolBooksOnly?: boolean;
    isCurrentYearOnly?: boolean;
};

const PupilBookHistoryModal = ({
    open,
    setOpen,
    name,
    pupilId,
    isSchoolBooksOnly = false,
    isCurrentYearOnly = true
}: PupilBookHistoryModalProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [formikValues, setFormikValues] = useState(null);

    const [bookHistoryData, setBookHistoryData] = useState([]);

    const [pupilBookHistoryMutation, { loading, error, data }] = useLazyQuery(getPupilBookHistoryForTeacher, {});

    useEffect(() => {
        if (pupilId) {
            pupilBookHistoryMutation({
                variables: {
                    input: { pupilId, isSchoolBooksOnly, isCurrentYearOnly }
                }
            });
        }
    }, [pupilId]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    useEffect(() => {
        if (data?.getPupilBookHistoryForTeacher) {
            setBookHistoryData(data?.getPupilBookHistoryForTeacher);
        }
    }, [data]);

    return (
        <DialogWrapper contentWidth={'873px'} open={open} setOpen={setOpen} className="pupil_book_history_modal">
            <Grid container alignItems={'flex-end'} justifyContent={'space-between'} marginBottom={'24px'}>
                <Heading2 text={`${name}'s book history`} />
                <KeyToIcons list={keyToIcons} text="Key" noicon />
            </Grid>
            <BookHistoryForm
                pupilBookHistoryMutation={pupilBookHistoryMutation}
                pupilId={pupilId}
                isSchoolBooksOnly={isSchoolBooksOnly}
                isCurrentYearOnly={isCurrentYearOnly}
                setFormikValues={setFormikValues}
            />
            {loading ? (
                <Grid height={'350px'} display={'flex'} alignItems={'center'} justifyContent={'center'} marginBottom={'24px'}>
                    <CircularProgress size={150} />
                </Grid>
            ) : bookHistoryData?.length > 0 ? (
                <Grid height={'350px'} overflow={'auto'} className="custom-thin-scrollbar" paddingRight={'10px'} marginBottom={'24px'}>
                    <BookHistoryList bookHistoryData={bookHistoryData} pupilId={pupilId} formikValues={formikValues} />
                </Grid>
            ) : (
                <Grid height={'350px'} display={'flex'} alignItems={'center'} justifyContent={'center'} marginBottom={'24px'}>
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/lwp-mathscot-thinking.png`}
                        imageAlt={'Mathscot Thinking'}
                        heading={'Nothing to show here'}
                    />
                </Grid>
            )}
            <Grid container justifyContent={'center'}>
                <LWPButton
                    color="inherit"
                    btnText="Close"
                    onClick={(event) => {
                        event.stopPropagation();
                        setOpen(null);
                    }}
                />
            </Grid>
        </DialogWrapper>
    );
};

export default PupilBookHistoryModal;
