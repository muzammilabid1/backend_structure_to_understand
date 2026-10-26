import { useMutation } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { addStaticPeriod, updateStaticPeriod } from '../../../graphQl/mutations';
import { getAllStaticPeriods } from '../../../graphQl/queries';
import { PupilMathscotsCharacter, PupilMathscotsColour, unexpectedError } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { addAcademicYearValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonSelectField from '../../Shared/CommonSelectField';
import DialogWrapper from '../../Shared/DialogWrapper';
import DateField from '../../Shared/InputField/DateField';
import InputField from '../../Shared/InputField/InputField';
import Heading3 from '../../Shared/Typography/Heading3';

const AddAcademicYearModal = ({ open, setOpen, updateValues }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [addAcademicYear, { loading }] = useMutation(addStaticPeriod, {
        refetchQueries: [{ query: getAllStaticPeriods }],
        awaitRefetchQueries: true
    });

    const [updateAcademicYear, { loading: updateLoading }] = useMutation(updateStaticPeriod, {
        refetchQueries: [{ query: getAllStaticPeriods }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            validationSchema={addAcademicYearValidation}
            initialValues={{
                year: updateValues ? new Date(updateValues?.index, 0, 1) : new Date(),
                startDate: updateValues ? new Date(updateValues?.startDate) : new Date(),
                endDate: updateValues ? new Date(updateValues?.endDate) : new Date(),
                shortName: updateValues ? updateValues.shortName : '',
                longName: updateValues ? updateValues.longName : '',
                characterOne: updateValues?.characters?.length ? updateValues.characters[0] : '',
                characterTwo: updateValues?.characters?.length ? updateValues.characters[1] : '',
                characterThree: updateValues?.characters?.length ? updateValues.characters[2] : '',
                colourOne: updateValues?.colours?.length ? updateValues.colours[0] : '',
                colourTwo: updateValues?.colours?.length ? updateValues.colours[1] : '',
                colourThree: updateValues?.colours?.length ? updateValues.colours[2] : '',
                isCurrentPeriod: updateValues ? updateValues.isCurrentPeriod : false,
                isPreviousPeriod: updateValues ? updateValues.isPreviousPeriod : false
            }}
            enableReinitialize
            onSubmit={async (values, { resetForm }) => {
                try {
                    let characters = [];
                    let colours = [];

                    characters.push(values.characterOne);
                    characters.push(values.characterTwo);
                    characters.push(values.characterThree);

                    colours.push(values.colourOne);
                    colours.push(values.colourTwo);
                    colours.push(values.colourThree);

                    if (updateValues) {
                        await updateAcademicYear({
                            variables: {
                                input: {
                                    index: updateValues.index,
                                    date: values.year,
                                    isCurrentPeriod: values.isCurrentPeriod,
                                    isPreviousPeriod: values.isPreviousPeriod,
                                    characters: JSON.stringify(characters),
                                    colours: JSON.stringify(colours),
                                    shortName: values.shortName,
                                    longName: values.longName,
                                    startDate: values.startDate,
                                    endDate: values.endDate
                                }
                            }
                        });
                        callSnackbar('Changes saved', 'success');
                        setOpen();
                        resetForm({ values: '' });
                    } else {
                        await addAcademicYear({
                            variables: {
                                input: {
                                    date: values.year,
                                    isCurrentPeriod: values.isCurrentPeriod,
                                    isPreviousPeriod: values.isPreviousPeriod,
                                    characters: JSON.stringify(characters),
                                    colours: JSON.stringify(colours),
                                    shortName: values.shortName,
                                    longName: values.longName,
                                    startDate: values.startDate,
                                    endDate: values.endDate
                                }
                            }
                        });
                        callSnackbar('period item created', 'success');
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
                    heading={updateValues ? 'Update an academic year' : 'Add an academic year'}>
                    <DateField
                        customClass={'accademic-year'}
                        views={['year']}
                        inputFormat={'yyyy'}
                        name="year"
                        id="year"
                        label="Starting year"
                        value={values.year}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.year}
                        touched={touched.year}
                        disabled={updateValues && true}
                    />
                    <Heading3 text={'Start and end date'} style={{ margin: '20px 0' }} />
                    <DateField
                        name="startDate"
                        label="Start date"
                        md={12}
                        lg={12}
                        value={values.startDate}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.startDate}
                        touched={touched.startDate}
                    />
                    <br />
                    <DateField
                        name="endDate"
                        label="End date"
                        md={12}
                        lg={12}
                        value={values.endDate}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.endDate}
                        touched={touched.endDate}
                    />
                    <Heading3 text={'Name'} style={{ margin: '20px 0' }} />
                    <InputField
                        name="shortName"
                        value={values.shortName}
                        error={errors.shortName}
                        touched={touched.shortName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Short Name"
                        type="text"
                    />
                    <InputField
                        name="longName"
                        value={values.longName}
                        error={errors.longName}
                        touched={touched.longName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Long Name"
                        type="text"
                    />
                    <Heading3 text={'Characters'} style={{ margin: '20px 0' }} />

                    <CommonSelectField
                        label={'Character One'}
                        options={Object.entries(PupilMathscotsCharacter).map((item) => ({ value: item[1], key: item[0] }))}
                        value={values.characterOne}
                        name="characterOne"
                        error={errors.characterOne}
                        touched={touched.characterOne}
                        onChange={(e) => {
                            handleChange({
                                target: { name: 'characterOne', value: e.target.value }
                            });
                        }}
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'characterOne', value: e.target.value }
                            })
                        }
                    />

                    <CommonSelectField
                        label="Character Two"
                        options={Object.entries(PupilMathscotsCharacter).map((item) => ({ value: item[1], key: item[0] }))}
                        value={values.characterTwo}
                        name="characterTwo"
                        error={errors.characterTwo}
                        touched={touched.characterTwo}
                        freeSolo={true}
                        onChange={(e) =>
                            handleChange({
                                target: { name: 'characterTwo', value: e.target.value }
                            })
                        }
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'characterTwo', value: e.target.value }
                            })
                        }
                    />

                    <CommonSelectField
                        label="Character Three"
                        options={Object.entries(PupilMathscotsCharacter).map((item) => ({ value: item[1], key: item[0] }))}
                        value={values.characterThree}
                        name="characterThree"
                        error={errors.characterThree}
                        touched={touched.characterThree}
                        freeSolo={true}
                        onChange={(e) =>
                            handleChange({
                                target: { name: 'characterThree', value: e.target.value }
                            })
                        }
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'characterThree', value: e.target.value }
                            })
                        }
                    />
                    <Heading3 text={'Colours'} style={{ margin: '20px 0' }} />
                    <CommonSelectField
                        label={'Colour One'}
                        options={Object.entries(PupilMathscotsColour).map((item) => ({ value: item[1], key: item[0] }))}
                        value={values.colourOne}
                        name="colourOne"
                        error={errors.colourOne}
                        touched={touched.colourOne}
                        freeSolo={true}
                        onChange={(e) => {
                            handleChange({
                                target: { name: 'colourOne', value: e.target.value }
                            });
                        }}
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'colourOne', value: e.target.value }
                            })
                        }
                    />
                    <CommonSelectField
                        label="Colour Two"
                        options={Object.entries(PupilMathscotsColour).map((item) => ({ value: item[1], key: item[0] }))}
                        value={values.colourTwo}
                        name="colourTwo"
                        error={errors.colourTwo}
                        touched={touched.colourTwo}
                        freeSolo={true}
                        onChange={(e) =>
                            handleChange({
                                target: { name: 'colourTwo', value: e.target.value }
                            })
                        }
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'colourTwo', value: e.target.value }
                            })
                        }
                    />
                    <CommonSelectField
                        label="Colour Three"
                        options={Object.entries(PupilMathscotsColour).map((item) => ({ value: item[1], key: item[0] }))}
                        value={values.colourThree}
                        name="colourThree"
                        error={errors.colourThree}
                        touched={touched.colourThree}
                        freeSolo={true}
                        onChange={(e) =>
                            handleChange({
                                target: { name: 'colourThree', value: e.target.value }
                            })
                        }
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'colourThree', value: e.target.value }
                            })
                        }
                    />
                    <Heading3 text={'Period'} style={{ margin: '20px 0' }} />
                    <CommonCheckBox
                        name="isCurrentPeriod"
                        checked={values.isCurrentPeriod}
                        onBlur={handleBlur}
                        onChange={handleChange}
                        label="Is current period"
                        error={errors.isCurrentPeriod}
                        touched={touched.isCurrentPeriod}
                    />
                    <CommonCheckBox
                        name="isPreviousPeriod"
                        checked={values.isPreviousPeriod}
                        onBlur={handleBlur}
                        onChange={handleChange}
                        label="Is previous period"
                        error={errors.isPreviousPeriod}
                        touched={touched.isPreviousPeriod}
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

AddAcademicYearModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    updateValues: PropTypes.bool
};

export default AddAcademicYearModal;
