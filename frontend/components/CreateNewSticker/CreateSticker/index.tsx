import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useMemo } from 'react';

import { StickerCharacterItemType } from '../../../shared/Constant';
import { _getBase64ToFile, handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { createStickerValidation } from '../../../shared/validations';
import { ILwpSticker } from '../../../types/entities/ILwpSticker';
import { ILwpStickerCharacterItem } from '../../../types/entities/ILwpStickerCharacterItem';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonLoading from '../../Shared/CommonLoading';
import InputField from '../../Shared/InputField/InputField';
import Heading3 from '../../Shared/Typography/Heading3';
import SelectColor from './SelectColor';
import SelectItems from './SelectItems';
import StickerPreview from './StickerPreview';

const getStickerAssetsByTypeForSticker = gql`
    query getStickerAssetsByTypeForSticker($type: StickerCharacterItemType!) {
        getStickerAssetsByTypeForSticker(type: $type) {
            id
            fileName
            imageUrl
            alt
        }
    }
`;

const createSticker = gql`
    mutation createSticker($input: CreateStickerInput!, $file: Upload!) {
        createSticker(input: $input, file: $file) {
            id
        }
    }
`;

const editCreatedSticker = gql`
    mutation editCreatedSticker($input: EditCreatedStickerInput!, $file: Upload!) {
        editCreatedSticker(input: $input, file: $file) {
            id
        }
    }
`;

const getStickerById = gql`
    query getStickerById($id: String!) {
        getStickerById(id: $id) {
            id
            label
            textColor
            borderColor
            item {
                id
            }
            character {
                id
            }
        }
    }
`;

interface StickerInput {
    label: string;
    textColor: string;
    borderColor: string;
    itemId?: string;
    characterId?: string;
    schoolId?: string;
    stickerId?: string;
}

const CreateSticker = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();
    const queryParams = useParams();
    const searchParams = useSearchParams();

    const stickerId: string = queryParams?.sticker_id as string;

    // If the schoolId is present in the query parameters, it means either the school is creating the sticker or the admin is creating a sticker on behalf of the school.
    const schoolId: string = queryParams?.school_id as string;
    const copyStickerId: string = searchParams.get('copy_sticker_id');

    const {
        data,
        loading: getStickerLoading,
        error: getStickerError
    } = useQuery(getStickerById, {
        variables: {
            id: stickerId ?? copyStickerId
        },
        skip: !stickerId && !copyStickerId
    });

    const [createStickerMutation, { loading: createStickerLoading }] = useMutation(createSticker);
    const [editCreatedStickerMutation, { loading: editCreatedStickerLoading }] = useMutation(editCreatedSticker);

    const {
        data: activeCharactersData,
        loading,
        error
    } = useQuery(getStickerAssetsByTypeForSticker, {
        variables: {
            type: StickerCharacterItemType.CHARACTER
        }
    });
    const {
        data: activeItemsData,
        loading: activeItemsLoading,
        error: activeItemsError
    } = useQuery(getStickerAssetsByTypeForSticker, {
        variables: {
            type: StickerCharacterItemType.ITEM
        }
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, activeItemsError);
        handleErrorSnackbar(callSnackbar, getStickerError);
    }, [error, activeItemsError, getStickerError]);

    const activeCharacters: ILwpStickerCharacterItem[] = useMemo(
        () => activeCharactersData?.getStickerAssetsByTypeForSticker ?? [],
        [activeCharactersData]
    );

    const activeItems: ILwpStickerCharacterItem[] = useMemo(
        () => activeItemsData?.getStickerAssetsByTypeForSticker ?? [],
        [activeItemsData]
    );

    const sticker: ILwpSticker = useMemo(() => {
        return data?.getStickerById ?? null;
    }, [data]);

    if (activeItemsLoading || loading || getStickerLoading) return <CommonLoading />;

    return (
        <div className="create-sticker">
            <Formik
                initialValues={{
                    title: sticker?.label,
                    textColor: sticker?.textColor ?? '#ffffff',
                    borderColor: sticker?.borderColor ?? '#887DFF',
                    characterType: sticker?.character?.id ?? '',
                    itemType: sticker?.item?.id ?? '',
                    file: ''
                }}
                onSubmit={async (value): Promise<void> => {
                    try {
                        const input: StickerInput = {
                            label: value.title,
                            textColor: value.textColor,
                            borderColor: value.borderColor
                        };

                        input['itemId'] = value.itemType || null;
                        input['characterId'] = value.characterType || null;

                        if (schoolId) input['schoolId'] = schoolId;

                        const file = _getBase64ToFile(value.file, undefined /* FIXME(cj): Shouldn't we be passing a filename here? */);

                        if (stickerId) {
                            await editCreatedStickerMutation({
                                variables: {
                                    file,
                                    input: {
                                        ...input,
                                        stickerId
                                    }
                                }
                            });
                            callSnackbar('Updated successfully', 'success');
                        } else {
                            await createStickerMutation({
                                variables: {
                                    file,
                                    input
                                }
                            });
                            callSnackbar('Created successfully', 'success');
                        }

                        if (schoolId) {
                            router.push(`/school/${schoolId}/settings/stickers`);
                        } else {
                            router.push('/admin/stickers');
                        }
                    } catch (error) {
                        callSnackbar(error, 'error');
                    }
                }}
                validationSchema={createStickerValidation}>
                {({ values, errors, touched, handleChange, handleBlur, setFieldValue, handleSubmit }) => (
                    <Grid
                        container
                        gap={{
                            xs: 4,
                            sm: 0
                        }}>
                        <Grid item xs={12} md={7}>
                            <Grid flexDirection="column" container gap={1}>
                                <Grid item>
                                    <InputField
                                        name="title"
                                        value={values.title}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors.title}
                                        touched={touched.title}
                                        label="Enter text"
                                        type="text"
                                        md={12}
                                        lg={12}
                                    />
                                </Grid>
                                <Grid item>
                                    <Heading3 text="Text colour" />

                                    <SelectColor
                                        dataTest="text-colors"
                                        selectedColor={values.textColor}
                                        onChange={(color) => setFieldValue('textColor', color)}
                                    />
                                </Grid>
                                <Grid item>
                                    <Heading3 text="Border colour" />

                                    <SelectColor
                                        dataTest="border-colors"
                                        selectedColor={values.borderColor}
                                        onChange={(color) => setFieldValue('borderColor', color)}
                                    />
                                </Grid>
                                {activeCharacters?.length ? (
                                    <Grid item>
                                        <SelectItems
                                            title="Character"
                                            value={values.characterType}
                                            items={activeCharacters}
                                            onSelect={(characterId: string) => {
                                                setFieldValue('characterType', characterId);
                                            }}
                                        />
                                    </Grid>
                                ) : null}

                                {activeItems?.length ? (
                                    <Grid item>
                                        <SelectItems
                                            title="Item"
                                            value={values.itemType}
                                            items={activeItems}
                                            onSelect={(characterId: string) => {
                                                setFieldValue('itemType', characterId);
                                            }}
                                        />
                                    </Grid>
                                ) : null}
                                <Grid container gap={1} justifyContent={'flex-end'} marginTop={'24px'}>
                                    <LWPButton
                                        customClass="cancel_btn"
                                        variant="text"
                                        onClick={() => {
                                            if (schoolId) {
                                                router.push(`/school/${schoolId}/settings/stickers`);
                                            } else {
                                                router.push('/admin/stickers');
                                            }
                                        }}
                                        btnText="Cancel"
                                        color="inherit"
                                        disabled={createStickerLoading || editCreatedStickerLoading}
                                    />
                                    <LWPButton
                                        color="primary"
                                        btnText={stickerId ? 'Save' : 'Add'}
                                        onClick={handleSubmit}
                                        loading={createStickerLoading || editCreatedStickerLoading}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <StickerPreview
                                values={values}
                                activeItems={activeItems}
                                activeCharacters={activeCharacters}
                                setFieldValue={setFieldValue}
                            />
                        </Grid>
                    </Grid>
                )}
            </Formik>
        </div>
    );
};

export default CreateSticker;
