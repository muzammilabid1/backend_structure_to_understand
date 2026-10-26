/* eslint-disable @next/next/no-img-element */
import { gql, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import React, { useContext } from 'react';

import { getStickerAssetsByTypeForAdmin } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, StickerCharacterItemType } from '../../../../shared/Constant';
import { _getBase64ToFile, ThemeContext } from '../../../../shared/Services/handler';
import { editStickerImageValidation } from '../../../../shared/validations';
import UploadFile from '../../../Parent/UploadFile';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonError from '../../../Shared/CommonError';
import DialogWrapper from '../../../Shared/DialogWrapper';
import ImageEditor from '../../../Shared/ImageEditor';
import InputField from '../../../Shared/InputField/InputField';
import Heading2 from '../../../Shared/Typography/Heading2';
import { ImageOptionsTypes } from './CharacterItemsList';

const createStickerAsset = gql`
    mutation createStickerAsset($input: CreateStickerCharacterItemInput!, $file: Upload!) {
        createStickerAsset(input: $input, file: $file) {
            id
        }
    }
`;

const updateStickerAsset = gql`
    mutation updateStickerAsset($input: UpdateStickerCharacterItemInput!, $file: Upload) {
        updateStickerAsset(input: $input, file: $file) {
            id
        }
    }
`;

interface UploadCharacterItemImageProps {
    itemType: string;
    setImageOptions: React.Dispatch<React.SetStateAction<ImageOptionsTypes>>;
    imageOptions: ImageOptionsTypes;
    initialImage: ImageOptionsTypes;
}

const UploadCharacterItemImage = ({ imageOptions, setImageOptions, initialImage, itemType }: UploadCharacterItemImageProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [createStickerAssetMutation, { loading }] = useMutation(createStickerAsset, {
        refetchQueries: [
            {
                query: getStickerAssetsByTypeForAdmin,
                variables: {
                    isActive: true,
                    type: itemType
                }
            },
            {
                query: getStickerAssetsByTypeForAdmin,
                variables: {
                    isActive: false,
                    type: itemType
                }
            }
        ],
        awaitRefetchQueries: true
    });

    const [updateStickerAssetMutation, { loading: updateStickerLoading }] = useMutation(updateStickerAsset, {
        refetchQueries: [
            {
                query: getStickerAssetsByTypeForAdmin,
                variables: {
                    isActive: true,
                    type: itemType
                }
            },
            {
                query: getStickerAssetsByTypeForAdmin,
                variables: {
                    isActive: false,
                    type: itemType
                }
            }
        ],
        awaitRefetchQueries: true
    });

    return (
        <DialogWrapper open={imageOptions?.open} setOpen={() => setImageOptions({ ...initialImage, open: false })} contentWidth="625px">
            <Formik
                initialValues={{
                    fileName: '',
                    photo: null,
                    alt: imageOptions?.alt,
                    isPhoto: !!imageOptions?.photo
                }}
                enableReinitialize
                validationSchema={editStickerImageValidation}
                onSubmit={async (values): Promise<void> => {
                    try {
                        const file = values?.photo ? _getBase64ToFile(values.photo, values?.fileName) : null;

                        if (imageOptions?.isUpdate) {
                            await updateStickerAssetMutation({
                                variables: {
                                    input: {
                                        alt: values?.alt,
                                        id: imageOptions?.id
                                    },
                                    file
                                }
                            });
                            callSnackbar('Update successful!', 'success');
                        } else {
                            await createStickerAssetMutation({
                                variables: {
                                    input: {
                                        alt: values?.alt,
                                        type: itemType
                                    },
                                    file
                                }
                            });
                            callSnackbar('Add successful!', 'success');
                        }

                        setImageOptions(initialImage);
                    } catch (error) {
                        callSnackbar(error, 'error');
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched, resetForm, setFieldValue }) => (
                    <Grid width={560}>
                        <Grid container justifyContent={'space-between'} alignItems={'center'} marginBottom={'24px'}>
                            <Heading2 text={`${imageOptions.isUpdate ? 'Edit' : 'Add'} ${itemType.toLowerCase()}`} />
                            {(values?.photo || imageOptions?.photo) && (
                                <LWPButton
                                    color="inherit"
                                    variant="text"
                                    btnText="Remove"
                                    onClick={() => {
                                        setImageOptions((pre) => ({ ...pre, photo: '' }));
                                        resetForm();
                                    }}
                                    startIcon="delete"
                                />
                            )}
                        </Grid>
                        <InputField
                            name="alt"
                            value={values.alt}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.alt}
                            touched={touched.alt}
                            label="Alt"
                            type="text"
                            helperText="A brief description of the contents of this image"
                            md={12}
                            lg={12}
                        />
                        {values?.photo ? (
                            <ImageEditor
                                src={values?.photo?.preview}
                                onSave={(croppedImage) =>
                                    setFieldValue('photo', croppedImage).then(() => {
                                        handleSubmit();
                                    })
                                }
                                onCancel={() => setImageOptions(initialImage)}
                                loading={loading || updateStickerLoading}
                                convertToJpeg={false}
                                aspectRatio={StickerCharacterItemType.CHARACTER === itemType ? 1 / 1 : 35 / 12}
                            />
                        ) : (
                            <Grid>
                                {imageOptions?.photo ? (
                                    <Grid container justifyContent={'center'}>
                                        <img src={imageOptions?.photo} alt={imageOptions?.alt} />
                                    </Grid>
                                ) : (
                                    <>
                                        <UploadFile
                                            heading=""
                                            showIcon={false}
                                            isCropper={false}
                                            isShowCancelIcon={false}
                                            setFileName={(e: string) => handleChange({ target: { name: 'fileName', value: e } })}
                                            onSave={(croppedImage) => {
                                                setFieldValue('photo', croppedImage);
                                            }}>
                                            <Grid
                                                container
                                                flexDirection={'column'}
                                                gap={'24px'}
                                                padding={`30px 0`}
                                                justifyContent={'center'}>
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/sticker_icon.svg`}
                                                    alt="sticker_icon"
                                                    width={192}
                                                    height={192}
                                                />
                                                <LWPButton color="inherit" btnText="Upload a photo" sx={{ width: 'auto !important' }} />
                                            </Grid>
                                        </UploadFile>
                                        <CommonError error={errors?.photo} touched={touched?.photo} />
                                    </>
                                )}

                                <Grid container gap={1} justifyContent={'flex-end'} marginTop={'24px'}>
                                    <LWPButton
                                        customClass="cancel_btn"
                                        variant="text"
                                        onClick={() => setImageOptions(initialImage)}
                                        btnText="Cancel"
                                        color="inherit"
                                        disabled={loading || updateStickerLoading}
                                    />
                                    <LWPButton
                                        color="primary"
                                        btnText={imageOptions?.id ? 'Save' : 'Add'}
                                        onClick={handleSubmit}
                                        loading={loading || updateStickerLoading}
                                    />
                                </Grid>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Formik>
        </DialogWrapper>
    );
};

export default UploadCharacterItemImage;
