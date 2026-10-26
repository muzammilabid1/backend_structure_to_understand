import { Skeleton } from '@mui/material';
import { range, toLower, trim } from 'lodash';
import React from 'react';

import { safeTitleise } from '../../../shared/utils';
import CommonBookFinishedPopoverMenu from '../CommonBookFinishedPopoverMenu';
import Paragraph from '../Typography/Paragraph';

interface SuggestedBook {
    bookName: string;
    isBookFinished?: boolean;
    pageNumber?: string | null;
}

interface SelectLoggedBookNameProps {
    suggestedBookNames: SuggestedBook[];
    handleOnSelect: (bookName: string) => void;
    bookName: string;
    disableViewAsParent?: boolean;
    loading?: boolean;
}

const SelectLoggedBookName = ({
    suggestedBookNames,
    handleOnSelect,
    bookName,
    disableViewAsParent = false,
    loading = false
}: SelectLoggedBookNameProps) => {
    return (
        <div className="suggested-books-container">
            {loading
                ? range(3).map((n) => <Skeleton key={n} variant="rounded" width={'33.33%'} height={75} />)
                : suggestedBookNames
                      .map((item) => {
                          const titleizedBookName = safeTitleise(item?.bookName);

                          if (!titleizedBookName) return null;

                          return (
                              <div
                                  className={`suggested-books-card ${
                                      item?.bookName === trim(toLower(bookName)) ? 'suggested-books-card-active' : ''
                                  } ${disableViewAsParent ? 'disabled' : ''}`}
                                  onClick={() => handleOnSelect(titleizedBookName)}>
                                  <Paragraph text={titleizedBookName} />
                                  <CommonBookFinishedPopoverMenu
                                      className="book-finished-icon"
                                      isBookFinished={item.isBookFinished}
                                      pageNumber={item.pageNumber}
                                  />
                              </div>
                          );
                      })
                      .filter(Boolean)}
        </div>
    );
};

export default SelectLoggedBookName;
