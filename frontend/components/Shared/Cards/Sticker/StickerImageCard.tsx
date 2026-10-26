import { gql, useMutation } from '@apollo/client';
import SchoolIcon from '@mui/icons-material/School';
import { Grid } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useContext, useState } from 'react';

import { getAllAdminStickers, getAllStickersForSchool, getStickersForTeacher } from '../../../../graphQl/queries';
import { ADMIN } from '../../../../shared/Constant';
import { ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSticker } from '../../../../types/entities/ILwpSticker';
import UploadSticker from '../../../CreateNewSticker/UploadSticker';
import CommonListWithIcon from '../../CommonListWithIcon';
import CommonPopOver from '../../CommonPopOver';
import DialogWrapper from '../../DialogWrapper';
import Paragraph from '../../Typography/Paragraph';

export const activateDeactivateStickers = gql`
    mutation activateDeactivateStickers($id: String!, $schoolId: String, $isActive: Boolean!) {
        activateDeactivateStickers(id: $id, schoolId: $schoolId, isActive: $isActive)
    }
`;

export const duplicateSticker = gql`
    mutation duplicateSticker($id: String!, $schoolId: String) {
        duplicateSticker(id: $id, schoolId: $schoolId) {
            id
        }
    }
`;

interface StickerImageCardProps {
    xs?: number;
    md?: number;
    lg?: number;
    sticker: ILwpSticker;
    schoolId?: string;
    type: string;
}

const initialImage = {
    open: false,
    photo: ''
};

const StickerImageCard = ({ xs, md, lg, sticker, schoolId, type }: StickerImageCardProps) => {
    const [imageError, setImageError] = useState(false);
    const router = useRouter();
    const { callSnackbar, token } = useContext(ThemeContext);

    const [imageOptions, setImageOptions] = useState(initialImage);
    const refetchQueries = schoolId
        ? [
              { query: getAllStickersForSchool, variables: { schoolId } },
              { query: getStickersForTeacher, variables: { schoolId } }
          ]
        : [{ query: getAllAdminStickers }];

    const [activateDeactivateStickersMutation] = useMutation(activateDeactivateStickers, { refetchQueries, awaitRefetchQueries: true });

    const [duplicateStickerMutation] = useMutation(duplicateSticker, { refetchQueries, awaitRefetchQueries: true });

    const handleError = () => {
        setImageError(true);
    };

    const activeAndInactive = async (isActive: boolean): Promise<void> => {
        const variables: { id: string; isActive: boolean; schoolId?: string } = {
            id: sticker.id,
            isActive
        };

        if (schoolId) variables.schoolId = schoolId;

        try {
            await activateDeactivateStickersMutation({ variables });
            callSnackbar('Update successful!', 'success');
        } catch (error) {
            callSnackbar(error, 'error');
        }
    };

    const duplicateStickerHandler = async (): Promise<void> => {
        const variables: { id: string; schoolId?: string } = {
            id: sticker.id
        };

        if (schoolId) variables.schoolId = schoolId;

        try {
            await duplicateStickerMutation({ variables });
            callSnackbar('Duplicate successful!', 'success');
        } catch (error) {
            callSnackbar(error, 'error');
        }
    };

    const list: Array<{ text: string; icon: string; visible: boolean; dataTest?: string; onClick: () => void }> = [
        {
            text: 'Edit',
            icon: 'edit',
            visible: schoolId ? sticker?.school?.id === schoolId : token?.userType === ADMIN,
            dataTest: 'edit-sticker-option',
            onClick: () => {
                if (sticker.label) {
                    // If the sticker has an associated school, it means either the admin is trying to edit the school's sticker or the school itself is editing the sticker.
                    if (sticker?.school) {
                        router.push(`/school/${schoolId}/settings/stickers/create-sticker/${sticker.id}`);
                    } else {
                        router.push(`/admin/stickers/create-sticker/${sticker.id}`);
                    }
                } else {
                    setImageOptions({
                        open: true,
                        photo: sticker?.imageUrl
                    });
                }
            }
        },
        {
            text: 'Create a copy',
            icon: 'content_copy',
            onClick: () => duplicateStickerHandler(),
            visible: true,
            dataTest: 'create-a-copy-sticker-option'
        },
        {
            text: 'Deactivate',
            icon: 'block',
            onClick: () => activeAndInactive(false),
            visible: type === 'active'
        },
        {
            text: 'Activate',
            icon: 'check_circle',
            onClick: () => activeAndInactive(true),
            visible: type === 'deactivated'
        }
    ].filter((list) => list.visible);

    return (
        <>
            <Grid
                maxWidth={184}
                width="100%"
                border={'1px solid #D6D1CB'}
                borderRadius={2}
                className={`${sticker.alt} sticker-image-card`}
                justifyContent={'center'}
                xs={xs}
                md={md}
                lg={lg}
                padding={1.5}>
                <Grid container justifyContent={'space-between'} className="cp" marginBottom={'4px'}>
                    <span>{sticker?.school ? <SchoolIcon /> : null}</span>
                    <CommonPopOver icon="more_vert">
                        <CommonListWithIcon list={list} />
                    </CommonPopOver>
                </Grid>
                <Grid container justifyContent={'center'} alignContent={'center'} className="image-container">
                    {imageError ? (
                        <Paragraph text={`Sticker: ${sticker.alt}`} centerText />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sticker.imageUrl} alt={sticker.alt} onError={handleError} />
                    )}
                </Grid>
            </Grid>
            {imageOptions?.open ? (
                <DialogWrapper open={imageOptions?.open} setOpen={() => setImageOptions({ ...initialImage, open: false })}>
                    <UploadSticker
                        onCancel={() => {
                            setImageOptions(initialImage);
                        }}
                        setImageOptions={setImageOptions}
                        imageOptions={imageOptions}
                        sticker={sticker}
                    />
                </DialogWrapper>
            ) : null}
        </>
    );
};

export default StickerImageCard;
