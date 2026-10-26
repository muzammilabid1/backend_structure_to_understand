import { Grid } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useState } from 'react';

import { ILwpSticker } from '../../../types/entities/ILwpSticker';
import UploadSticker from '../../CreateNewSticker/UploadSticker';
import AddImageCard from '../Cards/Sticker/AddImageCard';
import StickerImageCard from '../Cards/Sticker/StickerImageCard';
import DialogWrapper from '../DialogWrapper';

interface ActiveInActiveStickersProps {
    type: string;
    data: ILwpSticker[];
}

export interface ImageOptionsTypes {
    open: boolean;
    photo: string;
    alt: string;
    id: string;
    fileName: string;
}

const initialImage = {
    open: false,
    photo: '',
    alt: '',
    id: '',
    fileName: ''
};

const ActiveInActiveStickers = ({ data, type }: ActiveInActiveStickersProps) => {
    const router = useRouter();
    const [imageOptions, setImageOptions] = useState<ImageOptionsTypes>(initialImage);
    const queryParam = useParams();

    const schoolId = queryParam?.school_id as string;

    return (
        <Grid container gap={'22px'}>
            {type === 'active' && (
                <AddImageCard
                    title="Add sticker"
                    onClick={() =>
                        schoolId
                            ? router.push(`/school/${schoolId}/settings/stickers/create-sticker`)
                            : router.push('/admin/stickers/create-sticker')
                    }
                />
            )}

            {data?.map((item: ILwpSticker, ind: number) => <StickerImageCard key={ind} sticker={item} schoolId={schoolId} type={type} />)}
            <DialogWrapper contentWidth="625px" open={imageOptions?.open} setOpen={() => setImageOptions({ ...initialImage, open: false })}>
                <UploadSticker
                    onCancel={() => {
                        setImageOptions(initialImage);
                    }}
                    setImageOptions={setImageOptions}
                    imageOptions={imageOptions}
                />
            </DialogWrapper>
        </Grid>
    );
};

export default ActiveInActiveStickers;
