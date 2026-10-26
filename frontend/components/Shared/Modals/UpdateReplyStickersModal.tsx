import { useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { useMemo, useState } from 'react';

import { getStickersForTeacherForFeedbackReply } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { ILwpSticker } from '../../../types/entities/ILwpSticker';
import LWPButton from '../Button/LWPButton';
import CommonLoading from '../CommonLoading';
import CommonStatus from '../CommonStatus';
import DialogWrapper from '../DialogWrapper';
import Heading2 from '../Typography/Heading2';

interface UpdateReplyStickersModalProps {
    open: boolean;
    onClose: () => void;
    schoolId: string;
    updateFeedBackReplyLoading: boolean;
    handleUpdateReply: ({ stickerId }: { stickerId: string }) => void;
    sticker: ILwpSticker;
}

const UpdateReplyStickersModal = ({
    open,
    onClose,
    schoolId,
    handleUpdateReply,
    updateFeedBackReplyLoading,
    sticker
}: UpdateReplyStickersModalProps) => {
    const [selectedStickerId, setSelectedStickerId] = useState(sticker?.id);

    const { loading, data } = useQuery(getStickersForTeacherForFeedbackReply, {
        variables: { schoolId }
    });

    const stickers: ILwpSticker[] = useMemo(() => {
        if (!data?.getStickersForTeacher) return [];

        const activeStickers: ILwpSticker[] = [...data.getStickersForTeacher];
        /**
         * If the sticker in the feedback which is not active, during update we will display it in the first
         */

        if (!activeStickers.some((item) => item.id === sticker.id)) {
            activeStickers.unshift(sticker);
        }

        return activeStickers;
    }, [data, sticker]);

    return (
        <DialogWrapper open={open} contentWidth="850px" onClose={onClose}>
            <Grid container rowGap={3} flexDirection={'column'}>
                <Heading2 text="Edit Sticker" />
                {stickers?.length > 0 || loading ? (
                    loading ? (
                        <CommonLoading />
                    ) : (
                        <Grid container className="select-image-container">
                            {stickers.map((item: ILwpSticker, reviewIndex: number) => (
                                <Grid
                                    item
                                    key={reviewIndex}
                                    xs={4}
                                    sm={3}
                                    className={`item-image ${selectedStickerId == item.id ? 'item-image-active' : ''}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item?.imageUrl} alt={item?.alt} onClick={() => setSelectedStickerId(item.id)} />
                                </Grid>
                            ))}
                        </Grid>
                    )
                ) : (
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        heading={'Nothing to show here'}
                    />
                )}
                <Grid container justifyContent={'flex-end'} gap={2}>
                    <LWPButton color="inherit" btnText="Close" onClick={onClose} disabled={updateFeedBackReplyLoading} />
                    {stickers?.length > 0 && (
                        <LWPButton
                            btnText="Save"
                            onClick={() => handleUpdateReply({ stickerId: selectedStickerId })}
                            loading={updateFeedBackReplyLoading}
                        />
                    )}
                </Grid>
            </Grid>
        </DialogWrapper>
    );
};

export default UpdateReplyStickersModal;
