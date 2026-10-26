import { gql, useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect } from 'react';

import { ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../../Shared/CommonLoading';
import CommonTabs from '../../Shared/CommonTabs';
import Heading2 from '../../Shared/Typography/Heading2';
import Topics from './Topics';

const getAllTopicsForAdmin = gql`
    query allTopics($filter: TopicFilter) {
        allTopics(filter: $filter) {
            id
            teacherTopicName
            parentTopicName
            isDemo
            isHidden
            isPublished
            schoolTags {
                id
                name
            }
            tags {
                name
                color
            }
            activities {
                id
                name
                order
                isHidden
                activityType
            }
            yearGroups {
                year
                shortName
            }
            video
            domains {
                id
                title
                subject {
                    id
                    name
                }
            }
        }
    }
`;

const TopicsOverviewAdmin = () => {
    const tebs = ['Topics', 'Activities'];
    const router = useRouter();

    const { callSnackbar } = useContext(ThemeContext);

    const topicQuery = getAllTopicsForAdmin;

    const { loading, error, data: allTopics } = useQuery(topicQuery);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const addTopicListItem = [
        {
            text: 'Add a topic',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => router.push('/admin/topic'),
            dataTest: 'add-topic-button'
        }
    ];

    let topics = allTopics?.allTopics;

    if (loading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test={'topics-page'}>
            <div className="header">
                <Heading2 text={'Topics'} />
            </div>
            <CommonTabs
                addBtn={addTopicListItem}
                tebs={tebs}
                value={0}
                onChange={() => {
                    router?.push('/admin/activities', undefined, { scroll: false });
                }}>
                <Topics topics={topics} topicQuery={topicQuery} />
            </CommonTabs>
        </div>
    );
};

export default TopicsOverviewAdmin;
