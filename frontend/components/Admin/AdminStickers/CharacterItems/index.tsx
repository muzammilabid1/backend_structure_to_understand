import { useQuery } from '@apollo/client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Collapse, Grid } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { getStickerAssetsByTypeForAdmin } from '../../../../graphQl/queries';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpStickerCharacterItem } from '../../../../types/entities/ILwpStickerCharacterItem';
import CommonLoading from '../../../Shared/CommonLoading';
import Heading1 from '../../../Shared/Typography/Heading1';
import CharacterItemsList from './CharacterItemsList';

interface SectionProps {
    title: string;
    data: ILwpStickerCharacterItem[];
    isOpen: boolean;
    toggleOpen: () => void;
    itemType: string;
}

const Section = ({ title, itemType, data, isOpen, toggleOpen }: SectionProps) => (
    <>
        <Grid container alignItems={'center'} gap={1} onClick={toggleOpen} className="cp">
            <ExpandMoreIcon sx={{ rotate: isOpen ? '' : '180deg', fontSize: 30 }} />
            <Heading1 text={title} customClass="fs20" />
        </Grid>
        <Collapse in={isOpen}>
            <br />
            <CharacterItemsList data={data} type={title.toLowerCase()} itemType={itemType} />
        </Collapse>
        <br />
    </>
);

interface CharacterItemsProps {
    itemType: string;
}

const CharacterItems = ({ itemType }: CharacterItemsProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const {
        error: activeAssetsError,
        loading: activeAssetsLoading,
        data: activeAssets
    } = useQuery(getStickerAssetsByTypeForAdmin, {
        variables: {
            isActive: true,
            type: itemType
        }
    });

    const {
        error: inActiveAssetsError,
        loading: inActiveAssetsLoading,
        data: inActiveAssets
    } = useQuery(getStickerAssetsByTypeForAdmin, {
        variables: {
            isActive: false,
            type: itemType
        }
    });

    const [open, setOpen] = useState({ active: true, inactive: true, archived: false });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, activeAssetsError);
        handleErrorSnackbar(callSnackbar, inActiveAssetsError);
    }, [activeAssetsError, inActiveAssetsError]);

    const toggleSection = (section: string) => {
        setOpen((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    if (activeAssetsLoading || inActiveAssetsLoading) return <CommonLoading />;

    return (
        <div>
            <Section
                title="Active"
                data={activeAssets?.getStickerAssetsByTypeForAdmin}
                isOpen={open.active}
                toggleOpen={() => toggleSection('active')}
                itemType={itemType}
            />
            <Section
                title="Deactivated"
                data={inActiveAssets?.getStickerAssetsByTypeForAdmin}
                isOpen={open.inactive}
                toggleOpen={() => toggleSection('inactive')}
                itemType={itemType}
            />
        </div>
    );
};

export default CharacterItems;
