import { useQuery } from '@apollo/client';
import React, { useContext, useEffect, useMemo } from 'react';

import { getAllAdminStickers } from '../../../../graphQl/queries';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSticker } from '../../../../types/entities/ILwpSticker';
import CommonLoading from '../../../Shared/CommonLoading';
import StickerList from '../../../Shared/StickersList';

const Stickers = () => {
    const { callSnackbar } = useContext(ThemeContext);

    const { error, loading, data } = useQuery(getAllAdminStickers);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const { active, inActive }: { active: ILwpSticker[]; inActive: ILwpSticker[] } = useMemo(() => {
        return {
            active: data?.getAllAdminStickers?.active ?? [],
            inActive: data?.getAllAdminStickers?.inActive ?? []
        };
    }, [data]);

    if (loading) return <CommonLoading />;

    return <StickerList activeStickers={active} inActiveSticker={inActive} />;
};

export default Stickers;
