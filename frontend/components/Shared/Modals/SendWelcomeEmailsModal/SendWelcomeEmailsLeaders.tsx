import { useQuery } from '@apollo/client';
import { TableCell, TableRow } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { getSchoolLeadersAwaitingWelcome } from '../../../../graphQl/queries';
import { ThemeContext } from '../../../../shared/Services/handler';
import CommonLoading from '../../CommonLoading';
import CommonTable from '../../CommonTable';
import Paragraph from '../../Typography/Paragraph';

interface SchoolLeaderAwaitingWelcome {
    userId: string;
    firstname: string;
    lastname: string;
    email: string;
}

interface SendWelcomeEmailsLeadersProps {
    schoolId: string;
    dataTest?: string;
}

const SendWelcomeEmailsLeaders = ({ schoolId, dataTest }: SendWelcomeEmailsLeadersProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const { data, loading, error } = useQuery(getSchoolLeadersAwaitingWelcome, {
        variables: { schoolId },
        fetchPolicy: 'cache-and-network'
    });
    const leaders: SchoolLeaderAwaitingWelcome[] = data?.getSchoolLeadersAwaitingWelcome ?? [];

    useEffect(() => {
        if (error?.message) callSnackbar(error, 'error');
    }, [error]);

    if (loading && !data) return <CommonLoading />;

    return (
        <div className="staff-email-leaders" data-test={dataTest}>
            {leaders.length ? (
                <CommonTable isChild head={['Name', 'Email']}>
                    {leaders.map((leader) => (
                        <TableRow key={leader.userId}>
                            <TableCell>
                                <Paragraph text={`${leader.firstname} ${leader.lastname}`} />
                            </TableCell>
                            <TableCell>
                                <Paragraph text={leader.email} />
                            </TableCell>
                        </TableRow>
                    ))}
                </CommonTable>
            ) : (
                <Paragraph text="No school leaders left to email." />
            )}
        </div>
    );
};

export default SendWelcomeEmailsLeaders;
