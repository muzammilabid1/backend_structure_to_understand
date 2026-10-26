import { useMutation } from '@apollo/client';
import { Alert, FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Form, Formik } from 'formik';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';

import { updateSchoolClass } from '../../../graphQl/mutations';
import { getSchoolClassForClassDetailsPage } from '../../../graphQl/queries';
import sharedJson from '../../../shared/json/index.json';
import { showDate, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import CommonCheckBox from '../CommonCheckBox';
import CommonDraggableTable from '../CommonDraggableTable';
import CommonListWithIcon from '../CommonListWithIcon';
import CommonSelectField from '../CommonSelectField';
import CommonTooltipIcon from '../CommonTooltipIcon';
import DateField from '../InputField/DateField';
import AddTermOrHolidayModal from '../Modals/AddTermOrHoliday';
import Heading1 from '../Typography/Heading1';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

const useStyles = makeStyles({
    registrationCheckboxContainer: {
        display: 'flex',
        alignItems: 'center',
        marginTop: '22px',
        marginBottom: '10px'
    }
});

const CommonTermsAndHolidays = ({ schoolClassData }) => {
    const classes = useStyles();
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [openTermModal, setOpenTermModal] = useState(false);

    const [updateReadingLog, { loading: updateReadingLogIsLoading }] = useMutation(updateSchoolClass, {
        refetchQueries: [{ query: getSchoolClassForClassDetailsPage, variables: { id: router?.query?.class_id } }],
        awaitRefetchQueries: true
    });

    const termHeading = ['Term name', 'Period', ''];

    const termHead = termHeading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Term name') {
            rowHead.width = '200';
        }

        return rowHead;
    });

    const holidayHeading = ['Holiday name', 'Period', ''];

    const holidayHead = holidayHeading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Holiday name') {
            rowHead.width = '200';
        }

        return rowHead;
    });

    const termList = [
        {
            text: 'Add terms',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setOpenTermModal(!openTermModal)
        }
    ];

    const holidayList = [
        {
            text: 'Add a holiday',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setOpenTermModal(!openTermModal)
        }
    ];

    const renderNextReleaseDate = () => {
        return showDate({ date: moment().add(1, 'w').startOf('week').add(1, 'd'), time: true });
    };

    return (
        <div>
            <Formik
                // validationSchema={addClassValidation}
                enableReinitialize
                initialValues={{
                    academicDate: 'setBySchool',
                    isReadingLogsEnabled: schoolClassData?.['schoolClass']?.IsReadingLogsEnabled,
                    readingTarget: schoolClassData?.['schoolClass']?.readingTarget
                }}
                onSubmit={async (values) => {
                    let { isReadingLogsEnabled, readingTarget } = values;

                    try {
                        await updateReadingLog({
                            variables: {
                                input: {
                                    id: schoolClassData?.['schoolClass']?.id,
                                    isReadingLogsEnabled,
                                    readingTarget
                                }
                            }
                        })
                            .then(() => {
                                callSnackbar('Class reading settings has been updated.', 'success');
                            })
                            .catch((error) => {
                                callSnackbar(error, 'error');
                            });
                    } catch {
                        // const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;
                        // if (statusCode) {
                        //     callSnackbar(error, 'error');
                        // } else {
                        //     window.newrelic?.noticeError(error, { caught: true, handled: false });
                        //     callSnackbar(unexpectedError, 'error');
                        // }
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                    return (
                        <>
                            <Form onSubmit={(e) => e.preventDefault()}>
                                <div className="terms-holiday-form">
                                    <Heading1 text="Academic year dates" />
                                    <div className="terms-holiday-radio-container">
                                        <FormControl>
                                            <RadioGroup name="academicDate" value={values.academicDate} onChange={handleChange}>
                                                <FormControlLabel
                                                    value={'setBySchool'}
                                                    control={<Radio />}
                                                    label="Use the term dates and holidays set by the school"
                                                />
                                                <FormControlLabel
                                                    value={'differentDates'}
                                                    control={<Radio />}
                                                    label="Set different dates fot this class"
                                                />
                                            </RadioGroup>
                                        </FormControl>
                                    </div>
                                    <div className="terms-holiday-add-term">
                                        <CommonListWithIcon list={termList} />
                                    </div>
                                    <CommonDraggableTable columns={termHead} rows={[]} customClass="term-table" />
                                    <div className="terms-holiday-add-term">
                                        <CommonListWithIcon list={holidayList} />
                                    </div>
                                    <div className="terms-holiday-target-alert">
                                        <Alert severity="info" onClose={() => {}}>
                                            <Paragraph text="Reading log targets will be paused for weeks which include holidays." />
                                        </Alert>
                                    </div>
                                    <CommonDraggableTable columns={holidayHead} rows={[]} customClass="holiday-table" />
                                    {schoolClassData?.['schoolClass']?.IsReadingLogsEnabled && (
                                        <div className="reading-log-settings-container">
                                            <Heading3 text="Reading Log" customClass={'reading-log-heading'} />
                                            <div style={{ maxWidth: '400px' }}>
                                                {schoolClassData?.['schoolClass']?.isRegistrationClass ? (
                                                    <>
                                                        <div className={classes.registrationCheckboxContainer}>
                                                            <CommonCheckBox
                                                                name="isReadingLogsEnabled"
                                                                checked={values.isReadingLogsEnabled}
                                                                onBlur={handleBlur}
                                                                onChange={(e) => {
                                                                    handleChange({
                                                                        target: { name: 'isReadingLogsEnabled', value: e.target.checked }
                                                                    });
                                                                }}
                                                                label="Enable weekly reading log"
                                                                error={errors.isReadingLogsEnabled}
                                                                touched={touched.isReadingLogsEnabled}
                                                                className="reading-log-check"
                                                            />
                                                            {/* <CommonTooltipIcon
                                                                text={`Reading log will be enabled from the following Monday.`}
                                                                customIconClass={'enabling-weekly-reading-icon'}
                                                            /> */}
                                                        </div>
                                                        {values.isReadingLogsEnabled && (
                                                            <>
                                                                {!schoolClassData?.schoolClass?.IsReadingLogsEnabled && (
                                                                    <>
                                                                        <Alert severity={'info'}>
                                                                            {`Reading log will be enabled from Monday ${renderNextReleaseDate()}.`}
                                                                        </Alert>
                                                                        <br />
                                                                    </>
                                                                )}
                                                                <CommonSelectField
                                                                    label={'Weekly reading target'}
                                                                    options={sharedJson?.weeklyReadingTarget}
                                                                    value={values.readingTarget}
                                                                    error={errors.readingTarget}
                                                                    touched={touched.readingTarget}
                                                                    customClass={'reading-log-select'}
                                                                    md={6}
                                                                    lg={4}
                                                                    sm={12}
                                                                    xs={12}
                                                                    onChange={(e) =>
                                                                        handleChange({
                                                                            target: { name: 'readingTarget', value: +e.target.value }
                                                                        })
                                                                    }
                                                                    onBlur={(e) =>
                                                                        handleBlur({
                                                                            target: { name: 'readingTarget', value: +e.target.value }
                                                                        })
                                                                    }
                                                                />
                                                            </>
                                                        )}
                                                        <div className="terms-holiday-radio-container">
                                                            <FormControl>
                                                                <RadioGroup
                                                                    name="readingLaunchDate"
                                                                    value={values.readingLaunchDate}
                                                                    onChange={handleChange}>
                                                                    <FormControlLabel
                                                                        value={'launchDateBySchool'}
                                                                        control={<Radio />}
                                                                        label="Use reading log launch date set by the school"
                                                                    />
                                                                    <FormControlLabel
                                                                        value={'differentLaunchDate'}
                                                                        control={<Radio />}
                                                                        label="Set different launch date for this class"
                                                                    />
                                                                </RadioGroup>
                                                            </FormControl>
                                                        </div>
                                                        <br />
                                                        <DateField
                                                            name="startDate"
                                                            label="Reading log launch date (Optional)"
                                                            md={12}
                                                            lg={12}
                                                            value={values.startDate}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            error={errors.startDate}
                                                            touched={touched.startDate}
                                                            // minDate={new Date()}
                                                        />
                                                        <br />
                                                        <LWPButton
                                                            btnText="Save reading settings"
                                                            loading={updateReadingLogIsLoading}
                                                            disabled={
                                                                updateReadingLogIsLoading ||
                                                                !schoolClassData?.['schoolClass']?.isRegistrationClass
                                                            }
                                                            onClick={handleSubmit}
                                                        />
                                                    </>
                                                ) : (
                                                    <div className="reading-log-not-available">
                                                        <Paragraph>Not available</Paragraph>

                                                        <CommonTooltipIcon
                                                            customIconClass={'reading-log-class-icon'}
                                                            text="The reading log can only be enabled on registration classes."
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Form>
                        </>
                    );
                }}
            </Formik>
            {openTermModal && <AddTermOrHolidayModal open={openTermModal} setOpen={() => setOpenTermModal(!openTermModal)} />}
        </div>
    );
};

CommonTermsAndHolidays.propTypes = {
    schoolClassData: PropTypes.object
};

export default CommonTermsAndHolidays;
