import { PluginSettingsBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsBase';
import { escapeRegExp } from 'obsidian-dev-utils/RegExp';

const ALWAYS_MATCH_REG_EXP = /(?:)/;
const NEVER_MATCH_REG_EXP = /$./;

interface LegacySettings extends ConsistentAttachmentsAndLinksPluginSettings {
  ignoreFiles: string[];
  ignoreFolders: string[];
}

export class ConsistentAttachmentsAndLinksPluginSettings extends PluginSettingsBase {
  public autoCollectAttachments = false;

  public changeNoteBacklinksAlt = true;
  public consistencyReportFile = 'consistency-report.md';
  public deleteAttachmentsWithNote = true;
  public deleteEmptyFolders = true;
  public deleteExistFilesWhenMoveNote = true;
  public moveAttachmentsWithNote = true;
  public showWarning = true;
  public updateLinks = true;
  public get excludePaths(): string[] {
    return this.#excludePaths;
  }

  public set excludePaths(value: string[]) {
    this.#excludePaths = value.filter(Boolean);
    this.#excludePathsRegExp = makeRegExp(this.#excludePaths, NEVER_MATCH_REG_EXP);
  }

  public get includePaths(): string[] {
    return this.#includePaths;
  }

  public set includePaths(value: string[]) {
    this.#includePaths = value.filter(Boolean);
    this.#includePathsRegExp = makeRegExp(this.#includePaths, ALWAYS_MATCH_REG_EXP);
  }

  #excludePaths: string[] = [];

  #excludePathsRegExp = NEVER_MATCH_REG_EXP;

  #includePaths: string[] = [];
  #includePathsRegExp = ALWAYS_MATCH_REG_EXP;
  public constructor(data: unknown) {
    super();
    this.excludePaths = ['/consistency-report\\.md$/'];
    this.init(data);
  }

  public override initFromRecord(record: Record<string, unknown>): void {
    const legacySettings = record as Partial<LegacySettings>;

    if (legacySettings.ignoreFiles || legacySettings.ignoreFolders) {
      const excludePaths = legacySettings.excludePaths ?? [];

      for (const ignoreFileRegExpStr of legacySettings.ignoreFiles ?? []) {
        excludePaths.push(`/${ignoreFileRegExpStr}$/`);
      }

      for (const ignoreFolder of legacySettings.ignoreFolders ?? []) {
        excludePaths.push(ignoreFolder);
      }

      if (excludePaths.length > 0) {
        legacySettings.excludePaths = excludePaths;
      }

      delete legacySettings.ignoreFiles;
      delete legacySettings.ignoreFolders;
    }

    super.initFromRecord(legacySettings);
  }

  public isPathIgnored(path: string): boolean {
    return !this.#includePathsRegExp.test(path) || this.#excludePathsRegExp.test(path);
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      excludePaths: this.excludePaths,
      includePaths: this.includePaths
    };
  }
}

function makeRegExp(paths: string[], defaultRegExp: RegExp): RegExp {
  if (paths.length === 0) {
    return defaultRegExp;
  }

  const regExpStrCombined = paths.map((path) => {
    if (path.startsWith('/') && path.endsWith('/')) {
      return path.slice(1, -1);
    }
    return `^${escapeRegExp(path)}`;
  })
    .map((regExpStr) => `(${regExpStr})`)
    .join('|');
  return new RegExp(regExpStrCombined);
}
