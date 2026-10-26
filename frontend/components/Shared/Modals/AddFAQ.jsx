import { useMutation } from '@apollo/client';
import { makeStyles } from '@mui/styles';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { addFAQ, updateFAQ } from '../../../graphQl/mutations';
import { allFAQs } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { addFAQValidation } from '../../../shared/validations';
import CommonEditor from '../CommonEditor';
import LWPButton from './../Button/LWPButton';
import CommonCheckBox from './../CommonCheckBox';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';

const useStyles = makeStyles(() => ({
    answerFieldWrapper: {
        margin: '10px 0'
    }
}));

const AddFAQModal = ({ open, setOpen, updateValues, setUpdateValues }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const classes = useStyles();

    const [addFAQMutation, { loading }] = useMutation(addFAQ, {
        refetchQueries: [{ query: allFAQs }],
        awaitRefetchQueries: true
    });
    const [updateFAQMutation, { loading: updateLoading }] = useMutation(updateFAQ, {
        refetchQueries: [{ query: allFAQs }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            initialValues={
                updateValues
                    ? {
                          question: updateValues.question,
                          answer: updateValues.answer,
                          editAsHtml: updateValues?.editAsHtml ? true : false,
                          forParent: updateValues.forParent,
                          forTeacher: updateValues.forTeacher,
                          forSchoolLeader: updateValues.forSchoolLeader,
                          forBeforeLogin: updateValues.forBeforeLogin
                      }
                    : formInitialStates['addFAQ']
            }
            enableReinitialize
            validationSchema={addFAQValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    let { question, answer, forParent, forTeacher, forSchoolLeader, editAsHtml, forBeforeLogin } = values;

                    question = _removeWhiteSpace(question);

                    if (!updateValues) {
                        await addFAQMutation({
                            variables: {
                                input: {
                                    question,
                                    answer,
                                    forParent,
                                    forTeacher,
                                    forSchoolLeader,
                                    forBeforeLogin,
                                    editAsHtml
                                }
                            }
                        });
                        callSnackbar('Added successfully', 'success');
                        setOpen(false);
                        resetForm({ values: '' });
                    } else {
                        await updateFAQMutation({
                            variables: {
                                input: {
                                    id: updateValues.id,
                                    question,
                                    answer,
                                    forParent,
                                    forTeacher,
                                    forSchoolLeader,
                                    forBeforeLogin,
                                    editAsHtml
                                }
                            }
                        });
                        callSnackbar('Update successfully', 'success');
                        setOpen(false);
                        resetForm({ values: '' });
                        setUpdateValues(null);
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setFieldValue }) => (
                <DialogWrapper
                    className="add_parent_modal"
                    open={open}
                    setOpen={setOpen}
                    heading={updateValues ? 'Update a FAQ' : 'Add an FAQ'}
                    onClose={() => {
                        setOpen(false);
                        setUpdateValues(null);
                    }}>
                    <InputField
                        md={12}
                        lg={12}
                        label="Question"
                        value={values.question}
                        name={'question'}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.question}
                        touched={touched.question}
                    />

                    <div className={classes.answerFieldWrapper}>
                        <CommonCheckBox
                            checked={values.editAsHtml}
                            onChange={() => setFieldValue('editAsHtml', !values.editAsHtml)}
                            label="Edit As Html"
                        />
                        <CommonEditor
                            value={values.answer}
                            onChange={(newValue) => setFieldValue('answer', newValue)}
                            editAsHtml={values.editAsHtml}
                        />
                    </div>

                    <CommonCheckBox
                        name="forParent"
                        checked={values.forParent}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Parent"
                        error={errors.forParent}
                        touched={touched.forParent}
                    />
                    <CommonCheckBox
                        name="forTeacher"
                        checked={values.forTeacher}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Teacher"
                        error={errors.forTeacher}
                        touched={touched.forTeacher}
                    />
                    <CommonCheckBox
                        name="forSchoolLeader"
                        checked={values.forSchoolLeader}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Leader"
                        error={errors.forSchoolLeader}
                        touched={touched.forSchoolLeader}
                    />
                    <CommonCheckBox
                        label="Before Login"
                        name="forBeforeLogin"
                        checked={values.forBeforeLogin}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.forBeforeLogin}
                        touched={touched.forBeforeLogin}
                    />

                    <div className="btn_group">
                        <LWPButton
                            customClass="cancel_btn"
                            variant="text"
                            onClick={() => {
                                setOpen(false);
                                setUpdateValues(null);
                            }}
                            btnText="Cancel"
                            color="inherit"
                        />
                        <LWPButton
                            btnText={updateValues ? 'Update FAQ' : 'Add FAQ'}
                            loading={loading || updateLoading}
                            onClick={handleSubmit}
                        />
                    </div>
                </DialogWrapper>
            )}
        </Formik>
    );
};

AddFAQModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    updateValues: PropTypes.bool,
    setUpdateValues: PropTypes.func
};

export default AddFAQModal;
