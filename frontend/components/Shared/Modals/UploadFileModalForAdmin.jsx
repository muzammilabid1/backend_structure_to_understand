import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';

import { addAFile } from '../../../graphQl/mutations';
import { getAllFiles } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { _getBase64ToFile, ThemeContext } from '../../../shared/Services/handler';
import { uploadFileForAdminValidation } from '../../../shared/validations';
import LWPButton from '../Button/LWPButton';
import CommonCheckBox from '../CommonCheckBox';
import CommonFileUpload from '../CommonFileUpload';
import DialogWrapper from '../DialogWrapper';

const UploadFileModalForAdmin = ({ open, setOpen, defaultValues }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [filename, setFileName] = useState(null);

    const [addAFileMutation, { loading: addAFileIsLoading }] = useMutation(addAFile, {
        refetchQueries: [{ query: getAllFiles }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            initialValues={{ file: defaultValues || '', download: true }}
            enableReinitialize
            validationSchema={uploadFileForAdminValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    const { file, download } = values;

                    let newFile = file && filename && _getBase64ToFile(file, filename);

                    await addAFileMutation({ variables: { file: [newFile], download } });
                    callSnackbar('New file uploaded', 'success');
                    setOpen(false);
                    resetForm({ values: '' });
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
            {({ values, errors, touched, handleChange, handleSubmit }) => {
                return (
                    <DialogWrapper
                        className="add_parent_modal"
                        open={open}
                        setOpen={setOpen}
                        onClose={() => setOpen(false)}
                        heading={'Upload a file'}>
                        <CommonCheckBox
                            name="download"
                            checked={values.download}
                            onChange={handleChange}
                            label="When users access the file force it to download instead of opening in the browser"
                            error={errors.download}
                            touched={touched.download}
                        />
                        <CommonFileUpload
                            name="file"
                            previewImage={values.file}
                            customClass="admin-upload-file-uploader"
                            icon="folder"
                            heading=" "
                            setFileName={setFileName}
                            onClose={() => handleChange({ target: { name: 'file', value: '' } })}
                            onSave={(croppedImage) => {
                                handleChange({ target: { name: 'file', value: croppedImage } });
                            }}
                        />

                        <div className="btn_group">
                            <LWPButton
                                customClass="cancel_btn"
                                variant="text"
                                btnText="Cancel"
                                color="inherit"
                                onClick={() => setOpen(false)}
                            />
                            <LWPButton btnText={'Upload'} loading={addAFileIsLoading} onClick={handleSubmit} />
                        </div>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

UploadFileModalForAdmin.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    defaultValues: PropTypes.object
};

UploadFileModalForAdmin.defaultProps = {
    open: false,
    setOpen: () => {}
};

export default UploadFileModalForAdmin;
