import { GqlExecutionContext } from '@nestjs/graphql';
import { IncomingMessage, ServerResponse } from 'http';

import { AuthenticatedContext } from '../authentication.guard';

/**
 * Mocks the `authorization` header.
 *
 * @export
 * @param {string} header
 * @param {(AuthenticatedContext) => void} callback the place to do things with the header set
 */
export async function mockAuthHeader(
    header: string,
    callback: (apolloContext: AuthenticatedContext) => void | Promise<void>
): Promise<void> {
    const getContext = jest.fn();

    const originalCreate = GqlExecutionContext.create;

    const mockedCreate = jest.spyOn(GqlExecutionContext, 'create');

    mockedCreate.mockImplementation((ctx) => {
        const context = originalCreate(ctx);

        context.getContext = getContext;

        return context;
    });

    const incoming = new IncomingMessage(null);

    incoming.headers.authorization = header;

    const apolloContext = {
        req: incoming,
        res: new ServerResponse<IncomingMessage>(incoming)
    };

    getContext.mockImplementation(() => apolloContext);

    await callback(apolloContext as AuthenticatedContext);

    mockedCreate.mockRestore();
}
