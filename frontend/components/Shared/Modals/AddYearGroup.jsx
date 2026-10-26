import { useMutation, useQuery } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { addYearGroup, updateYearGroup } from '../../../graphQl/mutations';
import { getAllMathscotThemes, getAllStaticYearGroup } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { addYearGroupValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonLoading from '../../Shared/CommonLoading';
import CommonSelectField from '../../Shared/CommonSelectField';
import DialogWrapper from '../../Shared/DialogWrapper';
import InputField from '../../Shared/InputField/InputField';

const AddYearGroupModal = ({ open, setOpen, updateValues }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [addYearGroupMutation, { loading }] = useMutation(addYearGroup, {
        refetchQueries: [{ query: getAllStaticYearGroup, variables: { showHiddenYearGroup: true } }],
        awaitRefetchQueries: true
    });

    const [updateYearGroupMutation, { loading: updateLoading }] = useMutation(updateYearGroup, {
        refetchQueries: [{ query: getAllStaticYearGroup, variables: { showHiddenYearGroup: true } }],
        awaitRefetchQueries: true
    });

    const { loading: mathScotLoading, error: error, data: mathScots } = useQuery(getAllMathscotThemes);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (mathScotLoading) return <CommonLoading />;

    return (
        <Formik
            validationSchema={addYearGroupValidation}
            initialValues={{
                index: updateValues ? updateValues.id : '',
                year: updateValues ? updateValues.year : '',
                shortName: updateValues ? updateValues.shortName : '',
                hiddenFromLists: updateValues ? updateValues.hiddenFromLists : false,
                mathscotOne: updateValues?.mathscotThemes.length > 0 ? updateValues?.mathscotThemes[0] : '',
                mathscotTwo: updateValues?.mathscotThemes.length > 0 ? updateValues?.mathscotThemes[1] : '',
                mathscotThree: updateValues?.mathscotThemes.length > 0 ? updateValues?.mathscotThemes[2] : '',
                id: updateValues ? updateValues.id : ''
            }}
            enableReinitialize
            onSubmit={async (values, { resetForm }) => {
                try {
                    let mathScot = [];

                    mathScot.push(values.mathscotOne);
                    mathScot.push(values.mathscotTwo);
                    mathScot.push(values.mathscotThree);

                    if (updateValues) {
                        await updateYearGroupMutation({
                            variables: {
                                input: {
                                    id: values.id,
                                    year: values.year,
                                    shortName: values.shortName,
                                    hiddenFromLists: values.hiddenFromLists,
                                    mathscotThemes: mathScot
                                }
                            }
                        });
                        callSnackbar('Changes saved', 'success');
                        setOpen();
                        resetForm({ values: '' });
                    } else {
                        await addYearGroupMutation({
                            variables: {
                                input: {
                                    id: values.index,
                                    year: values.year,
                                    shortName: values.shortName,
                                    hiddenFromLists: values.hiddenFromLists,
                                    mathscotThemes: mathScot
                                }
                            }
                        });
                        callSnackbar('year group created', 'success');
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                <DialogWrapper
                    className="add-academic-year"
                    open={open}
                    setOpen={setOpen}
                    onClose={() => setOpen()}
                    heading={updateValues ? 'Update a year group' : 'Add a year group'}>
                    <InputField
                        label="Index"
                        name="index"
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                        disabled={updateValues}
                        value={values.index}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.index}
                        touched={touched.index}
                    />
                    <InputField
                        type="text"
                        label="Year group"
                        name="year"
                        value={values.year}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.year}
                        touched={touched.year}
                    />

                    <InputField
                        type="text"
                        label="Short name"
                        name="shortName"
                        value={values.shortName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.shortName}
                        touched={touched.shortName}
                    />

                    <CommonSelectField
                        label="Mathscot theme"
                        options={mathScots?.allMathscotThemes
                            .filter((g) => g !== values.mathscotTwo && g !== values.mathscotThree)
                            .map((t) => ({
                                value: t,
                                key: t
                            }))}
                        value={values.mathscotOne}
                        error={errors.mathscotOne}
                        touched={touched.mathscotOne}
                        md={6}
                        lg={6}
                        onChange={(e) =>
                            handleChange({
                                target: { name: 'mathscotOne', value: e.target.value }
                            })
                        }
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'mathscotOne', value: e.target.value }
                            })
                        }
                    />
                    <CommonSelectField
                        label="Mathscot theme"
                        options={mathScots?.allMathscotThemes
                            .filter((g) => g !== values.mathscotOne && g !== values.mathscotThree)
                            .map((t) => ({
                                value: t,
                                key: t
                            }))}
                        value={values.mathscotTwo}
                        error={errors.mathscotTwo}
                        touched={touched.mathscotTwo}
                        md={6}
                        lg={6}
                        onChange={(e) =>
                            handleChange({
                                target: { name: 'mathscotTwo', value: e.target.value }
                            })
                        }
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'mathscotTwo', value: e.target.value }
                            })
                        }
                    />
                    <CommonSelectField
                        label="Mathscot theme"
                        options={mathScots?.allMathscotThemes
                            .filter((g) => g !== values.mathscotTwo && g !== values.mathscotOne)
                            .map((t) => ({
                                value: t,
                                key: t
                            }))}
                        value={values.mathscotThree}
                        error={errors.mathscotThree}
                        touched={touched.mathscotThree}
                        md={6}
                        lg={6}
                        onChange={(e) =>
                            handleChange({
                                target: { name: 'mathscotThree', value: e.target.value }
                            })
                        }
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'mathscotThree', value: e.target.value }
                            })
                        }
                    />

                    <CommonCheckBox
                        name="hiddenFromLists"
                        checked={values.hiddenFromLists}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Hidden from list"
                        error={errors.hiddenFromLists}
                        touched={touched.hiddenFromLists}
                    />

                    <div className="btn_group">
                        <LWPButton customClass="cancel_btn" variant="text" onClick={() => setOpen()} btnText="Cancel" color="inherit" />
                        <LWPButton
                            btnText={updateValues ? 'Update' : 'Add'}
                            loading={loading || updateLoading}
                            onClick={() => handleSubmit()}
                        />
                    </div>
                </DialogWrapper>
            )}
        </Formik>
    );
};

AddYearGroupModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    updateValues: PropTypes.bool
};

export default AddYearGroupModal;
