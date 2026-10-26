import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { getAllYearGroups } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonLoading from '../../Shared/CommonLoading';
import CommonPopOver from '../../Shared/CommonPopOver';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Heading1 from '../../Shared/Typography/Heading1';
import AddDomain from './AddDomain';
import FilterDomain from './FilterDomain';
import ShowTopicName from './ShowTopicName';

const getDomainsForDomainsOverview = gql`
    query getDomainsForDomainsOverview($yearGroupIds: [String!]!, $subjectIds: [String!]!, $search: String) {
        getDomainsForDomainsOverview(yearGroupIds: $yearGroupIds, subjectIds: $subjectIds, search: $search) {
            id
            title
            subject {
                id
                name
            }
            topicCount
            yearGroups {
                id
                year
                shortName
            }
        }
    }
`;

const getAllSubjectsForDomainOverview = gql`
    query getAllSubjects {
        getAllSubjects {
            id
            name
        }
    }
`;

const deleteTopicDomain = gql`
    mutation deleteTopicDomain($id: String!) {
        deleteTopicDomain(id: $id) {
            status
            msg
        }
    }
`;

const Domains = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const searchParams = useSearchParams();

    const [open, setOpen] = useState({});

    const IsOpen = searchParams.get('IsOpen');
    const search = searchParams.get('search');
    const subject = searchParams.get('subject');
    const year = searchParams.get('year');

    const variablesInQuery = {
        yearGroupIds: year?.length ? JSON.parse(year)?.map((x) => x.key) : [],
        subjectIds: subject?.length ? JSON.parse(subject)?.map((x) => x.key) : [],
        search: search ? search : ''
    };

    const { error: yearGroupError, loading: yearGroupLoading, data: yearGroups } = useQuery(getAllYearGroups);
    const { error: allSubjectsError, loading: allSubjectsLoading, data: allSubjects } = useQuery(getAllSubjectsForDomainOverview);

    const [getDomainsQuery, { loading: getDomainsLoading, error: getDomainsError, data: getDomainsData }] =
        useLazyQuery(getDomainsForDomainsOverview);

    const [deleteDomainMutation, { loading: deleteDomainLoading }] = useMutation(deleteTopicDomain, {
        refetchQueries: [
            {
                query: getDomainsForDomainsOverview,
                variables: variablesInQuery
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        getDomainsQuery({ variables: variablesInQuery, fetchPolicy: 'network-only' });
    }, [yearGroupError, getDomainsError, allSubjectsError, searchParams]);

    useEffect(() => {
        yearGroupError?.message && callSnackbar(yearGroupError, 'error');
        getDomainsError?.message && callSnackbar(getDomainsError, 'error');
        allSubjectsError?.message && callSnackbar(allSubjectsError, 'error');
    }, [yearGroupError, getDomainsError, allSubjectsError]);

    useEffect(() => {
        if (IsOpen) {
            setOpen({ isFilterOpen: IsOpen === 'true' });
        }
    }, [searchParams]);

    const _onClose = () => {
        setOpen((pre) => ({ isFilterOpen: pre?.isFilterOpen }));
    };

    const domainListActions = [
        {
            text: 'Edit',
            icon: 'edit',
            onClick: (item) => {
                setOpen((pre) => ({
                    isFilterOpen: pre?.isFilterOpen,
                    isEdit: true,
                    item
                }));
            }
        },
        {
            text: 'Delete',
            icon: 'delete',
            onClick: (item) => {
                setOpen((pre) => ({ isFilterOpen: pre?.isFilterOpen, isDeleted: true, id: item?.id }));
            }
        }
    ];

    const header = [
        {
            Header: 'Domain name',
            accessor: 'col1'
        },

        {
            Header: 'Year group',
            accessor: 'col2'
        },

        {
            Header: 'Subject',
            accessor: 'col3'
        },
        {
            Header: 'Topics assigned to the domain',
            accessor: 'col4'
        },
        {
            Header: '',
            accessor: 'col5'
        }
    ];

    const getDomains = (getDomainsData?.getDomainsForDomainsOverview || []).map((domain) => {
        return {
            id: domain?.id,
            col1: domain?.title,
            col2: domain?.yearGroups?.length > 0 ? domain?.yearGroups?.map((y) => y?.shortName).join(', ') : '-',
            col3: domain?.subject?.name,
            col4:
                domain?.topicCount > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'start', textDecoration: 'underline' }}>
                        <CommonPopOver text={domain?.topicCount} hover>
                            <ShowTopicName domainId={domain.id} />
                        </CommonPopOver>
                    </div>
                ) : (
                    '-'
                ),
            col5: (
                <div style={{ display: 'flex', justifyContent: 'end' }}>
                    <CommonPopOver bold icon="more_horiz">
                        {domainListActions?.map((item) => (
                            <div className="schedule-table-actions-container" key={item.text} onClick={() => item.onClick(domain)}>
                                <span className="material-icons">{item.icon}</span>
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </CommonPopOver>
                </div>
            )
        };
    });

    if (getDomainsLoading || yearGroupLoading || allSubjectsLoading) return <CommonLoading />;

    return (
        <div data-test={'domains-page'}>
            <Heading1 text="Domains" customClass="schedule-topic-heading" />

            <div className="class-filter-button" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <LWPButton
                    btnText="Add Domain"
                    onClick={() =>
                        setOpen((pre) => ({
                            isFilterOpen: pre?.isFilterOpen,
                            AddDomain: true
                        }))
                    }
                    color="inherit"
                    variant="text"
                    endIcon={'add'}
                />
                <LWPButton
                    color="inherit"
                    variant="text"
                    btnText="Filter"
                    onClick={() =>
                        setOpen(() => ({
                            isFilterOpen: !open?.isFilterOpen
                        }))
                    }
                    endIcon={open?.isFilterOpen ? 'expand_less' : 'expand_more'}
                />
            </div>
            {open?.isFilterOpen ? <FilterDomain open={open} yearGroups={yearGroups} subjects={allSubjects?.getAllSubjects} /> : ''}

            <div className="classTopic-table">
                <CommonDraggableTable columns={header} rows={getDomains} customClass="domain_table" />

                <AddDomain
                    open={open}
                    setOpen={setOpen}
                    yearGroups={yearGroups}
                    subjects={allSubjects?.getAllSubjects}
                    getDomainsForDomainsOverview={getDomainsForDomainsOverview}
                    variablesInQuery={variablesInQuery}
                />
            </div>

            <ConfirmationModal
                open={open?.isDeleted}
                onCancel={_onClose}
                onConfirm={() => {
                    deleteDomainMutation({
                        variables: { id: open?.id }
                    })
                        .then(() => {
                            callSnackbar('Domain deleted successfully!', 'success');
                            _onClose();
                        })
                        .catch(({ ...err }) => {
                            callSnackbar(err, 'error');
                            _onClose();
                        });
                }}
                loading={deleteDomainLoading}
                heading={'Delete Domain'}
                btnText={'Delete'}>
                Are you sure you want to delete this domain?
            </ConfirmationModal>
        </div>
    );
};

export default Domains;
