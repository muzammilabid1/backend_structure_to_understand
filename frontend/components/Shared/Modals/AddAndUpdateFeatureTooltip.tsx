import { gql, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { ContentStatus, UserType } from 'lwp-shared';
import React, { useContext } from 'react';

import { unexpectedError } from '../../../shared/Constant';
import {
    _getBase64ToFile,
    _removeWhiteSpace,
    capitalizeFirstLetter,
    getErrorCode,
    handleErrorSnackbar,
    ThemeContext
} from '../../../shared/Services/handler';
import { addAndUpdateFeatureTooltipValidation } from '../../../shared/validations';
import { IStaticLwpFeatureTooltip } from '../../../types/entities/IStaticLwpFeatureTooltip';
import { allFeatureTooltips } from '../../Admin/Features/FeatureTooltips';
import CommonCheckBox from '../CommonCheckBox';
import CommonFileUpload from '../CommonFileUpload';
import CommonMultiSelect from '../CommonMultiSelect';
import CommonTag from '../CommonTag';
import DialogWrapper from '../DialogWrapper';
import InputField from './../InputField/InputField';

const updateFeatureTooltipModal = gql`
    mutation updateFeatureTooltip($input: UpdateStaticLwpFeatureTooltipInput!, $file: [Upload!]) {
        updateFeatureTooltip(input: $input, file: $file) {
            id
        }
    }
`;

const createFeatureTooltipModal = gql`
    mutation createFeatureTooltip($input: CreateStaticLwpFeatureTooltipInput!, $file: [Upload!]) {
        createFeatureTooltip(input: $input, file: $file) {
            id
        }
    }
`;

interface AddAndUpdateFeatureTooltipModalProps {
    tooltip: IStaticLwpFeatureTooltip;
    setOpenTooltip: React.Dispatch<
        React.SetStateAction<{
            open: boolean;
            tooltip: IStaticLwpFeatureTooltip;
        }>
    >;
}

const AddAndUpdateFeatureTooltip = ({ tooltip, setOpenTooltip }: AddAndUpdateFeatureTooltipModalProps) => {
    const isUpdating = tooltip?.id;
    const { callSnackbar } = useContext(ThemeContext);
    const [updateFeatureTooltipMutation, { loading: updateFeatureTooltipLoading }] = useMutation(updateFeatureTooltipModal, {
        refetchQueries: [{ query: allFeatureTooltips }],
        awaitRefetchQueries: true
    });
    const [createFeatureTooltipMutation, { loading: createFeatureTooltipLoading }] = useMutation(createFeatureTooltipModal, {
        refetchQueries: [{ query: allFeatureTooltips }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            validationSchema={addAndUpdateFeatureTooltipValidation}
            initialValues={{
                name: isUpdating ? tooltip?.name : '',
                targetId: tooltip?.targetId,
                message: isUpdating ? tooltip?.message : '',
                order: isUpdating ? tooltip?.order : '',
                status: isUpdating ? (tooltip?.status === ContentStatus.PUBLISHED ? true : false) : false,
                userTypes: isUpdating
                    ? (tooltip?.userTypes || [])?.map((userType) => ({
                          key: userType,
                          value: capitalizeFirstLetter(userType)
                      }))
                    : [],
                tooltipImageUrl: isUpdating ? tooltip?.imageUrl : null,
                tooltipImageFilename: null
            }}
            onSubmit={async (values) => {
                try {
                    let { name, targetId, message } = values;
                    const { status, userTypes, order, tooltipImageUrl, tooltipImageFilename } = values;
                    let file = null;

                    name = _removeWhiteSpace(name);
                    targetId = _removeWhiteSpace(targetId);
                    message = _removeWhiteSpace(message);

                    if (tooltipImageUrl && tooltipImageUrl.startsWith('data:')) {
                        file = _getBase64ToFile(tooltipImageUrl, `${tooltipImageFilename.trim()}`, true);
                    }

                    if (isUpdating) {
                        await updateFeatureTooltipMutation({
                            variables: {
                                input: {
                                    id: tooltip.id,
                                    name,
                                    targetId,
                                    order: +order,
                                    message,
                                    hasImage: tooltipImageUrl ? true : false,
                                    status: status ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
                                    userTypes: userTypes?.map((userType) => userType.key)
                                },
                                file
                            }
                        });
                    } else {
                        await createFeatureTooltipMutation({
                            variables: {
                                input: {
                                    name,
                                    targetId,
                                    order: +order,
                                    message,
                                    status: status ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
                                    userTypes: userTypes?.map((userType) => userType.key)
                                },
                                file
                            }
                        });
                    }

                    callSnackbar(`${isUpdating ? 'Updated' : 'Added'} tooltip successfully!`, 'success');
                    setOpenTooltip({ open: false, tooltip: null });
                } catch (error) {
                    const statusCode = getErrorCode(error);

                    if (statusCode) {
                        handleErrorSnackbar(callSnackbar, error);
                    } else {
                        window.newrelic?.noticeError(error, { caught: true, handled: false });
                        handleErrorSnackbar(callSnackbar, unexpectedError);
                    }
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, setFieldValue, errors, touched }) => {
                return (
                    <DialogWrapper
                        primaryBtnHandler={handleSubmit}
                        primaryBtnloading={updateFeatureTooltipLoading || createFeatureTooltipLoading}
                        dialogFooter
                        open={true}
                        setOpen={() => setOpenTooltip({ open: false, tooltip: null })}
                        primaryBtnText={isUpdating ? 'Update' : 'Add'}
                        primaryBtnDisabled={updateFeatureTooltipLoading || createFeatureTooltipLoading}
                        contentWidth="900px"
                        cancelBtn
                        heading={`${isUpdating ? `Update  ${tooltip?.name.toLowerCase()}` : 'Add feature toolip'}`}>
                        <Grid container display="flex" flexDirection="column" spacing={2}>
                            <Grid item>
                                <InputField
                                    name="name"
                                    value={values.name}
                                    error={errors.name}
                                    touched={touched.name}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    label="Feature name"
                                    type="text"
                                    md={12}
                                    lg={12}
                                />
                            </Grid>

                            <Grid item>
                                <InputField
                                    name="targetId"
                                    value={values.targetId}
                                    error={errors.targetId}
                                    disabled
                                    touched={touched.targetId}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    label="Target ID"
                                    type="text"
                                    md={12}
                                    lg={12}
                                />
                            </Grid>

                            <Grid item>
                                <InputField
                                    md={12}
                                    lg={12}
                                    label="Order"
                                    value={values.order}
                                    name={'order'}
                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.order}
                                    touched={touched.order}
                                />
                            </Grid>

                            <Grid item>
                                <InputField
                                    md={12}
                                    lg={12}
                                    label="Feature message"
                                    value={values.message}
                                    name="message"
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.message}
                                    touched={touched.message}
                                />
                            </Grid>

                            <Grid item>
                                <CommonMultiSelect
                                    label="User types"
                                    options={[UserType.ADMIN, UserType.TEACHER, UserType.PARENT].map((item) => ({
                                        value: capitalizeFirstLetter(item),
                                        key: item
                                    }))}
                                    value={values.userTypes}
                                    error={errors.userTypes}
                                    touched={touched.userTypes}
                                    onChange={(value) => {
                                        handleChange({
                                            target: { name: 'userTypes', value: value }
                                        });
                                    }}
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'userTypes', value: value }
                                        })
                                    }
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                        ))
                                    }
                                    md={12}
                                    lg={12}
                                    dataTest="update-feature-tooltip-userTypes-select"
                                />
                            </Grid>

                            <Grid item>
                                <CommonCheckBox
                                    name="status"
                                    checked={values.status}
                                    error={errors.status}
                                    touched={touched.status}
                                    onChange={handleChange}
                                    label="Publish"
                                />
                            </Grid>

                            <Grid item>
                                <CommonFileUpload
                                    name="tooltipImageUrl"
                                    previewImage={values.tooltipImageUrl}
                                    icon="folder"
                                    heading="Tooltip image"
                                    touched={true}
                                    onSetFileName={(fileName) => setFieldValue('tooltipImageFilename', fileName)}
                                    onClose={() => handleChange({ target: { name: 'tooltipImageUrl', value: '' } })}
                                    accept={'image/png, image/jpeg, image/jpg'}
                                    onSave={(croppedImage) => {
                                        handleChange({ target: { name: 'tooltipImageUrl', value: croppedImage } });
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

export default AddAndUpdateFeatureTooltip;
