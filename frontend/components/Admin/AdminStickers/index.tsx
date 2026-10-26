import React, { useCallback, useState } from 'react';

import CommonTabs from '../../Shared/CommonTabs';
import Heading2 from '../../Shared/Typography/Heading2';
import Characters from './Characters';
import Items from './Items';
import Stickers from './Stickers';

const AdminStickers = () => {
    const [active, setActive] = useState<number>(0);

    const tabs: string[] = ['Stickers', 'Characters', 'Items'];

    const renderTabContent = useCallback((): React.ReactNode => {
        switch (active) {
            case 0:
                return <Stickers />;

            case 1:
                return <Characters />;

            case 2:
                return <Items />;

            default:
                return null;
        }
    }, [active]);

    return (
        <div className="admin-stickers" data-test={'stickers-page'}>
            <Heading2 text={'Stickers'} />
            <CommonTabs tebs={tabs} value={active} onChange={setActive}>
                {renderTabContent()}
            </CommonTabs>
        </div>
    );
};

export default AdminStickers;
