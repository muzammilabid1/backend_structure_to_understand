import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import moment from 'moment';

@Scalar('DateOnly')
export class DateOnly implements CustomScalar<string, Date> {
    description = 'Date custom scalar type in YYYY-MM-DD format';

    parseValue(value: string): Date {
        // Convert incoming string to Date
        return moment(value, 'YYYY-MM-DD').toDate();
    }

    serialize(value: Date): string | null {
        // Format outgoing Date to "YYYY-MM-DD" for frontend
        return value ? moment(value).format('YYYY-MM-DD') : null;
    }

    parseLiteral(ast: ValueNode): Date | null {
        // Convert hardcoded AST string to Date if valid
        if (ast.kind === Kind.STRING) {
            return moment(ast.value, 'YYYY-MM-DD').toDate();
        }

        return null;
    }
}
