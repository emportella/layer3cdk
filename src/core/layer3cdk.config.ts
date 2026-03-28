import * as fs from 'fs';

/**
 * Mode for configurable sections.
 * - `extend` — merge/concat with library defaults
 * - `override` — replace library defaults entirely.
 *   Use override to **strip** the built-in defaults and supply your own.
 *
 * ### Override behavior per section
 *
 * | Section         | Override with empty values          | Outcome                                                                 |
 * |-----------------|------------------------------------|-------------------------------------------------------------------------|
 * | `envs`          | `{ mode: "override", values: [] }` | Falls back to `["main"]` so the app can still start.                    |
 * | `departments`   | `{ mode: "override", values: [] }` | Strips all defaults; department validation is **disabled**.              |
 * | `tags`          | `{ mode: "override", values: {} }` | Strips all default tag keys; only `Eng:Env` (auto-set) will remain.     |
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
 *   "team": "Layer3",
 *   "department": "pltf",
 *   "envs": { "mode": "extend", "values": ["qa", "perf"] },
 *   "departments": { "mode": "override", "values": ["eng", "ops", "data"] },
 *   "tags": { "mode": "extend", "values": { "Ownership:CostCenter": "CC-PLTF" } }
 * }
 * ```
 *
 * ### Default tags
 * Default tags (from {@link DEFAULT_TAGS}) use PascalCase colon-namespaced keys:
 * `Eng:Env`, `Ownership:Department`, `Ownership:Organization`, `Ownership:Team`,
 * `Eng:Application`, `Eng:Repository`, `Eng:ManagedBy`.
 *
 * - `extend` — adds your keys on top of the defaults.
 * - `override` — strips **all** defaults; only your supplied keys remain
 *   (plus `Eng:Env` which is always auto-set by the library).
 */
export interface Layer3Config {
  /** Team owning the stack */
  team?: string;
  /** Department (business unit) */
  department?: string;
  /**
   * Environment definitions — extend or override the defaults (`dev`, `stg`, `prd`).
   * Override with an empty array falls back to `["main"]`.
   */
  envs?: ConfigSection<string[]>;
  /**
   * Department definitions — extend or override the defaults.
   * Override with an empty array disables department validation entirely.
   */
  departments?: ConfigSection<string[]>;
  /**
   * Tags — extend or override the defaults.
   * Override with an empty object strips all default tag keys;
   * only `Eng:Env` (auto-set) will remain on resources.
   */
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
