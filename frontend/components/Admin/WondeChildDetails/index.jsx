/* eslint-disable react/display-name */
import { useLazyQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { getImportedStudent } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import InputField from './../../Shared/InputField/InputField';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

const WondeChildDetailsAdmin = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const router = useRouter();

    const [getImportedStudentQuery, { loading, error, data: importedStudentData }] = useLazyQuery(getImportedStudent);

    let parentHeading = ['Name', 'Email', 'Phone number', 'Relationship', 'Parental responsibility', 'Priority'];
    let classHeading = ['Name', 'Class code', 'Year group'];

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        getImportedStudentQuery({
            variables: { importedStudentId: queryParams?.child_id }
        });
    }, []);

    let parentHead = parentHeading.map((parentHead, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: parentHead };

        if (parentHead === 'Name') {
            rowHead.Cell = (params) => (
                <Link passHref href={`${adminPath}/wondecontact/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor" text={params?.row?.original?.col1} />
                </Link>
            );
        }

        return rowHead;
    });

    let classHead = classHeading.map((classHead, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: classHead };

        if (classHead === 'Name') {
            rowHead.Cell = (params) => (
                <Link passHref href={`${adminPath}/wondeclass/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor" text={params?.row?.original?.col1} />
                </Link>
            );
        }

        return rowHead;
    });

    const classRow = (importedStudentData?.getImportedStudent?.schoolClasses || []).map((wondeClass) => {
        return {
            id: wondeClass?.id,
            col1: wondeClass?.name,
            col2: wondeClass?.code,
            col3: wondeClass?.yearGroup?.year ?? '-'
        };
    });

    const parentRow = (importedStudentData?.getImportedStudent?.importedStudentContacts || []).map((parent) => {
        return {
            id: parent?.importedContact?.id,
            col1: `${parent?.importedContact?.forename} ${parent?.importedContact?.surname}`,
            col2: parent?.importedContact?.email ?? '-',
            col3: parent?.importedContact?.phoneNumber ?? '-',
            col4: parent?.relationship ?? '-',
            col5: parent?.parental_responsibility ? <span className="material-icons">done</span> : '-',
            col6: parent?.priority ?? '-'
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
                    importedStudentData?.getImportedStudent?.school?.lwpSchool?.id
                        ? router?.push(`/admin/school/${importedStudentData?.getImportedStudent?.school?.lwpSchool?.id}`)
                        : callSnackbar('This Wonde child does not have an LWP school attached.', 'error')
                }
            />
            <Heading2 text={'Details'} customClass="pb8 mt-15" />
            <InputField
                label="Fullname"
                value={`${importedStudentData?.getImportedStudent?.forename ?? ''} ${
                    importedStudentData?.getImportedStudent?.surname ?? ''
                }`}
                disabled
            />
            <InputField label="UPN" value={importedStudentData?.getImportedStudent?.UPN} disabled />
            <InputField label="Gender" value={importedStudentData?.getImportedStudent?.gender} disabled />
            <Heading2 text={'Classes'} customClass="pb8 mt-15" />
            <CommonDraggableTable customClass="row-height" rows={classRow} columns={classHead} />
            <Heading2 text={'Parents'} customClass="pb8 mt-15" />
            <CommonDraggableTable customClass="row-height" rows={parentRow} columns={parentHead} />
        </div>
    );
};

export default WondeChildDetailsAdmin;
