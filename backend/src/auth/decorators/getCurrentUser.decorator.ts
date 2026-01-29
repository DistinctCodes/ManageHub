import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type AnyRequest = { user?: unknown };

export const GetCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AnyRequest>();
    return request.user;
  },
);

export const GetCurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AnyRequest>();
    const user = request.user as { id?: string } | undefined;
    return user?.id;
  },
);
