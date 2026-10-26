import { type ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
    protected throwThrottlingException(): never {
        throw new ThrottlerException('Too many attempts, please try again in a minute');
    }

    protected getRequestResponse(context: ExecutionContext): { req: Request; res: Response } {
        const gqlCtx = GqlExecutionContext.create(context);
        const ctx = gqlCtx.getContext();

        return { req: ctx.req, res: ctx.res };
    }
}
