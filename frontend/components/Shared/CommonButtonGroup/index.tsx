import { Button, ButtonGroup, Grid } from '@mui/material';
import React, { ReactNode } from 'react';

interface groupBtnProps {
    key?: string | number;
    name?: string;
    dataTest?: string;
}

interface CommonButtonGroupProps {
    groupBtn?: string[] | groupBtnProps[];
    select: string;
    onClick: (btn: string, item: groupBtnProps) => void;
    children?: ReactNode;
    width?: string | number;
}

const CommonButtonGroup = ({ groupBtn = [], select, onClick, children, width }: CommonButtonGroupProps) => {
    return (
        <Grid>
            <div className="button_group_btn_group">
                <ButtonGroup className="btn_group">
                    {groupBtn?.map((item) => {
                        const btnName = typeof item === 'string' ? item : item?.name;
                        const btnKey = typeof item === 'string' ? item : item?.key;

                        return (
                            <Button
                                key={btnKey}
                                data-test={typeof item === 'string' ? `${item?.toLowerCase()}-button` : item?.dataTest}
                                className={`${btnKey === select ? 'btn_group_active' : 'btn_group_rest'} btn_group_type`}
                                style={{ width }}
                                onClick={() => {
                                    onClick(btnKey, item);
                                }}>
                                {children ?? btnName}
                            </Button>
                        );
                    })}
                </ButtonGroup>
            </div>
        </Grid>
    );
};

export default CommonButtonGroup;
