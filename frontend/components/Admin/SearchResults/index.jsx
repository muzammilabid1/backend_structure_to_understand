import { useQuery } from '@apollo/client';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { getSearchResults } from '../../../graphQl/queries';
import { ADMIN, CLASS, GROUP, MINIO_PUBLIC_PATHS, PARENT, PUPIL, SCHOOL, SCHOOLLEADER, TEACHER } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../../Shared/CommonLoading';
import CommonStatus from '../../Shared/CommonStatus';
import Heading2 from '../../Shared/Typography/Heading2';
import AdminOverviewForSearch from './AdminOverview';
import ClassOverviewForSearch from './ClassOverview';
import GroupOverview from './GroupOverview';
import ParentOverviewForSearch from './ParentOverview';
import PupilOverviewForSearch from './PupilOverview';
import SchoolLeaderOverviewForSearch from './SchoolLeaderOverview';
import SchoolOverviewForSearch from './SchoolOverview';
import TeacherOverviewForSearch from './TeacherOverview';
import WondeContactOverviewForSearch from './WondeContactOverview';
import WondeSchoolClassOverviewForSearch from './WondeSchoolClass';
import WondeSchoolOverviewForSearch from './WondeSchoolOverview';
import WondeStudentOverviewForSearch from './WondeStudentOverview';

const SearchResults = () => {
    const searchParams = useSearchParams();
    const { callSnackbar } = useContext(ThemeContext);

    const hasCount = (searchResults, type) =>
        searchResults?.length && searchResults?.filter((searchResult) => searchResult.type === type)?.length ? true : false;

    const { loading, error, data } = useQuery(getSearchResults, { variables: { query: searchParams.get('search') } });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (loading) return <CommonLoading />;

    return (
        <div className="school_overview">
            <Heading2 text={`Search results for "${searchParams.get('search') ?? ''}" `} />
            {!data?.getSearchResults?.length ? (
                <>
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        imageAlt={''}
                        heading={'No search results to show'}
                    />
                </>
            ) : (
                <>
                    {hasCount(data?.getSearchResults, PARENT) && <ParentOverviewForSearch searchResults={data?.getSearchResults} />}
                    {hasCount(data?.getSearchResults, PUPIL) && <PupilOverviewForSearch searchResults={data?.getSearchResults} />}
                    {hasCount(data?.getSearchResults, SCHOOL) && <SchoolOverviewForSearch searchResults={data?.getSearchResults} />}
                    {hasCount(data?.getSearchResults, 'WONDESCHOOL') && (
                        <WondeSchoolOverviewForSearch searchResults={data?.getSearchResults} />
                    )}
                    {hasCount(data?.getSearchResults, 'WONDESCHOOLCLASS') && (
                        <WondeSchoolClassOverviewForSearch searchResults={data?.getSearchResults} />
                    )}
                    {hasCount(data?.getSearchResults, 'WONDESTUDENT') && (
                        <WondeStudentOverviewForSearch searchResults={data?.getSearchResults} />
                    )}
                    {hasCount(data?.getSearchResults, 'WONDECONTACT') && (
                        <WondeContactOverviewForSearch searchResults={data?.getSearchResults} />
                    )}
                    {hasCount(data?.getSearchResults, CLASS) && <ClassOverviewForSearch searchResults={data?.getSearchResults} />}
                    {hasCount(data?.getSearchResults, TEACHER) && <TeacherOverviewForSearch searchResults={data?.getSearchResults} />}
                    {hasCount(data?.getSearchResults, SCHOOLLEADER) && (
                        <SchoolLeaderOverviewForSearch searchResults={data?.getSearchResults} />
                    )}
                    {hasCount(data?.getSearchResults, ADMIN) && <AdminOverviewForSearch searchResults={data?.getSearchResults} />}
                    {hasCount(data?.getSearchResults, GROUP) && <GroupOverview searchResults={data?.getSearchResults} />}
                </>
            )}
        </div>
    );
    // return (
    //     <>
    //         <CommonStatus image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`} imageAlt={''} heading={'No activities to show'} />
    //     </>
    // );
};

export default SearchResults;
