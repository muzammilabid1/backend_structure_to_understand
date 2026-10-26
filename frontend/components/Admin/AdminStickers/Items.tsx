import React from 'react';

import { StickerCharacterItemType } from '../../../shared/Constant';
import CharacterItems from './CharacterItems';

const Items = () => {
    return <CharacterItems itemType={StickerCharacterItemType.ITEM} />;
};

export default Items;
