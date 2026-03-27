import * as fs from 'fs';

/**
 * Mode for configurable sections.
 * - `extend`: merge/concat with library defaults
 * - `override`: replace library defaults entirely
 */
export type ConfigMode = 'extend' | 'override';

/**
 * A configurable section that can extend or override library defaults.
 */
export interface ConfigSection<T> {
  mode: ConfigMode;
  values: T;
}

/**
 * Structured configuration for Layer3CDK.
 * Passed via CDK context key `layer3cdk` — either as:
 * - A file path ending in `.json` (read from disk)
 * - An inline JSON string
 * - An object in `cdk.json` context
 *
 * All fields are optional. When omitted, library defaults apply.
 *
 * @example
 * ```json
 * {
 *   "team": "platform-eng",
 *   "department": "infra",
 *   "envs": { "mode": "extend", "values": ["qa", "perf"] },
 *   "departments": { "mode": "override", "values": ["eng", "ops", "data"] },
 *   "tags": { "mode": "extend", "values": { "cost-center": "CC-123" } }
 * }
 * ```
 */
export interface Layer3Config {
  /** Team owning the stack */
  team?: string;
  /** Department (business unit) */
  department?: string;
  /** Environment definitions — extend or override the defaults */
  envs?: ConfigSection<string[]>;
  /** Department definitions — extend or override the defaults */
  departments?: ConfigSection<string[]>;
  /** Tags — extend or override */
  tags?: ConfigSection<Record<string, string>>;
}

/**
 * Resolves a config section against defaults.
 * - If section is undefined → returns defaults (use defaults)
 * - If mode is `extend` → merges/concats with defaults
 * - If mode is `override` → returns section values only
 */
export function resolveArraySection(
  defaults: readonly string[] | string[],
  section: ConfigSection<string[]> | undefined,
): string[] {
  if (section === undefined) {
    return [...defaults];
  }
  if (section.mode === 'extend') {
    return [...new Set([...defaults, ...section.values])];
  }
  return [...section.values];
}

/**
 * Resolves an object config section against defaults.
 * - If section is undefined → returns defaults
 * - If mode is `extend` → spreads defaults then section values on top
 * - If mode is `override` → returns section values only
 */
export function resolveObjectSection(
  defaults: Record<string, string>,
  section: ConfigSection<Record<string, string>> | undefined,
): Record<string, string> {
  if (section === undefined) {
    return { ...defaults };
  }
  if (section.mode === 'extend') {
    return { ...defaults, ...section.values };
  }
  return { ...section.values };
}

/**
 * Loads a Layer3Config from a CDK context value.
 * Supports: file path (.json), JSON string, or pre-parsed object.
 */
export function loadLayer3Config(
  raw: string | object | undefined,
): Layer3Config {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (typeof raw === 'object') {
    return raw as Layer3Config;
  }
  if (typeof raw === 'string') {
    if (raw.endsWith('.json')) {
      try {
        const content = fs.readFileSync(raw, 'utf-8');
        return JSON.parse(content) as Layer3Config;
      } catch (err) {
        throw new Error(
          `[Layer3CDK] Failed to load config from file "${raw}": ${(err as Error).message}`,
        );
      }
    }
    try {
      return JSON.parse(raw) as Layer3Config;
    } catch {
      throw new Error(
        `[Layer3CDK] Invalid JSON in -c layer3cdk context value.`,
      );
    }
  }
  return {};
}
