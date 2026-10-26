import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import React from 'react';

import formInitialStates from '../../../shared/formInitialStates';
import { photoPermissionValidation } from '../../../shared/validations';
import CommonCheckBox from '../CommonCheckBox';
import DialogWrapper from '../DialogWrapper';
import Divider from '../Divider';
import Paragraph from './../../Shared/Typography/Paragraph';

const ConfirmationImageModal = ({ open, onSubmit }) => {
    return (
        <Formik
            initialValues={{
                ...formInitialStates['photoPermission']
            }}
            validationSchema={photoPermissionValidation}
            onSubmit={onSubmit}>
            {({ values, handleChange, handleSubmit, errors, touched }) => (
                <DialogWrapper
                    open={open}
                    dialogFooter
                    heading="Upload a photo"
                    primaryBtnText="Save permissions"
                    primaryBtnHandler={handleSubmit}>
                    <Form>
                        <Paragraph
                            text="Do you want to upload a photo of you and Name enjoying this activity? You could share your best maths puzzling faces or just the two of you in full swing with the activity! It’s not about uploading your answers - just whatever you want to share!"
                            customClass="upload-img-title"
                        />
                        <CommonCheckBox
                            name="shareWithTeacher"
                            checked={values.shareWithTeacher}
                            error={errors.shareWithTeacher}
                            touched={touched.shareWithTeacher}
                            onChange={handleChange}
                            label="I give permission to share this image with teachers at my child’s school. Learning with Parents will store the image in line with the terms of their privacy and data retention policies.*"
                            className="mt8"
                        />
                        <CommonCheckBox
                            name="shareWithParent"
                            checked={values.shareWithParent}
                            error={errors.shareWithParent}
                            touched={touched.shareWithParent}
                            onChange={handleChange}
                            label="I give permission for Learning with Parents to use this image in marketing materials and on other social media. In all cases we will never disclose your name or contact details when we use the photograph."
                            className="mt8"
                        />

                        <Divider customClass="my10" />

                        <CommonCheckBox
                            name="sharingAllowedGlobal"
                            checked={values.sharingAllowedGlobal}
                            error={errors.sharingAllowedGlobal}
                            touched={touched.sharingAllowedGlobal}
                            onChange={handleChange}
                            label="Do not ask me about permissions again. I agree to these terms for every photo I share with Learning with Parents."
                            className="mb10"
                        />
                    </Form>
                </DialogWrapper>
            )}
        </Formik>
    );
};

ConfirmationImageModal.propTypes = { open: PropTypes.bool, onSubmit: PropTypes.func };

export default ConfirmationImageModal;
