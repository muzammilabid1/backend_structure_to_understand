/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { countWithPlural } from '../../../shared/Services/handler';

const ReadMoreForSchedule = ({ classData }) => {
    const router = useRouter();

    const [isReadMore, setIsReadMore] = useState(true);

    const toggleReadMore = () => {
        setIsReadMore(!isReadMore);
    };

    return (
        <div className="read_more_schedule" style={{ padding: 16, background: '#EDEBFF' }}>
            <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/schedule_reading_book.svg`} />

            <div>
                The default weekly reading target for this class is{' '}
                <strong>{countWithPlural('day', classData?.schoolClass?.readingTarget)}.</strong> This is changed during holidays, and can
                be updated for a particular week.{' '}
                {isReadMore ? (
                    <span onClick={toggleReadMore} className="collapse">
                        Read more...
                    </span>
                ) : (
                    <>
                        <br />
                        <br />
                        You can change the default target in{' '}
                        <u className="cp" onClick={() => router?.push(`/class/${classData?.schoolClass?.id}/class-details`)}>
                            Settings
                        </u>
                        .
                        <br />
                        <br />
                        The next reading week will be shown in the table below, and you can adjust the targets for that week by clicking on
                        the three dots on the right for that week and click 'Edit' to make the changes.
                        <br />
                        <br />
                        Any week that is affected by school holidays will have a target of zero by default.
                    </>
                )}
            </div>
        </div>
    );
};

ReadMoreForSchedule.propTypes = {
    classData: PropTypes.object.isRequired
};

export default ReadMoreForSchedule;
