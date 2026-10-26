/* eslint-disable react/display-name */
import { useLazyQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { getImportedSchoolClass } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import InputField from './../../Shared/InputField/InputField';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

const WondeClassOverviewAdmin = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const router = useRouter();

    const [getImportedClassQuery, { loading, error, data: importedClassData }] = useLazyQuery(getImportedSchoolClass);

    let heading = ['Child name', 'Surname', 'Gender', 'isPremium', 'UPN'];

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        getImportedClassQuery({ variables: { importedSchoolClassId: queryParams?.class_id } });
    }, []);

    let head = heading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Child name') {
            rowHead.Cell = (params) => (
                <Link passHref href={`${adminPath}/wondechild/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor" text={params?.row?.original?.col1} />
                </Link>
            );
        }

        return rowHead;
    });

    const row = (importedClassData?.getImportedSchoolClass?.students || []).map((pupil) => {
        return {
            id: pupil.id,
            col1: pupil?.forename,
            col2: pupil?.surname,
            col3: pupil?.gender,
            col4: pupil?.isPremium ? <span className="material-icons">done</span> : '-',
            col5: pupil?.UPN
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div>
            <LWPButton
                btnText="Go to LWP school"
                startIcon="location_city"
                color="inherit"
                variant="text"
                size="medium"
                onClick={() =>
                    importedClassData?.getImportedSchoolClass?.school?.lwpSchool?.id
                        ? router?.push(`/admin/school/${importedClassData?.getImportedSchoolClass?.school?.lwpSchool?.id}`)
                        : callSnackbar('This Wonde class does not have an LWP school attached.', 'error')
                }
            />
            <Heading2 text={'Details'} customClass="pb8 mt-15" />

            <InputField label="Name" value={importedClassData?.getImportedSchoolClass?.name} disabled />
            <InputField label="Code" value={importedClassData?.getImportedSchoolClass?.code} disabled />
            <InputField label="Year group" value={importedClassData?.getImportedSchoolClass?.yearGroup?.year} disabled />

            <Heading2 text={'Imported Children'} customClass="pb8 mt-15" />

            <CommonDraggableTable customClass="row-height" rows={row} columns={head} />
        </div>
    );
};

export default WondeClassOverviewAdmin;
