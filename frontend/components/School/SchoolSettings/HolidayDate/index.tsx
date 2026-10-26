import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, TableCell, TableRow } from '@mui/material';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';

import { useDelegatedClaims } from '../../../../context/DelegatedClaimsContext';
import { deleteSchoolHoliday } from '../../../../graphQl/mutations';
import { getAllSchoolHolidaysOfSchool } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { handleErrorSnackbar, showDate, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchool } from '../../../../types/entities/ILwpSchool';
import { ILwpSchoolHoliday } from '../../../../types/entities/ILwpSchoolHoliday';
import CommonIconButton from '../../../Shared/Button/CommonIconButton';
import CommonListWithIcon from '../../../Shared/CommonListWithIcon';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonStatus from '../../../Shared/CommonStatus';
import CommonTable from '../../../Shared/CommonTable';
import AddHolidayModal from '../../../Shared/Modals/AddHoliday';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import Heading1 from '../../../Shared/Typography/Heading1';
import Paragraph from '../../../Shared/Typography/Paragraph';
import SchoolSettingsWrapper from '../SchoolSettingsWrapper';

interface HolidayState {
    holiday: ILwpSchoolHoliday | null;
    isOpenCreateOrEditModal: boolean;
    isHolidayDeleteModal: boolean;
}

const initialHolidayState: HolidayState = {
    holiday: null,
    isOpenCreateOrEditModal: false,
    isHolidayDeleteModal: false
};

const getSchool = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            curentPeriod {
                index
            }
        }
    }
`;

const HolidayDate = () => {
    const { callSnackbar } = useContext(ThemeContext);

    const router = useRouter();
    const schoolId = router.query.school_id;
    const { setClaims } = useDelegatedClaims();
    const [isAlertVisible, setIsAlertVisible] = useState(true);

    const [holidayState, setHolidayState] = useState<HolidayState>(initialHolidayState);

    const { loading, error, data } = useQuery(getAllSchoolHolidaysOfSchool, {
        variables: { schoolId: schoolId }
    });

    const {
        loading: schoolLoading,
        error: schoolError,
        data: schoolData
    } = useQuery(getSchool, {
        variables: { id: schoolId }
    });

    const [deleteHolidayMutation, { loading: deleteHolidayLoading }] = useMutation(deleteSchoolHoliday, {
        refetchQueries: [{ query: getAllSchoolHolidaysOfSchool, variables: { schoolId: schoolId } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        setClaims({ schoolId: schoolId as string });
    }, [schoolId]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, schoolError);
    }, [error, schoolError]);

    const schoolHolidays: ILwpSchoolHoliday[] = data?.allSchoolHolidaysOfSchool || [];
    const schoolDetails: ILwpSchool = schoolData?.getSchool;

    const handleDeleteHoliday = async () => {
        try {
            await deleteHolidayMutation({ variables: { id: holidayState.holiday.id } });
            callSnackbar('Holiday removed', 'success');
            setHolidayState(initialHolidayState);
        } catch (err) {
            callSnackbar(err, 'error');
        }
    };

    const addHoliday = [
        {
            text: 'Add a holiday',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setHolidayState({ ...initialHolidayState, isOpenCreateOrEditModal: true })
        }
    ];

    return (
        <SchoolSettingsWrapper>
            <div className="holiday-date-page">
                <div className="holiday-date-header">
                    <Heading1 text="Holiday dates" />
                    <CommonListWithIcon list={addHoliday} />
                </div>

                {isAlertVisible && (
                    <Alert onClose={() => setIsAlertVisible(false)} severity="info" className="holiday-alert">
                        <Paragraph>
                            Reading weeks that overlap with school holidays will have a target of zero by default. The timing of
                            notifications to parents will be adjusted during holidays
                        </Paragraph>
                    </Alert>
                )}

                {loading || schoolLoading ? (
                    <CommonLoading />
                ) : schoolHolidays?.length > 0 ? (
                    <CommonTable bold head={['Holiday name', 'Dates', '']}>
                        {schoolHolidays.map((holiday: ILwpSchoolHoliday) => {
                            return (
                                <TableRow key={holiday?.id}>
                                    <TableCell>
                                        <Paragraph>{holiday?.holidayName}</Paragraph>
                                    </TableCell>
                                    <TableCell>
                                        <Paragraph>
                                            {showDate({ date: holiday?.startDate, justDate: true })} to{' '}
                                            {showDate({ date: holiday?.endDate, justDate: true })}
                                        </Paragraph>
                                    </TableCell>
                                    <TableCell align="right">
                                        <CommonIconButton
                                            onClick={() =>
                                                setHolidayState({ holiday, isOpenCreateOrEditModal: true, isHolidayDeleteModal: false })
                                            }
                                            icon="create"
                                            toolTipTitle="Update"
                                        />
                                        <CommonIconButton
                                            onClick={() =>
                                                setHolidayState({ holiday, isOpenCreateOrEditModal: false, isHolidayDeleteModal: true })
                                            }
                                            icon="delete"
                                            toolTipTitle="Delete"
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </CommonTable>
                ) : (
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        heading={'No holidays found'}
                        className="mt20"
                    />
                )}
            </div>

            {holidayState.isOpenCreateOrEditModal && (
                <AddHolidayModal
                    open={holidayState.isOpenCreateOrEditModal}
                    setOpen={() => setHolidayState(initialHolidayState)}
                    updateValues={holidayState.holiday}
                    isSchool
                    currentPeriod={schoolDetails?.curentPeriod?.index}
                />
            )}

            {holidayState.isHolidayDeleteModal && (
                <ConfirmationModal
                    open={holidayState.isHolidayDeleteModal}
                    onCancel={() => setHolidayState(initialHolidayState)}
                    loading={deleteHolidayLoading}
                    onConfirm={handleDeleteHoliday}
                    primaryBtnDisabled={deleteHolidayLoading}
                />
            )}
        </SchoolSettingsWrapper>
    );
};

export default HolidayDate;
