import { SchoolImpactReportFeedbackContentType } from 'lwp-shared';

import { ILwpSchoolImpactReportFeedback } from '../../../../../../types/entities/ILwpSchoolImpactReportFeedback';
import CommonCard from '../../../../../Shared/Cards/CommonCard';
import CommentCard from '../../../../../Shared/ImpactReport/PhotosAndCommentsSection/CommentCard';
import PhotoCard from '../../../../../Shared/ImpactReport/PhotosAndCommentsSection/PhotoCard';
import Heading2 from '../../../../../Shared/Typography/Heading2';

interface PhotosAndCommentsProps {
    feedbacks: ILwpSchoolImpactReportFeedback[];
    isAdminView: boolean;
    refetch: () => void;
}

const PhotosAndCommentsSection = ({ feedbacks, isAdminView, refetch }: PhotosAndCommentsProps) => {
    return (
        <CommonCard className="photos-and-comments-section">
            <Heading2 text="Photos and Comments" />
            <div className="photos-and-comments-content-container">
                {feedbacks.map((feedback, index) => (
                    <div key={index}>
                        {feedback?.contentType === SchoolImpactReportFeedbackContentType.PHOTO ? (
                            <PhotoCard feedback={feedback} isAdminView={isAdminView} refetch={refetch} />
                        ) : (
                            <CommentCard feedback={feedback} isAdminView={isAdminView} refetch={refetch} />
                        )}
                    </div>
                ))}
            </div>
        </CommonCard>
    );
};

export default PhotosAndCommentsSection;
