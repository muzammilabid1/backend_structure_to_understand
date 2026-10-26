import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { addNews, updateNews } from '../../../graphQl/mutations';
import { getAllNews } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { addNewsValidation } from '../../../shared/validations';
import CommonEditor from '../CommonEditor';
import LWPButton from './../Button/LWPButton';
import CommonCheckBox from './../CommonCheckBox';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';

const AddNewsModal = ({ open, setOpen, updateValues }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [addNewsMutation, { loading }] = useMutation(addNews, {
        refetchQueries: [{ query: getAllNews }],
        awaitRefetchQueries: true
    });
    const [updateNewsMutation, { loading: updateLoading }] = useMutation(updateNews, {
        refetchQueries: [{ query: getAllNews }],
        awaitRefetchQueries: true
    });

    const initialValues = {
        title: updateValues ? updateValues?.title : '',
        description: updateValues?.description ? updateValues?.description : '',
        forTeacher: updateValues ? updateValues?.forTeacher : false,
        editAsHtml: updateValues ? updateValues?.editAsHtml : false,
        forSchoolLeader: updateValues ? updateValues?.forSchoolLeader : false
    };

    return (
        <Formik
            initialValues={initialValues}
            enableReinitialize
            validationSchema={addNewsValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    let { title, description, forTeacher, forSchoolLeader, editAsHtml } = values;

                    title = _removeWhiteSpace(title);

                    if (updateValues) {
                        await updateNewsMutation({
                            variables: {
                                input: {
                                    id: updateValues.id,
                                    title,
                                    description,
                                    forTeacher,
                                    forSchoolLeader,
                                    editAsHtml
                                }
                            }
                        });
                        callSnackbar('Changes saved', 'success');
                        setOpen();
                        resetForm({ values: '' });
                    } else {
                        await addNewsMutation({
                            variables: {
                                input: {
                                    title,
                                    description,
                                    forTeacher,
                                    forSchoolLeader,
                                    editAsHtml
                                }
                            }
                        });
                        callSnackbar('News item created', 'success');
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
            {({ values, errors, touched, handleChange, handleSubmit, handleBlur, setFieldValue, setFieldTouched }) => (
                <DialogWrapper
                    className="add_parent_modal"
                    open={open}
                    setOpen={setOpen}
                    onClose={() => setOpen()}
                    heading={updateValues ? 'Update a news' : 'Add a news'}>
                    <InputField
                        md={12}
                        lg={12}
                        label="Title"
                        value={values.title}
                        name={'title'}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.title}
                        touched={touched.title}
                    />

                    <CommonCheckBox
                        checked={values.editAsHtml}
                        onChange={() => setFieldValue('editAsHtml', !values.editAsHtml)}
                        label="Edit As Html"
                    />
                    <CommonEditor
                        value={values.description}
                        editAsHtml={values.editAsHtml}
                        onChange={(newValue) => setFieldValue('description', newValue)}
                        onBlur={() => setFieldTouched?.('description', true)}
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
                        onBlur={handleBlur}
                        onChange={handleChange}
                        label="Leader"
                        error={errors.forSchoolLeader}
                        touched={touched.forSchoolLeader}
                    />

                    <div className="btn_group">
                        <LWPButton customClass="cancel_btn" variant="text" onClick={() => setOpen()} btnText="Cancel" color="inherit" />
                        <LWPButton
                            btnText={updateValues ? 'Update news' : 'Add news'}
                            loading={loading || updateLoading}
                            onClick={() => handleSubmit()}
                        />
                    </div>
                </DialogWrapper>
            )}
        </Formik>
    );
};

AddNewsModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    updateValues: PropTypes.bool
};

export default AddNewsModal;
