import ImpactReportV2 from '../../../School/ImpactReport/ImpactReportV2';
import BackToTop from '../../../Shared/BackToTop';

interface ImpactReportV2PreviewProps {
    schoolId: string;
    termId: string;
}

const ImpactReportV2Preview = ({ schoolId, termId }: ImpactReportV2PreviewProps) => {
    return (
        <div>
            <ImpactReportV2 schoolId={schoolId} termId={termId} isAdminView={true} />
            <BackToTop querySelector=".MuiDialog-scrollBody" />
        </div>
    );
};

export default ImpactReportV2Preview;
