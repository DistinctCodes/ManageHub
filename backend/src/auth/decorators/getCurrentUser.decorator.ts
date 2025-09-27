import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

export const GetCurrentUser = createParamDecorator(
  (key: keyof User | undefined, ctx: ExecutionContext): User | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return key ? user?.[key] : user;
  },
);
