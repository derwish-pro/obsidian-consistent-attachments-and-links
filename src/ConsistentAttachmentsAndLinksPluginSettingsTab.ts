import {
  setIcon,
  Setting
} from 'obsidian';
import { appendCodeBlock } from 'obsidian-dev-utils/HTMLElement';
import { alert } from 'obsidian-dev-utils/obsidian/Modal/Alert';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { extend } from 'obsidian-dev-utils/obsidian/Plugin/ValueComponent';
import { isValidRegExp } from 'obsidian-dev-utils/RegExp';

import type { ConsistentAttachmentsAndLinksPlugin } from './ConsistentAttachmentsAndLinksPlugin.ts';
import type { ConsistentAttachmentsAndLinksPluginSettings } from './ConsistentAttachmentsAndLinksPluginSettings.ts';

export class ConsistentAttachmentsAndLinksPluginSettingsTab extends PluginSettingsTabBase<ConsistentAttachmentsAndLinksPlugin> {
  public override display(): void {
    this.containerEl.empty();

    const moveAttachmentsWithNoteSettingName = 'Move Attachments with Note';
    new Setting(this.containerEl)
      .setName(moveAttachmentsWithNoteSettingName)
      .setDesc('Automatically move attachments when a note is relocated. This includes attachments located in the same folder or any of its subfolders.')
      .addToggle((toggle) => extend(toggle).bind(this.plugin, 'moveAttachmentsWithNote', {
        onChanged: async () => {
          await this.checkDangerousSetting('moveAttachmentsWithNote', moveAttachmentsWithNoteSettingName);
        }
      }));

    const deleteAttachmentsWithNoteSettingName = 'Delete Unused Attachments with Note';
    new Setting(this.containerEl)
      .setName(deleteAttachmentsWithNoteSettingName)
      .setDesc('Automatically remove attachments that are no longer referenced in other notes when the note is deleted.')
      .addToggle((toggle) => extend(toggle).bind(this.plugin, 'deleteAttachmentsWithNote', {
        onChanged: async () => {
          await this.checkDangerousSetting('deleteAttachmentsWithNote', deleteAttachmentsWithNoteSettingName);
        }
      }));

    new Setting(this.containerEl)
      .setName('Update Links')
      .setDesc('Automatically update links to attachments and other notes when moving notes or attachments.')
      .addToggle((toggle) => extend(toggle).bind(this.plugin, 'updateLinks'));

    new Setting(this.containerEl)
      .setName('Delete Empty Folders')
      .setDesc('Automatically remove empty folders after moving notes with attachments.')
      .addToggle((toggle) => extend(toggle).bind(this.plugin, 'deleteEmptyFolders'));

    const deleteExistFilesWhenMoveNoteSettingName = 'Delete Duplicate Attachments on Note Move';
    new Setting(this.containerEl)
      .setName(deleteExistFilesWhenMoveNoteSettingName)
      .setDesc('Automatically delete attachments when moving a note if a file with the same name exists in the destination folder. If disabled, the file will be renamed and moved.')
      .addToggle((toggle) => extend(toggle).bind(this.plugin, 'deleteExistFilesWhenMoveNote', {
        onChanged: async () => {
          await this.checkDangerousSetting('deleteExistFilesWhenMoveNote', deleteExistFilesWhenMoveNoteSettingName);
        }
      }));

    new Setting(this.containerEl)
      .setName('Update Backlink Text on Note Rename')
      .setDesc('When a note is renamed, its linked references are automatically updated. If this option is enabled, the text of backlinks to this note will also be modified.')
      .addToggle((toggle) => extend(toggle).bind(this.plugin, 'changeNoteBacklinksAlt'));

    new Setting(this.containerEl)
      .setName('Consistency Report Filename')
      .setDesc('Specify the name of the file for the consistency report.')
      .addText((text) => extend(text).bind(this.plugin, 'consistencyReportFile')
        .setPlaceholder('Example: consistency-report.md')
      );

    const pathBindSettings = {
      componentToPluginSettingsValueConverter: (value: string): string[] => value.split('\n').filter(Boolean),
      pluginSettingsToComponentValueConverter: (value: string[]): string => value.join('\n'),
      valueValidator: (value: string): null | string => {
        const paths = value.split('\n');
        for (const path of paths) {
          if (path.startsWith('/') && path.endsWith('/')) {
            const regExp = path.slice(1, -1);
            if (!isValidRegExp(regExp)) {
              return `Invalid regular expression ${path}`;
            }
          }
        }
        return null;
      }
    };

    const autoCollectAttachmentsSettingName = 'Auto Collect Attachments';
    new Setting(this.containerEl)
      .setName(autoCollectAttachmentsSettingName)
      .setDesc('Automatically collect attachments when the note is edited.')
      .addToggle((toggle) => extend(toggle).bind(this.plugin, 'autoCollectAttachments', {
        onChanged: async () => {
          await this.checkDangerousSetting('autoCollectAttachments', autoCollectAttachmentsSettingName);
        }
      }));

    new Setting(this.containerEl)
      .setName('Include paths')
      .setDesc(createFragment((f) => {
        f.appendText('Include notes from the following paths');
        f.createEl('br');
        f.appendText('Insert each path on a new line');
        f.createEl('br');
        f.appendText('You can use path string or ');
        appendCodeBlock(f, '/regular expression/');
        f.createEl('br');
        f.appendText('If the setting is empty, all notes are included');
      }))
      .addTextArea((textArea) => extend(textArea).bind(this.plugin, 'includePaths', pathBindSettings));

    new Setting(this.containerEl)
      .setName('Exclude paths')
      .setDesc(createFragment((f) => {
        f.appendText('Exclude notes from the following paths');
        f.createEl('br');
        f.appendText('Insert each path on a new line');
        f.createEl('br');
        f.appendText('You can use path string or ');
        appendCodeBlock(f, '/regular expression/');
        f.createEl('br');
        f.appendText('If the setting is empty, no notes are excluded');
      }))
      .addTextArea((textArea) => extend(textArea).bind(this.plugin, 'excludePaths', pathBindSettings));
  }

  private async checkDangerousSetting(settingKey: keyof ConsistentAttachmentsAndLinksPluginSettings, settingName: string): Promise<void> {
    if (!this.plugin.settingsCopy[settingKey]) {
      return;
    }

    await alert({
      app: this.app,
      message: createFragment((f) => {
        f.createDiv({ cls: 'community-modal-readme' }, (wrapper) => {
          wrapper.appendText('You enabled ');
          wrapper.createEl('strong', { cls: 'markdown-rendered-code', text: settingName });
          wrapper.appendText(' setting. Without proper configuration it might lead to inconvenient attachment rearrangements or even data loss in your vault.');
          wrapper.createEl('br');
          wrapper.appendText('It is ');
          wrapper.createEl('strong', { text: 'STRONGLY' });
          wrapper.appendText(' recommended to backup your vault before using the plugin.');
          wrapper.createEl('br');
          wrapper.createEl('a', { href: 'https://github.com/dy-sh/obsidian-consistent-attachments-and-links?tab=readme-ov-file', text: 'Read more' });
          wrapper.appendText(' about how to use the plugin.');
        });
      }),
      title: createFragment((f) => {
        setIcon(f.createSpan(), 'triangle-alert');
        f.appendText(' Consistent Attachments and Links');
      })
    });
  }
}
