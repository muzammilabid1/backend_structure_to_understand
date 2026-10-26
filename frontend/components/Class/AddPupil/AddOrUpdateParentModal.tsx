/* eslint-disable @typescript-eslint/no-explicit-any */
import { Formik } from 'formik';
import { nanoid } from 'nanoid';
import React, { useContext } from 'react';

import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { addParentValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import DialogWrapper from '../../Shared/DialogWrapper';
import InputField from '../../Shared/InputField/InputField';
import { ParentDetails } from './index';

interface AddOrUpdateParentModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    setFieldValue?: (field: string, value: any) => void;
    parentDetailsValue: ParentDetails[];
    valuesToUpdate?: ParentDetails;
}

const AddOrUpdateParentModal: React.FC<AddOrUpdateParentModalProps> = ({
    open,
    setOpen,
    setFieldValue,
    parentDetailsValue,
    valuesToUpdate
}) => {
    const { callSnackbar } = useContext(ThemeContext);
    const initialValues = {
        id: valuesToUpdate?.id ? valuesToUpdate?.id : nanoid(),
        parentFirstname: valuesToUpdate?.firstname ? valuesToUpdate?.firstname : '',
        parentLastname: valuesToUpdate?.lastname ? valuesToUpdate?.lastname : '',
        email: valuesToUpdate?.email ? valuesToUpdate?.email : '',
        phoneNumber: valuesToUpdate?.phoneNumber ? valuesToUpdate?.phoneNumber : ''
    };

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={addParentValidation}
            onSubmit={async (values, { resetForm }) => {
                const { parentFirstname, parentLastname, email, phoneNumber, id } = values;

                const trimmedFirstname = _removeWhiteSpace(parentFirstname);
                const trimmedLastname = _removeWhiteSpace(parentLastname);
                const trimmedEmail = _removeWhiteSpace(email);
                const trimmedPhoneNumber = _removeWhiteSpace(phoneNumber);

                const updatedParentDetails = valuesToUpdate?.id
                    ? parentDetailsValue.map((parent) =>
                          parent.id === valuesToUpdate.id
                              ? {
                                    ...parent,
                                    firstname: trimmedFirstname,
                                    lastname: trimmedLastname,
                                    email: trimmedEmail,
                                    phoneNumber: trimmedPhoneNumber
                                }
                              : parent
                      )
                    : [
                          ...parentDetailsValue,
                          {
                              id,
                              firstname: trimmedFirstname,
                              lastname: trimmedLastname,
                              email: trimmedEmail,
                              phoneNumber: trimmedPhoneNumber
                          }
                      ];

                setFieldValue('parentDetails', updatedParentDetails);

                callSnackbar(
                    valuesToUpdate?.id ? 'Parent details have been updated successfully.' : 'Parent details have been added successfully.',
                    'success'
                );
                setOpen(false);
                resetForm({ values: initialValues });
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                return (
                    <DialogWrapper
                        className="add_parent_modal"
                        open={open}
                        setOpen={setOpen}
                        heading="Add a parent"
                        dataTest={'add-parent-modal'}>
                        <InputField
                            lg={12}
                            md={12}
                            sm={12}
                            xs={12}
                            label="Parent first name"
                            value={values.parentFirstname}
                            name={'parentFirstname'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.parentFirstname}
                            touched={touched.parentFirstname}
                        />
                        <InputField
                            lg={12}
                            md={12}
                            sm={12}
                            xs={12}
                            label="Parent last name"
                            value={values.parentLastname}
                            name={'parentLastname'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.parentLastname}
                            touched={touched.parentLastname}
                        />
                        <InputField
                            lg={12}
                            md={12}
                            sm={12}
                            xs={12}
                            label="Parent email address"
                            value={values.email}
                            name={'email'}
                            onChange={(e) => {
                                handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                            }}
                            onBlur={handleBlur}
                            error={errors.email}
                            touched={touched.email}
                        />

                        <InputField
                            lg={12}
                            md={12}
                            sm={12}
                            xs={12}
                            label="Parent mobile number"
                            value={values.phoneNumber}
                            name={'phoneNumber'}
                            onChange={(e) => {
                                handleChange({ target: { name: 'phoneNumber', value: e.target.value.toLowerCase() } });
                            }}
                            onBlur={handleBlur}
                            error={errors.phoneNumber}
                            touched={touched.phoneNumber}
                        />

                        <div className="btn_group">
                            <LWPButton
                                customClass="cancel_btn"
                                variant="text"
                                onClick={() => setOpen(false)}
                                btnText="Cancel"
                                color="inherit"
                                dataTest={'dialog-cancel-btn'}
                            />
                            <LWPButton
                                dataTest={valuesToUpdate?.id ? 'update-parent-for-a-pupil-button' : 'add-parent-for-a-pupil-button'}
                                btnText={valuesToUpdate?.id ? 'Update parent' : 'Add parent'}
                                onClick={handleSubmit}
                            />
                        </div>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

export default AddOrUpdateParentModal;
