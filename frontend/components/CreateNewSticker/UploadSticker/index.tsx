/* eslint-disable @next/next/no-img-element */
import { gql, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useContext } from 'react';

import { getAllAdminStickers, getAllStickersForSchool } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { _getBase64ToFile, ThemeContext } from '../../../shared/Services/handler';
import { editStickerImageValidation } from '../../../shared/validations';
import { ILwpSticker } from '../../../types/entities/ILwpSticker';
import UploadFile from '../../Parent/UploadFile';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonError from '../../Shared/CommonError';
import ImageEditor from '../../Shared/ImageEditor';
import InputField from '../../Shared/InputField/InputField';
import Heading2 from '../../Shared/Typography/Heading2';

const uploadSticker = gql`
    mutation uploadSticker($alt: String!, $file: Upload!, $schoolId: String) {
        uploadSticker(alt: $alt, file: $file, schoolId: $schoolId) {
            id
        }
    }
`;

const editUploadedSticker = gql`
    mutation editUploadedSticker($input: UpdateStickerInput!, $file: Upload) {
        editUploadedSticker(input: $input, file: $file) {
            id
        }
    }
`;

interface ImageOptions {
    open: boolean;
    photo: string;
}

interface UploadStickerProps {
    onCancel: () => void;
    setImageOptions?: React.Dispatch<React.SetStateAction<ImageOptions>>;
    imageOptions?: ImageOptions;
    sticker?: ILwpSticker;
}

const UploadSticker = ({ onCancel, imageOptions, setImageOptions, sticker }: UploadStickerProps) => {
    const [uploadStickerMutation, { loading }] = useMutation(uploadSticker);
    const [updateStickerMutation, { loading: updateStickerLoading }] = useMutation(editUploadedSticker);
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const schoolId = router?.query?.school_id ?? null;

    return (
        <div className="upload-sticker">
            <Formik
                initialValues={{
                    fileName: '',
                    photo: null,
                    alt: sticker?.alt,
                    isPhoto: !!imageOptions?.photo
                }}
                enableReinitialize
                validationSchema={editStickerImageValidation}
                onSubmit={async (values) => {
                    try {
                        const file = values?.photo ? _getBase64ToFile(values.photo, values?.fileName) : null;

                        const refetchQueries = schoolId
                            ? [{ query: getAllStickersForSchool, variables: { schoolId } }]
                            : [{ query: getAllAdminStickers }];

                        if (sticker?.id) {
                            await updateStickerMutation({
                                variables: {
                                    input: {
                                        alt: values?.alt,
                                        id: sticker?.id
                                    },
                                    file
                                },
                                refetchQueries,
                                awaitRefetchQueries: true
                            });
                            onCancel();
                            callSnackbar('Update successful!', 'success');
                        } else {
                            await uploadStickerMutation({
                                variables: {
                                    schoolId,
                                    alt: values?.alt,
                                    file
                                }
                            });
                            callSnackbar('Upload successful!', 'success');

                            if (schoolId) {
                                router.push(`/school/${schoolId}/settings/stickers`);
                            } else {
                                router.push('/admin/stickers');
                            }
                        }
                    } catch (error) {
                        callSnackbar(error, 'error');
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched, resetForm, setFieldValue }) => {
                    return (
                        <Grid width="100%" maxWidth={560}>
                            {/* Image option is only available for editing an uploaded sticker */}
                            {imageOptions ? (
                                <Grid container justifyContent={'space-between'} alignItems={'center'} marginBottom={'24px'}>
                                    <Heading2 text={`Edit Sticker`} />
                                    {(values?.photo || imageOptions?.photo) && (
                                        <LWPButton
                                            color="inherit"
                                            variant="text"
                                            btnText="Remove"
                                            onClick={() => {
                                                setImageOptions((pre) => ({ ...pre, photo: null }));
                                                resetForm();
                                            }}
                                            startIcon="delete"
                                        />
                                    )}
                                </Grid>
                            ) : null}
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
                                <div className="selected-image">
                                    {!imageOptions ? (
                                        <LWPButton
                                            color="inherit"
                                            variant="text"
                                            btnText="Remove"
                                            onClick={() => {
                                                setFieldValue('photo', null);
                                            }}
                                            startIcon="delete"
                                        />
                                    ) : null}

                                    <ImageEditor
                                        src={values?.photo?.preview}
                                        onSave={(croppedImage) => {
                                            setFieldValue('photo', croppedImage).then(() => {
                                                handleSubmit();
                                            });
                                        }}
                                        onCancel={onCancel}
                                        loading={loading || updateStickerLoading}
                                        convertToJpeg={false}
                                    />
                                </div>
                            ) : (
                                <Grid>
                                    {imageOptions?.photo ? (
                                        <Grid container justifyContent={'center'}>
                                            <img src={imageOptions?.photo} alt={sticker?.alt} />
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
                                            onClick={onCancel}
                                            btnText="Cancel"
                                            color="inherit"
                                            disabled={loading || updateStickerLoading}
                                        />
                                        <LWPButton
                                            color="primary"
                                            btnText={imageOptions ? 'Save' : 'Add Sticker'}
                                            loading={loading || updateStickerLoading}
                                            onClick={handleSubmit}
                                        />
                                    </Grid>
                                </Grid>
                            )}
                        </Grid>
                    );
                }}
            </Formik>
        </div>
    );
};

export default UploadSticker;
