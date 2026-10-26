/* eslint-disable @next/next/no-img-element */
import { useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { addPupilMathscot, previewPupilMathscotForEditMathscot, updatePupilMathscot } from '../../../graphQl/mutations';
import { allMathscotItem, getPupilForEditPupilMathscot } from '../../../graphQl/queries';
import { DEFAULT_EMPTY_IMAGE, unexpectedError } from '../../../shared/Constant';
import { capitalizeFirstLetter, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonLoading from './../../Shared/CommonLoading';
import CommonMultiSelect from './../../Shared/CommonMultiSelect';
import CommonSelectField from './../../Shared/CommonSelectField';
import Heading1 from './../../Shared/Typography/Heading1';
import Heading2 from './../../Shared/Typography/Heading2';
import { getPupilForTeacherForChildDetails } from '.';

const EditPupilMathscot = ({ pupilId }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [pupilMathscotImage, setPupilMathscotImage] = useState('');

    const [previewPupilMathscotForEditMathscotMutation, { loading: mathscotLoading }] = useMutation(previewPupilMathscotForEditMathscot);
    const [updatePupilMathscotMutation, { loading: updatePupilMathscotLoading }] = useMutation(updatePupilMathscot, {
        refetchQueries: [
            { query: getPupilForEditPupilMathscot, variables: { id: pupilId } },
            { query: getPupilForTeacherForChildDetails, variables: { id: pupilId } }
        ],
        awaitRefetchQueries: true
    });
    const [addPupilMathscotMutation, { loading: addPupilMathscotLoading }] = useMutation(addPupilMathscot, {
        refetchQueries: [
            { query: getPupilForEditPupilMathscot, variables: { id: pupilId } },
            { query: getPupilForTeacherForChildDetails, variables: { id: pupilId } }
        ],
        awaitRefetchQueries: true
    });
    const {
        loading,
        error,
        data: pupil
    } = useQuery(getPupilForEditPupilMathscot, {
        variables: { id: pupilId }
    });

    const { error: allMathscotItemError, data: mathscotItems } = useQuery(allMathscotItem);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        allMathscotItemError?.message && callSnackbar(allMathscotItemError, 'error');
    }, [allMathscotItemError]);

    useEffect(() => {
        pupil &&
            setPupilMathscotImage(pupil?.['pupil']?.mathscotUrl?.bigImage ? pupil?.['pupil']?.mathscotUrl?.bigImage : DEFAULT_EMPTY_IMAGE);
    }, [pupil]);

    const getPupilMathscotItems = () => {
        const pupilItems = [];

        if (pupil && pupil?.pupil?.currentMathscot?.items?.length > 0 && mathscotItems) {
            for (const item of pupil.pupil.currentMathscot.items) {
                const foundItem = mathscotItems?.['allMathscotItem']?.find((mathscotItem) => mathscotItem?.id === item);

                if (!foundItem) continue;

                pupilItems.push({ value: `${foundItem?.theme ?? '-'}:${foundItem?.name ?? '-'}`, key: foundItem?.id });
            }
        }

        return pupilItems;
    };

    const onPreviewClick = ({ items, colour, character }) => {
        previewPupilMathscotForEditMathscotMutation({
            variables: {
                input: {
                    pupilId: pupil?.['pupil']?.id,
                    itemIds: items,
                    character: character,
                    colour: colour
                }
            }
        })
            .then(({ data }) => {
                setPupilMathscotImage(data?.['previewPupilMathscot'] ? data?.['previewPupilMathscot'] : DEFAULT_EMPTY_IMAGE);
            })
            .catch(({ ...err }) => {
                callSnackbar(err, 'error');
            });
    };

    if (loading) return <CommonLoading />;

    return (
        <div className="edit-pupil-mathscot-container" data-test={'edit-pupil-mathscot-section'}>
            <Heading1 customClass="heading1" text="Edit Mathscot" />
            <div className="edit-pupil-mathscot-sections">
                <div className="edit-pupil-mathscot-input-section">
                    <Formik
                        initialValues={{
                            character: pupil?.['pupil']?.currentMathscot?.character,
                            colour: pupil?.['pupil']?.currentMathscot?.colour,
                            items: getPupilMathscotItems()
                        }}
                        onSubmit={async (values) => {
                            try {
                                const { character, colour, items } = values;

                                if (!pupil?.['pupil']?.currentMathscot) {
                                    await addPupilMathscotMutation({
                                        variables: {
                                            input: {
                                                pupilId: pupil?.['pupil']?.id,
                                                itemIds: items.map((item) => item?.key),
                                                character,
                                                colour
                                            }
                                        }
                                    })
                                        .then(() => {
                                            callSnackbar('Mathscot created successfully!', 'success');
                                        })
                                        .catch(({ ...err }) => {
                                            callSnackbar(err, 'error');
                                        });
                                } else {
                                    await updatePupilMathscotMutation({
                                        variables: {
                                            input: {
                                                id: pupil?.['pupil']?.currentMathscot?.id,
                                                itemIds: items.map((item) => item?.key),
                                                character,
                                                colour
                                            }
                                        }
                                    })
                                        .then(() => callSnackbar('Mathscot has been updated.', 'success'))
                                        .catch(({ ...err }) => callSnackbar(err, 'error'));
                                }
                            } catch (error) {
                                const statusCode =
                                    error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                                if (statusCode) {
                                    callSnackbar(error, 'error');
                                } else {
                                    window.newrelic?.noticeError(error, { caught: true, handled: false });
                                    callSnackbar(unexpectedError, 'error');
                                }
                            }
                        }}>
                        {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                            return (
                                <Form className="mt10">
                                    <CommonSelectField
                                        label={'Character type'}
                                        options={pupil?.['pupil']?.school?.curentPeriod?.characters?.map((ch) => ({
                                            key: ch,
                                            value: capitalizeFirstLetter(ch)
                                        }))}
                                        value={values.character}
                                        error={errors.character}
                                        touched={touched.character}
                                        onChange={(e) => {
                                            handleChange({
                                                target: { name: 'character', value: e.target.value }
                                            });
                                        }}
                                        onBlur={(e) =>
                                            handleBlur({
                                                target: { name: 'character', value: e.target.value }
                                            })
                                        }
                                    />
                                    <CommonSelectField
                                        label={'Character colour'}
                                        options={pupil?.['pupil']?.school?.curentPeriod?.colours?.map((cl) => ({
                                            key: cl,
                                            value: capitalizeFirstLetter(cl)
                                        }))}
                                        value={values.colour}
                                        error={errors.colour}
                                        touched={touched.colour}
                                        onChange={(e) =>
                                            handleChange({
                                                target: { name: 'colour', value: e.target.value }
                                            })
                                        }
                                        onBlur={(e) =>
                                            handleBlur({
                                                target: { name: 'colour', value: e.target.value }
                                            })
                                        }
                                    />

                                    <CommonMultiSelect
                                        value={values.items}
                                        options={(mathscotItems?.['allMathscotItem'] || []).map((item) => ({
                                            value: `${item?.theme ?? '-'}:${item?.name ?? '-'}`,
                                            key: item?.id
                                        }))}
                                        label="Items"
                                        name="items"
                                        error={errors.items}
                                        touched={touched.items}
                                        onChange={(value) =>
                                            handleChange({
                                                target: { name: 'items', value: value }
                                            })
                                        }
                                        onBlur={(value) =>
                                            handleBlur({
                                                target: { name: 'items', value: value }
                                            })
                                        }
                                    />

                                    <div className="edit-pupil-mathscot-buttons">
                                        <LWPButton
                                            customClass="preview-button"
                                            color="inherit"
                                            btnText="Preview"
                                            disabled={!values.character || !values.colour}
                                            onClick={() =>
                                                onPreviewClick({
                                                    items: values?.items?.map((item) => item?.key),
                                                    character: values?.character,
                                                    colour: values?.colour
                                                })
                                            }
                                        />
                                        <LWPButton
                                            disabled={!values.character || !values.colour}
                                            btnText={!pupil?.['pupil']?.currentMathscot ? 'Add mathscot' : 'Update mathscot'}
                                            loading={updatePupilMathscotLoading || addPupilMathscotLoading}
                                            onClick={handleSubmit}
                                        />
                                    </div>
                                </Form>
                            );
                        }}
                    </Formik>
                </div>
                <div className="edit-pupil-mathscot-preview-section">
                    <Heading2 text="Preview" />
                    <div className="preview-image">
                        {mathscotLoading ? <CommonLoading /> : <img src={pupilMathscotImage} alt="complex" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

EditPupilMathscot.propTypes = {
    pupilId: PropTypes.number
};

export default EditPupilMathscot;
