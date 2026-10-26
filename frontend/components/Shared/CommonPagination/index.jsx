import Pagination from '@mui/material/Pagination';
import PropTypes from 'prop-types';
import React from 'react';

const CommonPagination = ({ count, onChange, disabled, defaultPage, color = 'primary', page }) => {
    return (
        <Pagination
            className="common_pagination"
            count={count}
            defaultPage={defaultPage}
            disabled={disabled}
            color={color}
            onChange={onChange}
            page={page}
        />
    );
};

CommonPagination.propTypes = {
    count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    color: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    defaultPage: PropTypes.number,
    page: PropTypes.number
};

CommonPagination.defaultProps = {
    count: 10,
    onChange: () => {}
};

export default CommonPagination;

// add below code on parent component //
// const [defaultPage, setDefaultPage] = useState(1);

// useEffect(() => {
//     if (token?.sub) getPupilActivityFeedsQuery({ variables: { teacherId: token.sub, offset: 0, limit: PAGINATION_ITEM_LIMIT } });
// }, [token]);

// const _fetchMore = (page) => {
//     setDefaultPage(page);
//     const offset = _onSkip(page, feeds.length);
//     getPupilActivityFeedsQuery({ variables: { teacherId: token.sub, offset, limit: PAGINATION_ITEM_LIMIT } });
// };

// <CommonPagination
//     disabled={loading}
//     defaultPage={defaultPage}
//     onChange={(event, page) => _fetchMore(page)}
//     count={_getPagesCount(pupilActivityFeeds?.getPupilActivityFeeds?.total)}
// />
