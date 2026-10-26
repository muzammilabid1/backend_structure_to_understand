import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { addSchoolDate, updateSchoolDate } from '../../../graphQl/mutations';
import { getAllSchoolDates } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { addTermValidation } from '../../../shared/validations';
import CommonLoading from '../CommonLoading';
import CommonSelectField from '../CommonSelectField';
import LWPButton from './../Button/LWPButton';
import DialogWrapper from './../DialogWrapper';
import DateField from './../InputField/DateField';
import InputField from './../InputField/InputField';

const getAllStaticPeriodsForAddTermModal = gql`
    query allStaticPeriods {
        allStaticPeriods {
            index
            shortName
        }
    }
`;

const AddTermModal = ({ open, setOpen, updateValues }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const { loading: allStaticPeriodsLoading, error, data: allStaticPeriods } = useQuery(getAllStaticPeriodsForAddTermModal);

    const [addSchoolDateMutation, { loading }] = useMutation(addSchoolDate, {
        refetchQueries: [{ query: getAllSchoolDates }],
        awaitRefetchQueries: true
    });
    const [updateSchoolDateMutation, { loading: updateLoading }] = useMutation(updateSchoolDate, {
        refetchQueries: [{ query: getAllSchoolDates }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        handleErrorSnackbar(error, callSnackbar);
    }, [error]);

    if (allStaticPeriodsLoading) return <CommonLoading />;

    return (
        <Formik
            initialValues={{
                termName: updateValues ? updateValues?.termName : '',
                startDate: updateValues ? new Date(updateValues?.startDate) : new Date(),
                endDate: updateValues ? new Date(updateValues?.endDate) : new Date(),
                period: updateValues ? updateValues?.termPeriodIndex : ''
            }}
            enableReinitialize
            validationSchema={addTermValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    if (updateValues) {
                        await updateSchoolDateMutation({
                            variables: {
                                input: {
                                    id: updateValues.id,
                                    termName: values?.termName?.trim() ? values?.termName?.trim() : null,
                                    startDate: values?.startDate,
                                    endDate: values?.endDate,
                                    periodIndex: values?.period
                                }
                            }
                        });
                        callSnackbar('Changes saved', 'success');
                        setOpen();
                        resetForm({ values: '' });
                    } else {
                        await addSchoolDateMutation({
                            variables: {
                                input: {
                                    termName: values?.termName?.trim() ? values?.termName?.trim() : null,
                                    startDate: values?.startDate,
                                    endDate: values?.endDate,
                                    periodIndex: values?.period
                                }
                            }
                        });
                        callSnackbar('Term created', 'success');
                        setOpen();
                        resetForm({ values: '' });
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
            }}>
            {({ values, errors, touched, handleChange, handleSubmit, handleBlur }) => (
                <DialogWrapper
                    className="add_parent_modal"
                    open={open}
                    setOpen={setOpen}
                    onClose={() => setOpen()}
                    dataTest="add-term-modal"
                    heading={updateValues ? 'Update a term' : 'Add a term'}>
                    <InputField
                        md={12}
                        lg={12}
                        label="Name"
                        value={values.termName}
                        name={'termName'}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.termName}
                        touched={touched.termName}
                    />

                    <Grid className="add-term-modal-grid" container>
                        <DateField
                            name="startDate"
                            label="Start date"
                            md={12}
                            lg={12}
                            customClass="term-date"
                            value={values.startDate}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.startDate}
                            touched={touched.startDate}
                            // minDate={new Date()}
                        />

                        <DateField
                            name="endDate"
                            label="End date"
                            value={values.endDate}
                            customClass="term-date"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.endDate}
                            touched={touched.endDate}
                            minDate={values.startDate}
                            md={12}
                            lg={12}
                        />

                        <CommonSelectField
                            xs={12}
                            sm={12}
                            displayEmpty
                            shrink={values.period}
                            error={errors.period}
                            touched={touched.period}
                            value={values.period}
                            label="Academic year"
                            options={(allStaticPeriods?.['allStaticPeriods'] || []).map((period) => ({
                                key: period?.index,
                                value: period?.index
                            }))}
                            onChange={(e) => {
                                handleChange({
                                    target: { name: 'period', value: e.target.value }
                                });
                            }}
                            dataTest="add-term-academic-year-select"
                        />
                    </Grid>

                    <div className="btn_group">
                        <LWPButton customClass="cancel_btn" variant="text" onClick={() => setOpen()} btnText="Cancel" color="inherit" />
                        <LWPButton
                            btnText={updateValues ? 'Update term' : 'Add term'}
                            loading={loading || updateLoading}
                            onClick={handleSubmit}
                            dataTest="add-term-submit-button"
                        />
                    </div>
                </DialogWrapper>
            )}
        </Formik>
    );
};

AddTermModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    updateValues: PropTypes.bool
};

export default AddTermModal;
