import titleize from 'titleizejs';

export const FALLBACK_BOOK_NAME = 'Untitled book';

export const safeTitleise = (normalisedBookName: unknown) => {
    if (typeof normalisedBookName !== 'string' || !normalisedBookName?.trim()) {
        return FALLBACK_BOOK_NAME;
    }
    try {
        // sanitise the input to titleize
        // (titleize throws an error when it encounteres certain hyphenated strings)
        const sanitised = normalisedBookName
            .replace(/^\s*-+/, '') // strip leading hyphens
            .replace(/-+\s*$/, '') // strip trailing hyphens
            .replaceAll(/(?:\s*-\s+)|(?:\s+-\s*)/g, ' — '); // replace delimiting hyphens with em dashes

        const titleised = titleize(sanitised);

        return titleised;
    } catch (err) {
        return FALLBACK_BOOK_NAME;
    }
};
