import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import CreateSticker from '../../../../components/CreateNewSticker/CreateSticker';
import Heading2 from '../../../../components/Shared/Typography/Heading2';
import Paragraph from '../../../../components/Shared/Typography/Paragraph';
import { PageType } from '../../../../types/enums/PageType';

const EditSticker = () => {
    const queryParams = useParams();

    const stickerId = queryParams?.sticker_id;

    return (
        <div className="create-new-sticker edit-sticker">
            <div className="edit-sticker-header">
                <Heading2 text={'Edit sticker'} />

                <div className="edit-sticker-warning">
                    <HelpOutlineIcon sx={{ color: '#F28D00', fontSize: 32 }} />
                    <Paragraph>
                        Editing this sticker will update it on all existing entries where it has been used. Make a copy if you don&apos;t
                        want to edit it. <Link href={`/admin/stickers/create-sticker?copy_sticker_id=${stickerId}`}>Create a copy</Link>
                    </Paragraph>
                </div>
            </div>
            <CreateSticker />
        </div>
    );
};

EditSticker.pageType = PageType.ADMIN;
EditSticker.pageTitle = 'Admin: Edit sticker';

export default EditSticker;
