import { ABEnvironment } from '../common';

export type EnvConfig = {
  [key in ABEnvironment]: any;
};
