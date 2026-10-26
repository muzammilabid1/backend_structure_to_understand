import { Grid } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useSearchParams } from 'next/navigation';
import React, { useState } from 'react';

import LWPButton from '../../Shared/Button/LWPButton';
import CommonButtonGroup from '../../Shared/CommonButtonGroup';
import Heading2 from '../../Shared/Typography/Heading2';
import ActivitiesTags from './ActivitiesTags';
import AddATag from './AddATag';
import SchoolTags from './SchoolTags';
import TopicsTags from './TopicsTags';

const TagsOverview = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialTagsOptions = {
        tabs: searchParams.get('tabs') ?? 'Topics',
        addATags: false,
        openFilter: searchParams.get('openFilter') ?? false,
        defaultValues: null
    };

    const [tagsOptions, setTagsOptions] = useState(initialTagsOptions);

    const setActions = (options) => setTagsOptions((pre) => ({ ...pre, ...options }));

    const groupBtn = ['Topics', 'Activities', 'Schools'];

    return (
        <div className="tags_overview" data-test={'tags-page'}>
            <Grid container justifyContent={'space-between'} alignItems={'center'}>
                <Heading2 text="Tags" />
                <LWPButton
                    btnText="Add a Tag"
                    endIcon="add"
                    color="inherit"
                    variant="text"
                    onClick={() => {
                        setActions({
                            addATags: true
                        });
                    }}
                />
            </Grid>
            <br />
            <Grid container justifyContent={'space-between'} alignItems={'center'}>
                <Grid iten xl={6} lg={6} md={6} xs={6}>
                    <CommonButtonGroup
                        groupBtn={groupBtn}
                        select={tagsOptions?.tabs}
                        onClick={(btn) => {
                            setTagsOptions({
                                ...initialTagsOptions,
                                tabs: btn,
                                openFilter: false
                            });
                            router?.push({
                                query: { tabs: btn }
                            });
                        }}
                    />
                </Grid>
                <LWPButton
                    btnText="Filter"
                    endIcon={tagsOptions?.openFilter ? 'expand_less' : 'expand_more'}
                    color="inherit"
                    variant="text"
                    onClick={() =>
                        setActions({
                            openFilter: !tagsOptions.openFilter
                        })
                    }
                />
            </Grid>
            <br />
            {tagsOptions?.tabs === 'Topics' ? (
                <TopicsTags setActions={setActions} tagsOptions={tagsOptions} />
            ) : tagsOptions?.tabs === 'Activities' ? (
                <ActivitiesTags setActions={setActions} tagsOptions={tagsOptions} />
            ) : tagsOptions?.tabs === 'Schools' ? (
                <SchoolTags setActions={setActions} tagsOptions={tagsOptions} />
            ) : null}

            <AddATag tagsOptions={tagsOptions} setActions={setActions} />
        </div>
    );
};

export default TagsOverview;
