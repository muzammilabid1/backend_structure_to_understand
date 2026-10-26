import { Grid } from '@mui/material';
import { useState } from 'react';

import { capitalizeFirstLetter } from '../../../../shared/Services/handler';
import CommonListWithIcon from '../../../Shared/CommonListWithIcon';
import CommonPopOver from '../../../Shared/CommonPopOver';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface ListItem {
    text: string;
    icon: string;
    onClick: () => void;
}

interface CharacterItemCardProps {
    list: ListItem[];
    alt: string;
    imageUrl: string;
    fileName: string;
    type: string;
}

const CharacterItemCard = ({ list, alt, imageUrl, fileName, type }: CharacterItemCardProps) => {
    const [imageError, setImageError] = useState(false);
    const handleError = () => {
        setImageError(true);
    };

    return (
        <Grid
            maxWidth={184}
            width={'100%'}
            border={'1px solid #D6D1CB'}
            padding={1}
            borderRadius={2}
            className={`${alt} sticker-character-item-card`}
            justifyContent={'center'}>
            <Grid container justifyContent={'flex-end'} className="cp" marginBottom={'4px'}>
                <CommonPopOver icon="more_vert">
                    <CommonListWithIcon list={list} />
                </CommonPopOver>
            </Grid>
            <Grid container justifyContent={'center'} alignContent={'center'} className="image-container">
                {imageError ? (
                    <Paragraph text={`${capitalizeFirstLetter(type)}: ${alt}`} centerText />
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={fileName} onError={handleError} />
                )}
            </Grid>
        </Grid>
    );
};

export default CharacterItemCard;
