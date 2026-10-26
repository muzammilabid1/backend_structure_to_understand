import React from 'react';

import { StickerCharacterItemType } from '../../../shared/Constant';
import CharacterItems from './CharacterItems';

const Characters = () => {
    return <CharacterItems itemType={StickerCharacterItemType.CHARACTER} />;
};

export default Characters;
