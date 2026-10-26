/* eslint-disable @next/next/no-img-element */
import HideSourceIcon from '@mui/icons-material/HideSource';
import { Grid, useMediaQuery, useTheme } from '@mui/material';
import { chunk } from 'lodash';
import { useMemo, useState } from 'react';
import Carousel from 'react-material-ui-carousel';

import { ILwpStickerCharacterItem } from '../../../../types/entities/ILwpStickerCharacterItem';
import LWPButton from '../../../Shared/Button/LWPButton';
import DialogWrapper from '../../../Shared/DialogWrapper';
import Heading2 from '../../../Shared/Typography/Heading2';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface SelectItemsProps {
    value: string;
    items: ILwpStickerCharacterItem[];
    onSelect: (id: string) => void;
    title: string;
}

const SelectItems = ({ value, onSelect, items, title }: SelectItemsProps) => {
    const theme = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const isXs = useMediaQuery(theme.breakpoints.down('md'));
    const isMd = useMediaQuery(theme.breakpoints.down('lg'));

    const activeItems: Array<ILwpStickerCharacterItem[]> = useMemo(() => {
        const active_stickers = items ?? [];

        const itemsPerSlide = isXs ? 2 : isMd ? 3 : 4;
        let output = [];

        output.push(active_stickers.slice(0, itemsPerSlide - 1));

        const remainingStickers = active_stickers.slice(itemsPerSlide - 1);
        const chunkedStickers = chunk(remainingStickers, itemsPerSlide);

        output = output.concat(chunkedStickers);

        return output;
    }, [items, isXs, isMd]);

    return (
        <div>
            <Grid container mb={1} justifyContent="space-between">
                <Grid>
                    <Heading3 text={`${title} type:`} />
                </Grid>
                {items?.length > 3 ? (
                    <Grid>
                        <Heading3 text={'View all'} customClass="cp" onClick={() => setIsOpen(true)} />
                    </Grid>
                ) : null}
            </Grid>
            <Carousel
                animation="slide"
                autoPlay={false}
                navButtonsAlwaysVisible
                navButtonsWrapperProps={{ className: 'custom_wrapper_buttons' }}
                navButtonsProps={{
                    className: 'custom_button'
                }}
                NextIcon={<span className="material-icons">navigate_next</span>}
                PrevIcon={<span className="material-icons">navigate_before</span>}>
                {activeItems.map((group: Array<ILwpStickerCharacterItem>, groupIndex: number) => (
                    <Grid
                        container
                        key={groupIndex}
                        sx={{
                            alignItems: 'center',
                            margin: '0 auto',
                            paddingLeft: 10,
                            paddingRight: 10
                        }}
                        className="select-image-container">
                        {groupIndex == 0 ? (
                            <Grid
                                display="flex"
                                flexDirection="column"
                                justifyContent="center"
                                alignItems="center"
                                item
                                gap={2}
                                xs={6}
                                md={4}
                                lg={3}
                                onClick={() => onSelect('')}
                                className={`item-image ${!value ? 'item-image-active' : ''}`}>
                                <HideSourceIcon fontSize="large" />
                                <Paragraph centerText text={`No ${title.toLowerCase()}`} />
                            </Grid>
                        ) : null}
                        {group.map((item: ILwpStickerCharacterItem, reviewIndex: number) => (
                            <Grid
                                item
                                key={reviewIndex}
                                xs={6}
                                md={4}
                                lg={3}
                                data-test={`${title}-item-image`}
                                className={`item-image ${value == item.id ? 'item-image-active' : ''}`}>
                                <img src={item?.imageUrl} alt={item?.alt} crossOrigin="anonymous" onClick={() => onSelect(item.id)} />
                            </Grid>
                        ))}
                    </Grid>
                ))}
            </Carousel>

            {isOpen ? (
                <DialogWrapper
                    contentWidth="896px"
                    className="character-item-select-dialogue"
                    open={isOpen}
                    setOpen={() => setIsOpen(false)}>
                    <Grid container rowGap={3}>
                        <Heading2 text={title} />
                        <Grid container className="select-image-container">
                            {items.map((item: ILwpStickerCharacterItem, reviewIndex: number) => (
                                <Grid
                                    item
                                    key={reviewIndex}
                                    xs={4}
                                    sm={3}
                                    className={`item-image ${value == item.id ? 'item-image-active' : ''}`}>
                                    <img src={item?.imageUrl} alt={item?.alt} onClick={() => onSelect(item.id)} />
                                </Grid>
                            ))}
                        </Grid>
                        <Grid container justifyContent={'center'}>
                            <LWPButton color="inherit" btnText="Close" onClick={() => setIsOpen(false)} />
                        </Grid>
                    </Grid>
                </DialogWrapper>
            ) : null}
        </div>
    );
};

export default SelectItems;
