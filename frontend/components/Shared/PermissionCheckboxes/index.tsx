import { Card, Divider } from '@mui/material';
import { useFormikContext } from 'formik';
import React, { useEffect, useState } from 'react';

import { getHtml } from '../../../shared/Services/handler';
import CommonCheckBox from '../CommonCheckBox';
import CommonLoading from '../CommonLoading';
import RenderHtml from '../CommonRenderHtml';
import CommonTooltipIcon from '../CommonTooltipIcon';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

export interface PermissionParam {
    mandatory?: string;
    mandatory_privacy_text?: string;
    mandatory_info?: string;
    optional?: string;
    optional_info?: string;
    opted_in_summary?: string;
    opted_out_summary?: string;
    teacher_permission?: string;
}

interface FormValues {
    shareWithTeacher: boolean;
    sharingAllowed: boolean;
    rememberPermissions: boolean;
    [key: string]: unknown;
}

interface PermissionCheckboxesProps {
    permissionParam: PermissionParam | null;
    showPhotoPermission: boolean;
    setShowPhotoPermission: (value: boolean) => void;
    organisations?: string;
    privacyPolicy?: string | null;
    getPermissionParameterLoading?: boolean;
    cardClassName?: string;
    summaryCardClassName?: string;
    shareWithTeacherClassName?: string;
    shareWithTeacherLabelDataTest?: string;
    sharingAllowedWrapperClassName?: string;
    sharingAllowedClassName?: string;
    rememberPermissionsClassName?: string;
    divider?: React.ReactNode;
}

const PermissionCheckboxes = ({
    permissionParam,
    showPhotoPermission,
    setShowPhotoPermission,
    organisations,
    privacyPolicy,
    getPermissionParameterLoading = false,
    cardClassName = 'demo-activity-photo-permission-card',
    summaryCardClassName = 'demo-activity-photo-permission-update-card',
    shareWithTeacherClassName = 'mt2',
    shareWithTeacherLabelDataTest,
    sharingAllowedWrapperClassName = 'checkbox-with-info-icon mt2',
    sharingAllowedClassName,
    rememberPermissionsClassName = 'mb2',
    divider
}: PermissionCheckboxesProps) => {
    const { values, errors, touched, handleChange } = useFormikContext<FormValues>();
    const [showPolicy, setShowPolicy] = useState(false);
    const [paramsKey, setParamsKey] = useState<Array<{ title: { rendered: string }; content: { rendered: string } }>>([]);

    useEffect(() => {
        if (!showPolicy) return;
        fetch('https://learningwithparents.com/wp-json/wp/v2/snippets')
            .then((res) => res.json())
            .then((data) => setParamsKey(data))
            .catch((err) => console.error('Error:', err));
    }, [showPolicy]);

    const htmlParams = { ORGANISATIONS: organisations } as unknown as Parameters<typeof getHtml>[1];

    const defaultDivider = <Divider className="my5" />;

    return (
        <>
            {showPhotoPermission && !getPermissionParameterLoading && (
                <Card className={cardClassName}>
                    <div className="align-items-center">
                        <CommonCheckBox
                            name="shareWithTeacher"
                            checked={values.shareWithTeacher}
                            onChange={handleChange}
                            error={(errors as Record<string, unknown>).shareWithTeacher}
                            touched={(touched as Record<string, unknown>).shareWithTeacher}
                            className={shareWithTeacherClassName}
                            labelDataTest={shareWithTeacherLabelDataTest}
                            dataTest="share-permissions-checkbox">
                            <span>
                                {getHtml(permissionParam?.mandatory, htmlParams)}{' '}
                                {permissionParam?.mandatory_privacy_text && (
                                    <u onClick={() => setShowPolicy(true)}>{getHtml(permissionParam.mandatory_privacy_text, htmlParams)}</u>
                                )}
                            </span>
                        </CommonCheckBox>
                        {permissionParam?.mandatory_info && (
                            <CommonTooltipIcon text={getHtml(permissionParam.mandatory_info, htmlParams)} customIconClass="skip-toolTip" />
                        )}
                    </div>
                    <div className={sharingAllowedWrapperClassName}>
                        <CommonCheckBox
                            name="sharingAllowed"
                            checked={values.sharingAllowed}
                            onChange={handleChange}
                            label={getHtml(permissionParam?.optional, htmlParams)}
                            className={sharingAllowedClassName}
                        />
                        {permissionParam?.optional_info && (
                            <CommonTooltipIcon
                                text={getHtml(permissionParam.optional_info, htmlParams)}
                                customIconClass="skip-toolTip mt2"
                            />
                        )}
                    </div>
                    {divider ?? defaultDivider}
                    <CommonCheckBox
                        name="rememberPermissions"
                        checked={values.rememberPermissions}
                        onChange={handleChange}
                        label="Remember these preferences whenever I share new comments/photos with Learning with Parents."
                        className={rememberPermissionsClassName}
                    />
                </Card>
            )}

            {!showPhotoPermission && (
                <Card className={summaryCardClassName}>
                    <Paragraph>
                        {`${
                            values.sharingAllowed
                                ? getHtml(permissionParam?.opted_in_summary, htmlParams)
                                : getHtml(permissionParam?.opted_out_summary, htmlParams)
                        } `}
                        <u className="update-link" data-test="update-photo-permission-link" onClick={() => setShowPhotoPermission(true)}>
                            Click here to update this
                        </u>
                        .
                    </Paragraph>
                </Card>
            )}

            <DialogWrapper contentWidth="700px" open={showPolicy} setOpen={() => setShowPolicy(!showPolicy)}>
                {paramsKey?.length ? (
                    <>
                        <h1>Privacy Policy</h1>
                        {privacyPolicy ? (
                            <RenderHtml text={privacyPolicy} />
                        ) : (
                            <RenderHtml
                                text={paramsKey
                                    .filter((data) => data?.title.rendered === 'Privacy and data protection')
                                    .map((data) => data?.content.rendered)
                                    .join('')}
                            />
                        )}
                    </>
                ) : (
                    <CommonLoading />
                )}
            </DialogWrapper>
        </>
    );
};

export default PermissionCheckboxes;
