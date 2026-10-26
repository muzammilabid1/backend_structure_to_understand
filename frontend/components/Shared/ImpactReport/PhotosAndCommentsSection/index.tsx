import { CardContent, CardMedia } from '@mui/material';
import { SchoolImpactReportFeedbackContentType, SchoolImpactReportType } from 'lwp-shared';

import { ILwpSchoolImpactReportFeedback } from '../../../../types/entities/ILwpSchoolImpactReportFeedback';
import CommonCard from '../../Cards/CommonCard';
import Heading2 from '../../Typography/Heading2';
import CommentCard from './CommentCard';
import PhotoCard from './PhotoCard';

interface PhotosAndCommentsProps {
    feedbacks: ILwpSchoolImpactReportFeedback[];
    reportType: SchoolImpactReportType;
    isAdminView?: boolean;
    refetch?: () => void;
}

const PhotosAndCommentsSection = ({ feedbacks, reportType, isAdminView = false, refetch }: PhotosAndCommentsProps) => {
    return (
        <CommonCard className="photos-and-comments-section">
            <Heading2 text="Photos and Comments" />
            {feedbacks.map((feedback, index) => (
                <CardMedia
                    classes={{
                        root: `${reportType === SchoolImpactReportType.READING ? 'READING' : 'TOPIC'}-bg-light photos-and-comments-card-media`
                    }}
                    key={index}>
                    <CardContent className="photos-and-comments-content-section">
                        {feedback?.contentType === SchoolImpactReportFeedbackContentType.PHOTO ? (
                            <PhotoCard feedback={feedback} isAdminView={isAdminView} refetch={refetch} />
                        ) : (
                            <CommentCard feedback={feedback} isAdminView={isAdminView} refetch={refetch} />
                        )}
                    </CardContent>
                </CardMedia>
            ))}
        </CommonCard>
    );
};

export default PhotosAndCommentsSection;
