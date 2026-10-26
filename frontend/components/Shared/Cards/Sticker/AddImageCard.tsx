/* eslint-disable @next/next/no-img-element */
import { Grid } from '@mui/material';

import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import LWPButton from '../../Button/LWPButton';

interface AddImageCardProps {
    title: string;
    onClick: () => void;
    xs?: number;
    md?: number;
    lg?: number;
}

const AddImageCard = ({ title, onClick, xs, lg, md }: AddImageCardProps) => {
    return (
        <Grid
            maxWidth={184}
            width={'100%'}
            border="1px solid #D6D1CB"
            padding="20px"
            borderRadius={2}
            alignItems="center"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            xs={xs}
            md={md}
            lg={lg}>
            <Grid container flexDirection="column" minHeight={'161px'} gap={3} justifyContent="center" alignItems="center">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/sticker_icon.svg`}
                    alt="Sticker"
                    height="72px"
                />
                <LWPButton size="small" btnText={title} onClick={onClick} />
            </Grid>
        </Grid>
    );
};

export default AddImageCard;
