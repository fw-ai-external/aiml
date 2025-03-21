import * as path from 'path';
import * as vscode from 'vscode';

import os from 'os';
import globby from 'globby';
import { arePathsEqual } from './utils/path';

const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0);

// Note: this is not a drop-in replacement for listFiles at the start of tasks, since that will be done for Desktops when there is no workspace selected
export class WorkspaceTracker {
  private disposables: vscode.Disposable[] = [];
  private filePaths: Set<string> = new Set();

  constructor() {
    this.registerListeners();
  }

  async populateFilePaths() {
    // should not auto get filepaths for desktop since it would immediately show permission popup as soon as the extension is activated
    if (!cwd) {
      return;
    }
    const [files, _] = await this.listFiles(cwd, true, 1_000);
    files.forEach((file) => this.filePaths.add(this.normalizeFilePath(file)));
    this.workspaceDidUpdate();
  }

  private registerListeners() {
    // Listen for file creation
    // .bind(this) ensures the callback refers to class instance when using this, not necessary when using arrow function
    this.disposables.push(vscode.workspace.onDidCreateFiles(this.onFilesCreated.bind(this)));

    // Listen for file deletion
    this.disposables.push(vscode.workspace.onDidDeleteFiles(this.onFilesDeleted.bind(this)));

    // Listen for file renaming
    this.disposables.push(vscode.workspace.onDidRenameFiles(this.onFilesRenamed.bind(this)));

    /*
		 An event that is emitted when a workspace folder is added or removed.
		 **Note:** this event will not fire if the first workspace folder is added, removed or changed,
		 because in that case the currently executing extensions (including the one that listens to this
		 event) will be terminated and restarted so that the (deprecated) `rootPath` property is updated
		 to point to the first workspace folder.
		 */
    // In other words, we don't have to worry about the root workspace folder ([0]) changing since the extension will be restarted and our cwd will be updated to reflect the new workspace folder. (We don't care about non root workspace folders, since we will only be working within the root folder cwd)
    // this.disposables.push(vscode.workspace.onDidChangeWorkspaceFolders(this.onWorkspaceFoldersChanged.bind(this)))
  }

  private async onFilesCreated(event: vscode.FileCreateEvent) {
    await Promise.all(
      event.files.map(async (file) => {
        await this.addFilePath(file.fsPath);
      }),
    );
    this.workspaceDidUpdate();
  }

  private async onFilesDeleted(event: vscode.FileDeleteEvent) {
    let updated = false;
    await Promise.all(
      event.files.map(async (file) => {
        if (await this.removeFilePath(file.fsPath)) {
          updated = true;
        }
      }),
    );
    if (updated) {
      this.workspaceDidUpdate();
    }
  }

  private async onFilesRenamed(event: vscode.FileRenameEvent) {
    await Promise.all(
      event.files.map(async (file) => {
        await this.removeFilePath(file.oldUri.fsPath);
        await this.addFilePath(file.newUri.fsPath);
      }),
    );
    this.workspaceDidUpdate();
  }

  private workspaceDidUpdate() {
    if (!cwd) {
      return;
    }
  }

  private normalizeFilePath(filePath: string): string {
    const resolvedPath = cwd ? path.resolve(cwd, filePath) : path.resolve(filePath);
    return filePath.endsWith('/') ? resolvedPath + '/' : resolvedPath;
  }

  private async addFilePath(filePath: string): Promise<string> {
    const normalizedPath = this.normalizeFilePath(filePath);
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(normalizedPath));
      const isDirectory = (stat.type & vscode.FileType.Directory) !== 0;
      const pathWithSlash = isDirectory && !normalizedPath.endsWith('/') ? normalizedPath + '/' : normalizedPath;
      this.filePaths.add(pathWithSlash);
      return pathWithSlash;
    } catch {
      // If stat fails, assume it's a file (this can happen for newly created files)
      this.filePaths.add(normalizedPath);
      return normalizedPath;
    }
  }

  private async removeFilePath(filePath: string): Promise<boolean> {
    const normalizedPath = this.normalizeFilePath(filePath);
    return this.filePaths.delete(normalizedPath) || this.filePaths.delete(normalizedPath + '/');
  }

  private async listFiles(dirPath: string, recursive: boolean, limit: number): Promise<[string[], boolean]> {
    const absolutePath = path.resolve(dirPath);
    // Do not allow listing files in root or home directory, this is a precautionary measure to prevent memory issues due to OS level cloud syncs
    const root = process.platform === 'win32' ? path.parse(absolutePath).root : '/';
    const isRoot = arePathsEqual(absolutePath, root);
    if (isRoot) {
      return [[root], false];
    }
    const homeDir = os.homedir();
    const isHomeDir = arePathsEqual(absolutePath, homeDir);
    if (isHomeDir) {
      return [[homeDir], false];
    }

    const dirsToIgnore = [
      'node_modules',
      '__pycache__',
      'env',
      'venv',
      'target/dependency',
      'build/dependencies',
      'dist',
      'out',
      'bundle',
      'vendor',
      'tmp',
      'temp',
      'deps',
      'pkg',
      'Pods',
      '.*', // '!**/.*' excludes hidden directories, while '!**/.*/**' excludes only their contents. This way we are at least aware of the existence of hidden directories.
    ].map((dir) => `**/${dir}/**`);

    const options = {
      cwd: dirPath,
      dot: true, // do not ignore hidden files/directories
      absolute: true,
      markDirectories: true, // Append a / on any directories matched (/ is used on windows as well, so dont use path.sep)
      gitignore: recursive, // globby ignores any files that are gitignored
      ignore: recursive ? dirsToIgnore : undefined, // just in case there is no gitignore, we ignore sensible defaults
      onlyFiles: false, // true by default, false means it will list directories on their own too
    };

    // * globs all files in one dir, ** globs files in nested directories
    const filePaths = recursive
      ? await this.globbyLevelByLevel(limit, options)
      : (await globby('*', options)).slice(0, limit);

    return [filePaths, filePaths.length >= limit];
  }
  /**
   * Breadth-first traversal of directory structure level by level up to a limit:
   *   - Queue-based approach ensures proper breadth-first traversal
   *   - Processes directory patterns level by level
   *   - Captures a representative sample of the directory structure up to the limit
   *   - Minimizes risk of missing deeply nested files
   * Notes:
   *   - Relies on globby to mark directories with /
   *   - Potential for loops if symbolic links reference back to parent (we could use followSymlinks: false but that may not be ideal for some projects and it's pointless if they're not using symlinks wrong)
   *   - Timeout mechanism prevents infinite loops
   */
  private async globbyLevelByLevel(limit: number, options?: globby.GlobbyOptions) {
    let results: Set<string> = new Set();
    let queue: string[] = ['*'];

    const globbingProcess = async () => {
      while (queue.length > 0 && results.size < limit) {
        const pattern = queue.shift()!;
        const filesAtLevel = await globby(pattern, options);

        for (const file of filesAtLevel) {
          if (results.size >= limit) {
            break;
          }
          results.add(file);
          if (file.endsWith('/')) {
            queue.push(`${file}*`);
          }
        }
      }
      return Array.from(results).slice(0, limit);
    };

    // Timeout after 10 seconds and return partial results
    const timeoutPromise = new Promise<string[]>((_, reject) => {
      setTimeout(() => reject(new Error('Globbing timeout')), 10_000);
    });
    try {
      return await Promise.race([globbingProcess(), timeoutPromise]);
    } catch (error) {
      console.warn('Globbing timed out, returning partial results');
      return Array.from(results);
    }
  }

  public dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
