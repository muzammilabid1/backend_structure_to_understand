import { useMutation, useQuery } from '@apollo/client';
import { Formik } from 'formik';
import moment from 'moment';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useRef, useState } from 'react';

import { addSchoolHoliday, updateSchoolHoliday } from '../../../graphQl/mutations';
import {
    allSchoolHolidaysOfSchoolForAdmin,
    getAllSchoolHolidaysOfSchool,
    getAllStaticPeriods,
    getHolidaysForAdmin
} from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { addHolidayValidation, updateHolidayValidation } from '../../../shared/validations';
import LWPButton from '../Button/LWPButton';
import CommonSelectField from '../CommonSelectField';
import DialogWrapper from '../DialogWrapper';
import DateField from '../InputField/DateField';
import InputField from '../InputField/InputField';
import Paragraph from '../Typography/Paragraph';
import ConfirmationModal from './ConfirmationModal';

const AddHolidayModal = ({ open, setOpen, updateValues, isAdmin = false, isSchool = false, isAdminSchool = false, currentPeriod }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const ref = useRef();
    const [holidayConfirmModal, setHolidayConfirmModal] = useState(false);
    const [isHolidayWithinTwoWeeksModal, setIsHolidayWithinTwoWeeksModal] = useState(false);

    const { data: allStaticPeriods } = useQuery(getAllStaticPeriods);

    const [addHolidayMutation, { loading }] = useMutation(addSchoolHoliday, {
        refetchQueries: [
            {
                query: isAdminSchool ? allSchoolHolidaysOfSchoolForAdmin : isSchool ? getAllSchoolHolidaysOfSchool : getHolidaysForAdmin,
                variables: isSchool || isAdminSchool ? { schoolId: queryParams?.school_id } : null,
                notifyOnNetworkStatusChange: true
            }
        ],
        awaitRefetchQueries: true
    });
    const [updateHolidayMutation, { loading: updateLoading }] = useMutation(updateSchoolHoliday, {
        refetchQueries: [
            {
                query: isAdminSchool ? allSchoolHolidaysOfSchoolForAdmin : isSchool ? getAllSchoolHolidaysOfSchool : getHolidaysForAdmin,
                variables: (isSchool || isAdminSchool) && { schoolId: queryParams?.school_id }
            }
        ],
        awaitRefetchQueries: true
    });

    const handleHoliday = async () => {
        try {
            if (updateValues) {
                await updateHolidayMutation({
                    variables: {
                        input: {
                            id: updateValues.id,
                            holidayName: ref.current?.holidayName?.trim() ? ref.current?.holidayName?.trim() : null,
                            startDate: ref.current?.startDate,
                            endDate: ref.current?.endDate
                        }
                    }
                });
                callSnackbar('Changes saved', 'success');
                setOpen();
            } else {
                await addHolidayMutation({
                    variables: {
                        input: {
                            schoolId: isSchool || isAdminSchool ? queryParams?.school_id : null,
                            holidayName: ref.current?.holidayName?.trim() ? ref.current?.holidayName?.trim() : null,
                            periodIndex: queryParams?.school_id ? currentPeriod.toString() : ref.current?.period.toString(),
                            startDate: ref.current?.startDate,
                            endDate: ref.current?.endDate
                        }
                    }
                });
                callSnackbar('Holiday created', 'success');
                setOpen();
            }
        } catch (error) {
            const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

            if (statusCode) {
                callSnackbar(error, 'error');
            } else {
                window.newrelic?.noticeError(error, { caught: true, handled: false });
                callSnackbar(unexpectedError, 'error');
            }
        }
    };

    return (
        <Formik
            initialValues={{
                holidayName: updateValues ? updateValues?.holidayName : '',
                startDate: updateValues ? new Date(updateValues?.startDate) : new Date(),
                endDate: updateValues ? new Date(updateValues?.endDate) : new Date(),
                isSchoolHoliday: queryParams?.school_id ? false : true
            }}
            enableReinitialize
            validationSchema={updateValues ? updateHolidayValidation : addHolidayValidation}
            onSubmit={async (values) => {
                const currDate = moment();
                const isHolidayWithinTwoWeeks = moment(values?.startDate ? values?.startDate : updateValues?.startDate).isSameOrBefore(
                    currDate.add(2, 'weeks')
                );

                ref.current = values;

                if (isHolidayWithinTwoWeeks && isSchool) {
                    setIsHolidayWithinTwoWeeksModal(isHolidayWithinTwoWeeks);
                } else {
                    handleHoliday();
                }
            }}>
            {({ values, errors, touched, handleChange, handleSubmit, handleBlur }) => {
                return (
                    <DialogWrapper
                        className="add_holiday_modal"
                        open={open}
                        setOpen={setOpen}
                        onClose={() => setOpen()}
                        heading={updateValues ? 'Update holiday' : 'Add holiday'}>
                        <Paragraph
                            text={
                                isAdmin
                                    ? `This is a default holiday that will be set for all schools when it is released`
                                    : isAdminSchool
                                      ? `This is the holiday set for the whole school`
                                      : ''
                            }
                        />
                        <br />
                        <InputField
                            md={12}
                            lg={12}
                            label="Name of the holiday"
                            value={values.holidayName}
                            name={'holidayName'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.holidayName}
                            touched={touched.holidayName}
                        />
                        <div className="holiday-date-container">
                            <DateField
                                name="startDate"
                                label="Start date"
                                md={12}
                                lg={12}
                                value={+values.startDate}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.startDate}
                                touched={touched.startDate}
                                minDate={new Date()}
                            />
                            <DateField
                                name="endDate"
                                label="End date"
                                value={+values.endDate}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.endDate}
                                touched={touched.endDate}
                                minDate={values.startDate}
                                md={12}
                                lg={12}
                            />
                        </div>
                        {(errors?.startDate || errors?.endDate) && (
                            <div className="holiday-date-error">
                                <Paragraph>{errors?.startDate || errors?.endDate}</Paragraph>
                            </div>
                        )}
                        <br />
                        {!updateValues && !queryParams?.school_id && (
                            <>
                                <CommonSelectField
                                    md={12}
                                    lg={12}
                                    displayEmpty
                                    shrink={values.period}
                                    value={values.period}
                                    name="period"
                                    label="Period"
                                    options={(allStaticPeriods?.allStaticPeriods || []).map((item) => ({
                                        value: item.shortName,
                                        key: item.index.toString()
                                    }))}
                                    onChange={(e) =>
                                        handleChange({
                                            target: { name: 'period', value: e.target.value }
                                        })
                                    }
                                    error={errors.period}
                                />
                                {errors?.period && !queryParams?.school_id && (
                                    <p style={{ fontSize: '12px', color: 'red' }}>{errors?.period}</p>
                                )}
                                <br />
                            </>
                        )}
                        <div className="btn_group">
                            <LWPButton customClass="cancel_btn" variant="text" onClick={() => setOpen()} btnText="Cancel" color="inherit" />
                            <LWPButton
                                loading={loading || updateLoading}
                                onClick={() => {
                                    if (updateValues?.released && isAdmin) {
                                        setHolidayConfirmModal(!holidayConfirmModal);
                                    } else {
                                        handleSubmit();
                                    }
                                }}
                                btnText={updateValues ? 'Update' : 'Add'}
                            />
                        </div>
                        {holidayConfirmModal && isAdmin && updateValues?.released && (
                            <ConfirmationModal
                                open={holidayConfirmModal}
                                onCancel={() => setHolidayConfirmModal(false)}
                                loading={updateLoading}
                                heading={'Are you sure?'}
                                btnText={'Confirm'}
                                onConfirm={handleSubmit}>
                                This will only affect new schools
                            </ConfirmationModal>
                        )}
                        {isHolidayWithinTwoWeeksModal && (
                            <ConfirmationModal
                                open={isHolidayWithinTwoWeeksModal}
                                onCancel={() => setIsHolidayWithinTwoWeeksModal(false)}
                                loading={updateLoading || loading}
                                heading={'Are you sure?'}
                                btnText={'Confirm'}
                                onConfirm={handleHoliday}>
                                Reading log targets for the next two weeks may already have been set and will not be affected by this change
                                - please check the class schedules for these.
                            </ConfirmationModal>
                        )}
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

AddHolidayModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    updateValues: PropTypes.object,
    isSchool: PropTypes.bool,
    isAdminSchool: PropTypes.bool,
    isAdmin: PropTypes.bool,
    currentPeriod: PropTypes.number
};

export default AddHolidayModal;
