import { ILwpSchool } from './ILwpSchool';
import { ILwpStickerCharacterItem } from './ILwpStickerCharacterItem';

export interface ILwpSticker {
    id: string;
    fileName?: string;
    imageUrl?: string;
    alt?: string;
    isActive?: boolean;
    label?: string;
    textColor?: string;
    borderColor?: string;
    character?: ILwpStickerCharacterItem;
    item?: ILwpStickerCharacterItem;
    school: ILwpSchool | null;
}
