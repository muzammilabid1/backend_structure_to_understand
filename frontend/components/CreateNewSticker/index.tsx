import { useState } from 'react';

import CommonTabs from '../Shared/CommonTabs';
import Heading2 from '../Shared/Typography/Heading2';
import CreateSticker from './CreateSticker';
import UploadSticker from './UploadSticker';

const CreateNewSticker = () => {
    const [active, setActive] = useState<number>(0);

    const tabs: string[] = ['Create', 'Upload'];

    return (
        <div className="create-new-sticker">
            <Heading2 text={'Add sticker'} />
            <CommonTabs tebs={tabs} value={active} onChange={setActive}>
                {active === 1 ? <UploadSticker onCancel={() => setActive(0)} /> : <CreateSticker />}
            </CommonTabs>
        </div>
    );
};

export default CreateNewSticker;
