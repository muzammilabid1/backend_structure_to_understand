import { makeStyles } from '@mui/styles';
import React from 'react';

const useStyles = makeStyles({
    loadingarea: {
        height: '42px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        backgroundColor: '#F8F8F8',
        marginBottom: '16px'
    },
    loadingBtn: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center'
    }
});

interface FetchMoreLoadingProps {
    className?: string;
    loading?: boolean;
    onClick: () => void;
}

const FetchMoreLoading = ({ className = '', loading = false }: FetchMoreLoadingProps) => {
    const classes = useStyles();

    return loading ? (
        <div className={`${className} ${classes.loadingarea}`}>
            <div className="fetch_more_loader">
                <span className="fetch_more_loader__dot"></span>
                <span className="fetch_more_loader__dot"></span>
                <span className="fetch_more_loader__dot"></span>
            </div>
        </div>
    ) : null;
};

export default FetchMoreLoading;
