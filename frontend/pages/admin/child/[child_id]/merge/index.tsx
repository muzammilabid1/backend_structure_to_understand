import { useParams } from 'next/navigation';

import MergePupilsAdmin from '../../../../../components/Admin/MergePupils';
import { PageType } from '../../../../../types/enums/PageType';

const MergePupilsAdminPage = () => {
    const { child_id: pupilAId } = useParams<{ child_id: string }>();

    return <MergePupilsAdmin pupilAId={pupilAId} />;
};

MergePupilsAdminPage.pageType = PageType.ADMIN;
MergePupilsAdminPage.pageTitle = 'Admin: Merge pupils';

export default MergePupilsAdminPage;
