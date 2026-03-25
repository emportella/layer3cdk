import { StackEnv } from '../core';

export type EnvConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key in StackEnv]: any;
};
