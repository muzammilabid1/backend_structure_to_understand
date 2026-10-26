import { useQuery } from '@apollo/client';
import React, { useContext, useEffect } from 'react';

import { getAllNews } from '../../graphQl/queries';
import { showDate, ThemeContext } from '../../shared/Services/handler';
import { PageType } from '../../types/enums/PageType';
import CommonLoading from './../../components/Shared/CommonLoading';
import NewsCard from './../../components/Shared/NewsCard';
import Heading1 from './../../components/Shared/Typography/Heading1';

const News = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const {
        loading,
        error,
        data: newsList
    } = useQuery(getAllNews, {
        variables: { userId: null } // UserID will be dynamic later
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (loading) return <CommonLoading />;

    return (
        <div className="other_layout_for_specific_pages">
            <Heading1 text="News" customClass="pb8" />
            {(newsList?.allNews || []).map((news) => (
                <NewsCard
                    key={news?.id}
                    title={news?.title}
                    date={showDate({ date: news?.logCreatedAt })}
                    description={news?.description}
                />
            ))}
        </div>
    );
};

News.pageType = PageType.TEACHER;
News.pageTitle = 'LWP news';

export default News;
