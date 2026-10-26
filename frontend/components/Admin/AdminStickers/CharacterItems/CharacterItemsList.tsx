/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import React, { useContext, useState } from 'react';

import { getStickerAssetsByTypeForAdmin } from '../../../../graphQl/queries';
import { ThemeContext } from '../../../../shared/Services/handler';
import { ILwpStickerCharacterItem } from '../../../../types/entities/ILwpStickerCharacterItem';
import AddImageCard from '../../../Shared/Cards/Sticker/AddImageCard';
import CharacterItemListCard from './CharacterItemCard';
import UploadCharacterItemImage from './UploadCharacterItemImage';

interface CharacterItemsListProps {
    type: string;
    data: ILwpStickerCharacterItem[];
    itemType: string;
}

type ActionItem = {
    text: string;
    icon: string;
    onClick: () => void;
};

export interface ImageOptionsTypes {
    open: boolean;
    photo: string;
    alt: string;
    id: string;
    fileName: string;
    isUpdate: boolean;
}

const initialImage = {
    open: false,
    photo: '',
    alt: '',
    id: '',
    fileName: '',
    isUpdate: false
};

interface listItemType {
    text: string;
    icon: string;
    onClick: () => void;
}

const updateStickerAssetStatusByAdmin = gql`
    mutation updateStickerAssetStatusByAdmin($id: String!, $isActive: Boolean!) {
        updateStickerAssetStatusByAdmin(id: $id, isActive: $isActive) {
            id
        }
    }
`;

const CharacterItemsList = ({ data, type, itemType }: CharacterItemsListProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [imageOptions, setImageOptions] = useState<ImageOptionsTypes>(initialImage);

    const [updateStickerStatusByAdminMutation] = useMutation(updateStickerAssetStatusByAdmin);

    const commonActions = (item: any): ActionItem[] => {
        return [
            {
                text: 'Edit',
                icon: 'add',
                onClick: () =>
                    setImageOptions({
                        open: true,
                        photo: item?.imageUrl,
                        alt: item?.alt,
                        fileName: item?.fileName,
                        isUpdate: true,
                        id: item?.id
                    })
            }
        ];
    };

    const list = (item: ILwpStickerCharacterItem): { active: listItemType[]; deactivated: listItemType[] } => ({
        active: [
            ...commonActions(item),
            {
                text: 'Deactivate',
                icon: 'block',
                onClick: () => activeAndInactive(item?.id, false)
            }
        ],
        deactivated: [
            ...commonActions(item),
            {
                text: 'Activate',
                icon: 'check_circle',
                onClick: () => activeAndInactive(item?.id, true)
            }
        ]
    });

    const activeAndInactive = async (id: string, isActive: boolean): Promise<void> => {
        try {
            await updateStickerStatusByAdminMutation({
                variables: {
                    id,
                    isActive
                },
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

            callSnackbar('Update successful!', 'success');
        } catch (error) {
            callSnackbar(error, 'error');
        }
    };

    return (
        <Grid container gap={'22px'}>
            {type === 'active' && (
                <AddImageCard title={`Add ${itemType.toLowerCase()}`} onClick={() => setImageOptions({ ...initialImage, open: true })} />
            )}

            {data?.map((item) => (
                <CharacterItemListCard
                    type={itemType}
                    alt={item.alt}
                    fileName={item.fileName}
                    imageUrl={item.imageUrl}
                    list={list(item)[type]}
                    key={item.id}
                />
            ))}

            {imageOptions?.open ? (
                <UploadCharacterItemImage
                    itemType={itemType}
                    setImageOptions={setImageOptions}
                    imageOptions={imageOptions}
                    initialImage={initialImage}
                />
            ) : null}
        </Grid>
    );
};

export default CharacterItemsList;
