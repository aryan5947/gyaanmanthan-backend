import 'express-serve-static-core';
import { IUser } from '../models/User.ts';

declare module 'express-serve-static-core' {
  interface Request {
    user?: Pick<
      IUser,
      'id' | 'name' | 'username' | 'email' | 'avatarUrl' | 'plan' | 'walletBalance'
    > & { _id?: any; role?: IUser['role'] };
  }
}
