/* eslint-disable react/display-name */
import { useLazyQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { getImportedContact } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import InputField from './../../Shared/InputField/InputField';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';
const WondeContactDetailsAdmin = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const router = useRouter();

    const [getImportedContactQuery, { loading, error, data: importedContactData }] = useLazyQuery(getImportedContact);

    let headings = ['Name', 'UPN', 'Gender', 'Relationship', 'Parental responsibility', 'Priority'];

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        getImportedContactQuery({
            variables: { importedContactId: queryParams?.contact_id }
        });
    }, []);

    let head = headings.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Name') {
            rowHead.Cell = (params) => (
                <Link passHref href={`${adminPath}/wondechild/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor" text={params?.row?.original?.col1} />
                </Link>
            );
        }

        return rowHead;
    });

    const row = (importedContactData?.getImportedContact.importedStudentContacts || []).map((importedStudentContact) => {
        return {
            id: importedStudentContact?.importedStudent?.id,
            col1: `${importedStudentContact?.importedStudent?.forename} ${importedStudentContact?.importedStudent?.surname}`,
            col2: importedStudentContact?.importedStudent?.UPN,
            col3: importedStudentContact?.importedStudent?.gender,
            col4: importedStudentContact?.relationship ?? '-',
            col5: importedStudentContact?.parental_responsibility ? <span className="material-icons">done</span> : '-',
            col6: importedStudentContact?.priority ?? '-'
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
                    importedContactData?.getImportedContact.school?.lwpSchool?.id
                        ? router?.push(`/admin/school/${importedContactData?.getImportedContact.school?.lwpSchool?.id}`)
                        : callSnackbar('This Wonde contact does not have an LWP school attached.', 'error')
                }
            />
            <Heading2 text={'Details'} customClass="pb8 mt-15" />
            <InputField
                label="Fullname"
                value={`${importedContactData?.getImportedContact.forename ?? ''} ${importedContactData?.getImportedContact.surname ?? ''}`}
                disabled
            />
            <InputField label="Email" value={importedContactData?.getImportedContact?.email ?? '-'} disabled />
            <InputField label="Phone number" value={importedContactData?.getImportedContact?.phoneNumber ?? '-'} disabled />
            <InputField label="Gender" value={importedContactData?.getImportedContact?.gender ?? '-'} disabled />
            <Heading2 text={'Children'} customClass="pb8 mt-15" />
            <CommonDraggableTable customClass="row-height" rows={row} columns={head} />
        </div>
    );
};

export default WondeContactDetailsAdmin;
