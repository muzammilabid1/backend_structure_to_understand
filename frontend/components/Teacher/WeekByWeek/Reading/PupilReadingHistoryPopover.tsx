/* eslint-disable @next/next/no-img-element */

import { MINIO_PUBLIC_PATHS, TEACHER } from '../../../../shared/Constant';
import { showDate } from '../../../../shared/Services/handler';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface ReadingHistoryItem {
    id: string;
    bookName: string;
    userName: string;
    pageNumber?: number;
    userType: string;
    isBookFinished: boolean;
    pupilCount: number;
    bookReadAt: string;
}

interface PupilReadingHistoryPopoverProps {
    item: ReadingHistoryItem[];
    name: string;
}

const PupilReadingHistoryPopover = ({ item, name }: PupilReadingHistoryPopoverProps) => {
    return (
        <>
            <b>{showDate({ date: item[0]?.bookReadAt, short: true })}</b>
            {item?.map((data) => {
                const readAsGroup = data?.pupilCount > 1 ? ' as part of a group' : '';
                const imageSource = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${
                    data?.pupilCount > 1 ? 'team_teacher.svg' : data?.userType === TEACHER ? 'readingSchoolIcon.svg' : 'readingHomeIcon.svg'
                }`;

                const loggedByName = data?.userName || '';

                return (
                    <div className="school-reading-popoverContent-container">
                        {data?.isBookFinished ? (
                            <>
                                <div className="school-reading-popoverContent-image">
                                    <img src={imageSource} />
                                </div>
                                <div className="school-reading-popoverContent-text">
                                    <Paragraph>
                                        <b>{name}</b> read <b>{data?.bookName}</b>
                                        {readAsGroup ? ` ${readAsGroup}` : ''}
                                        {loggedByName ? (
                                            <>
                                                {` with `} <b>{loggedByName}</b>
                                            </>
                                        ) : null}{' '}
                                        and finished the book
                                    </Paragraph>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="school-reading-popoverContent-image">
                                    <img src={imageSource} />
                                </div>
                                <div className="school-reading-popoverContent-text">
                                    <Paragraph>
                                        <b>{name}</b> read <b>{data?.bookName}</b>
                                        {readAsGroup ? ` ${readAsGroup}` : ''}
                                        {loggedByName ? (
                                            <>
                                                {` with `} <b>{loggedByName}</b>
                                            </>
                                        ) : null}
                                        {data?.pageNumber ? (
                                            <>
                                                {' '}
                                                and got to <b>page {data?.pageNumber}</b>
                                            </>
                                        ) : null}
                                    </Paragraph>
                                </div>
                            </>
                        )}
                        <br />
                    </div>
                );
            })}
        </>
    );
};

export default PupilReadingHistoryPopover;
