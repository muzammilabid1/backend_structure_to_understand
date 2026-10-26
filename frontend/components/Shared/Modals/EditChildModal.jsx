import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { updatePupil } from '../../../graphQl/mutations';
import { getPupilForTeacher } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { editChildValidation } from '../../../shared/validations';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import DialogWrapper from '../../Shared/DialogWrapper';
import InputField from '../../Shared/InputField/InputField';

// share-photo getting null from database and updateChild mutation need to boolean
const EditChildModal = ({ open, setOpen, firstname, lastname, isPremium, id, classId }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [updateChild, { loading }] = useMutation(updatePupil, {
        refetchQueries: [{ query: getPupilForTeacher, variables: { id } }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            initialValues={{
                firstname,
                lastname,
                isPremium
            }}
            validationSchema={editChildValidation}
            onSubmit={async (values) => {
                try {
                    const { firstname, lastname, isPremium } = values;

                    await updateChild({
                        variables: {
                            input: {
                                firstname: _removeWhiteSpace(firstname),
                                lastname: _removeWhiteSpace(lastname),
                                isPremium,
                                id,
                                classId
                            }
                        }
                    });
                    setOpen(false);
                    callSnackbar('Update Successful!', 'success');
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                <DialogWrapper
                    open={open}
                    setOpen={setOpen}
                    cancelBtn
                    dialogFooter
                    primaryBtnText="Save changes"
                    primaryBtnHandler={handleSubmit}
                    primaryBtnloading={loading}
                    heading="Edit child"
                    dataTest={'edit-child-modal'}>
                    <form className="mt8">
                        <InputField
                            md={12}
                            lg={12}
                            autoFocus
                            type="text"
                            label="First name"
                            name="firstname"
                            value={values.firstname}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.firstname}
                            touched={touched.firstname}
                        />
                        <InputField
                            md={12}
                            lg={12}
                            type="text"
                            label="Last name"
                            name="lastname"
                            value={values.lastname}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.lastname}
                            touched={touched.lastname}
                        />
                        <CommonCheckBox
                            label="Mark as Pupil Premium"
                            name="isPremium"
                            checked={values.isPremium}
                            onChange={(e) => handleChange({ target: { name: 'isPremium', value: e?.target?.checked } })}
                            error={errors.isPremium}
                            touched={touched.isPremium}
                        />
                    </form>
                </DialogWrapper>
            )}
        </Formik>
    );
};

EditChildModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    firstname: PropTypes.string,
    lastname: PropTypes.string,
    isPremium: PropTypes.bool,
    id: PropTypes.string,
    classId: PropTypes.string
};

EditChildModal.defaultProps = {
    open: false,
    setOpen: () => {}
};

export default EditChildModal;
