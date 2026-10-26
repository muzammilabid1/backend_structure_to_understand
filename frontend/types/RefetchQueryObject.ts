import { DocumentNode } from '@apollo/client';

export interface RefetchQueryObject {
    query: DocumentNode;
    variables: Record<string, string>;
}
