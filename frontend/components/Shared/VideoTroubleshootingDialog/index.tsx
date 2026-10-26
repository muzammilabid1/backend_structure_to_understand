import { useLazyQuery } from '@apollo/client';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Alert } from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

import { getParameters } from '../../../graphQl/queries';
import LWPButton from '../Button/LWPButton';
import CommonLoading from '../CommonLoading';
import DialogWrapper from '../DialogWrapper';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

interface VideoTroubleshootingDialogProps {
    handleClose: () => void;
}

const VideoTroubleshootingDialog = ({ handleClose }: VideoTroubleshootingDialogProps) => {
    const [openDialog, setOpenDialog] = useState(false);
    const [fetchParentSupportEmailParameters, { data: parametersData, loading }] = useLazyQuery(getParameters, {
        variables: { keys: ['PARENT_SUPPORT_EMAIL'] },
        fetchPolicy: 'cache-first'
    });

    const parentSupportEmail = parametersData?.getParameters?.[0]?.value;

    return (
        <>
            <Alert className="video-trouble-shoot-container" icon={<HelpOutlineIcon />} severity="warning">
                <Paragraph>
                    Video not working?{' '}
                    <span
                        onClick={() => {
                            fetchParentSupportEmailParameters();
                            setOpenDialog(true);
                        }}>
                        Get help
                    </span>
                </Paragraph>
                <CloseIcon onClick={handleClose} />
            </Alert>
            {openDialog ? (
                <DialogWrapper
                    open={openDialog}
                    setOpen={setOpenDialog}
                    heading="Troubleshooting steps"
                    className="troubleshooting-dialog"
                    contentWidth="675px">
                    {loading ? (
                        <CommonLoading />
                    ) : (
                        <div className="troubleshooting-content">
                            <Heading3 text="Try these quick fixes:" />
                            <ul>
                                <li>Tap pause and then play.</li>
                                <li>Move the progress bar forward a bit and tap play again.</li>
                            </ul>
                            <Paragraph>
                                Still having issues? You can email us at{' '}
                                <Link passHref href={`mailto:${parentSupportEmail}`}>
                                    {parentSupportEmail}
                                </Link>
                            </Paragraph>
                            <LWPButton btnText="Close" onClick={() => setOpenDialog(false)} color="inherit" />
                        </div>
                    )}
                </DialogWrapper>
            ) : null}
        </>
    );
};

export default VideoTroubleshootingDialog;
