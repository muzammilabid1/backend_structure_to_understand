/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormHelperText } from '@mui/material';
import React from 'react';

interface CommonErrorProps {
    error?: any;
    touched?: any;
}

const CommonError = ({ error = '', touched = false }: CommonErrorProps) =>
    touched && error ? (
        <FormHelperText className="error-text">
            <span className="material-icons error-icon">error_outline </span>
            {error}
        </FormHelperText>
    ) : null;

export default CommonError;
