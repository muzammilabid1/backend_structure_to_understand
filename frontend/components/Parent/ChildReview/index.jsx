import { useQuery } from '@apollo/client';
import TabContext from '@mui/lab/TabContext';
import TabPanel from '@mui/lab/TabPanel';
import { Tabs } from '@mui/material';
import Tab from '@mui/material/Tab';
import withStyles from '@mui/styles/withStyles';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { getPupil } from '../../../graphQl/queries';
import { PupilType } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import BookHistory from '../../PagesContent/BookHistory';
import HistoryItems from '../../PagesContent/HistoryItems';
import MyAchievements from '../../PagesContent/MyAchievements';
import CommonLoading from '../../Shared/CommonLoading';

const AntTabs = withStyles({
    indicator: {
        backgroundColor: '#F28D00'
    }
})(Tabs);

const ChildReview = () => {
    const queryParams = useParams();
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const { loading, error, data: pupil } = useQuery(getPupil, { variables: { id: queryParams?.child_id }, skip: !router?.isReady });

    const pupilType = pupil?.pupil?.type;

    const tabs = [
        'trophies',
        ...(pupilType !== PupilType.TOPIC ? ['book-history'] : []), // book history not be visible in topic only pupil
        ...(pupilType !== PupilType.READING ? ['history'] : []) // history not be visible in reading only pupil
    ];

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (loading) return <CommonLoading />;

    const handleChange = (_, newValue) => {
        router?.push(`/child/${queryParams?.child_id}/${newValue}`);
    };
    const pathName = router?.route?.split('/')?.[router?.route?.split('/')?.length - 1];

    const tabName = {
        trophies: 'Awards',
        'book-history': 'Books',
        history: 'History'
    };

    return (
        <div className="child-details-container">
            <div className="common_tebs child_review">
                <TabContext value={pathName}>
                    <AntTabs value={pathName} onChange={handleChange} aria-label="ant example">
                        {tabs.map((tab) => (
                            <Tab
                                value={tab}
                                disableRipple
                                label={tabName[tab]}
                                className={`tebs ${tab == pathName ? 'Mui-selected' : ''}`}
                            />
                        ))}
                    </AntTabs>
                    <TabPanel
                        value="trophies"
                        sx={{
                            paddingTop: '0'
                        }}>
                        <MyAchievements
                            images={[
                                {
                                    imgPath: pupil?.pupil?.mathscotUrl?.bigImage || ''
                                }
                            ]}
                            pupil={pupil}
                        />
                    </TabPanel>
                    <TabPanel value="history">
                        <HistoryItems />
                    </TabPanel>
                    <TabPanel
                        value="book-history"
                        sx={{
                            padding: '0'
                        }}>
                        <BookHistory pupil={pupil} />
                    </TabPanel>
                </TabContext>
            </div>
        </div>
    );
};

export default ChildReview;
