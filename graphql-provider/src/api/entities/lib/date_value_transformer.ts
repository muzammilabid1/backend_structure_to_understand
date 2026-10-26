import moment from 'moment';

export const dateValueTransformer = {
    from(value: string): string | null {
        return value ? moment(value).format('YYYY-MM-DD') : null;
    },
    to(value: string): string {
        return value;
    }
};
