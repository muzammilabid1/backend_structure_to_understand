import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';

import { addResource, updateResource } from '../../../graphQl/mutations';
import { getAllResources } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import { _getBase64ToFile, _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { addResourceValidation } from '../../../shared/validations';
import LWPButton from './../Button/LWPButton';
import CommonCheckBox from './../CommonCheckBox';
import CommonFileUpload from './../CommonFileUpload';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';

const AddResourceModal = ({ open, setOpen, defaultValues }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [filename, setFileName] = useState(null);

    const [addResourceMutation, { loading: addResourceIsLoading }] = useMutation(addResource, {
        refetchQueries: [{ query: getAllResources }],
        awaitRefetchQueries: true
    });

    const [updateResourceMutation, { loading: updateResourceIsLoading }] = useMutation(updateResource, {
        refetchQueries: [{ query: getAllResources }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            initialValues={defaultValues ? defaultValues : formInitialStates['addResource']}
            enableReinitialize
            validationSchema={addResourceValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    const { title, description, file, leaderOnly, download } = values;

                    const files = [];

                    let newFile = file && filename && _getBase64ToFile(file, filename);

                    if (newFile) files.push(newFile);

                    if (defaultValues) {
                        await updateResourceMutation({
                            variables: {
                                file: files,
                                input: {
                                    id: defaultValues.id,
                                    title: _removeWhiteSpace(title),
                                    description: _removeWhiteSpace(description),
                                    download: defaultValues.download,
                                    leaderOnly
                                }
                            }
                        });
                        callSnackbar('Resource updated', 'success');
                        setOpen(false);
                        resetForm({ values: '' });
                    } else {
                        await addResourceMutation({
                            variables: {
                                file: [newFile],
                                input: {
                                    title: _removeWhiteSpace(title),
                                    description: _removeWhiteSpace(description),
                                    leaderOnly,
                                    download
                                }
                            }
                        });
                        callSnackbar('New resource created', 'success');
                        setOpen(false);
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
            {({ values, errors, touched, handleChange, handleSubmit, handleBlur }) => {
                return (
                    <DialogWrapper
                        className="add_parent_modal"
                        open={open}
                        setOpen={setOpen}
                        onClose={() => setOpen(false)}
                        heading={'Add a resource'}>
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

                        <InputField
                            placeholder="Your description goes here."
                            label="Description"
                            type="text"
                            multiline
                            rows={4}
                            md={12}
                            lg={12}
                            name="description"
                            value={values.description}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.description}
                            touched={touched.description}
                        />

                        <CommonFileUpload
                            name="file"
                            previewImage={values.file}
                            customClass="add-resource-file-upload"
                            icon="folder"
                            error={errors.file}
                            touched={touched.file}
                            heading="Resource"
                            setFileName={setFileName}
                            onClose={() => handleChange({ target: { name: 'file', value: '' } })}
                            onSave={(croppedImage) => {
                                handleChange({ target: { name: 'file', value: croppedImage } });
                            }}
                        />

                        <br />

                        <CommonCheckBox
                            error={errors.leaderOnly}
                            touched={touched.leaderOnly}
                            onChange={handleChange}
                            checked={values.leaderOnly}
                            name="leaderOnly"
                            label="Leader only"
                        />

                        {!defaultValues?.id ? (
                            <CommonCheckBox
                                error={errors.download}
                                touched={touched.download}
                                onChange={handleChange}
                                checked={values.download}
                                name="download"
                                label="When users access the file force it to download instead of opening in the browser"
                            />
                        ) : null}

                        <div className="btn_group">
                            <LWPButton
                                customClass="cancel_btn"
                                variant="text"
                                btnText="Cancel"
                                color="inherit"
                                onClick={() => setOpen(false)}
                            />
                            <LWPButton
                                btnText={'Add resource'}
                                loading={addResourceIsLoading || updateResourceIsLoading}
                                onClick={handleSubmit}
                            />
                        </div>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

AddResourceModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    defaultValues: PropTypes.object
};

AddResourceModal.defaultProps = {
    open: false,
    setOpen: () => {}
};

export default AddResourceModal;
