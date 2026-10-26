/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

import CommonSelectField from '../../../Shared/CommonSelectField';
import DialogWrapper from '../../../Shared/DialogWrapper';
import AddTag from '../../../Shared/Modals/AddTag';
import AddSchoolsTag from './AddSchoolsTag';
import AddTopicsTag from './AddTopicsTag';

interface TagsOptions {
    addATags: boolean;
    currentFilter: boolean;
    defaultValues?: any;
    tabs: 'Topics' | 'Activities' | 'Schools';
}

interface AddATagProps {
    tagsOptions: TagsOptions;
    setActions: (actions: Partial<TagsOptions>) => void;
}

const AddATag = ({ tagsOptions, setActions }: AddATagProps) => {
    return (
        <DialogWrapper
            open={tagsOptions?.addATags}
            onClose={() => setActions({ addATags: false, defaultValues: null })}
            contentWidth="648px"
            heading={tagsOptions?.defaultValues ? 'Update a tag' : 'Add a tag'}>
            <CommonSelectField
                label="Tag category"
                disabled={tagsOptions?.defaultValues}
                options={[
                    {
                        key: 'Topics',
                        value: 'Topics'
                    },
                    {
                        key: 'Activities',
                        value: 'Activities'
                    },
                    {
                        key: 'Schools',
                        value: 'Schools'
                    }
                ]}
                value={tagsOptions?.tabs}
                onChange={(e) =>
                    setActions({
                        tabs: e.target.value as TagsOptions['tabs']
                    })
                }
            />
            {tagsOptions?.tabs === 'Topics' ? (
                <AddTopicsTag setActions={setActions} tagsOptions={tagsOptions} />
            ) : tagsOptions?.tabs === 'Activities' ? (
                <AddTag setActions={setActions} tagsOptions={tagsOptions} />
            ) : tagsOptions?.tabs === 'Schools' ? (
                <AddSchoolsTag setActions={setActions} tagsOptions={tagsOptions} />
            ) : null}
        </DialogWrapper>
    );
};

export default AddATag;
