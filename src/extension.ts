'use strict';

import * as vscode from 'vscode';
import { exec } from 'child_process';

declare type UpdateStatusBarItemCallback = (projectName: string | undefined) => void;

export function activate(context: vscode.ExtensionContext) {
    let onDidChangeWorkspaceFoldersDisposable: vscode.Disposable | undefined;
    let onDidChangeActiveTextEditorDisposable: vscode.Disposable | undefined;

    const statusBarItem = vscode.window.createStatusBarItem(getAlign(), alignPriority());

    context.subscriptions.push(statusBarItem);

    vscode.workspace.onDidChangeConfiguration(() => {
        updateSubscribtion();
        updateStatusBarItem();
    });

    updateSubscribtion();
    updateStatusBarItem();


    function updateSubscribtion() {
        if (getSource() === 'none') {
            onDidChangeWorkspaceFoldersDisposable && onDidChangeWorkspaceFoldersDisposable.dispose();
            onDidChangeActiveTextEditorDisposable && onDidChangeActiveTextEditorDisposable.dispose();
            onDidChangeWorkspaceFoldersDisposable = undefined;
            onDidChangeActiveTextEditorDisposable = undefined;
        } else {
            !onDidChangeWorkspaceFoldersDisposable &&
                (onDidChangeWorkspaceFoldersDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
                    updateSubscribtion();
                    updateStatusBarItem();
                }));

            Array.isArray(vscode.workspace.workspaceFolders) && (vscode.workspace.workspaceFolders.length > 1)
                ? !onDidChangeActiveTextEditorDisposable && (onDidChangeActiveTextEditorDisposable =
                    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBarItem()))
                : onDidChangeActiveTextEditorDisposable && onDidChangeActiveTextEditorDisposable.dispose();
        }
    }

    function getSource(): string {
        return <string>vscode.workspace.getConfiguration('projectNameInStatusBar').get('source');
    }

    function getCommand(): string {
        return <string>vscode.workspace.getConfiguration('projectNameInStatusBar').get('command');
    }

    function getTextStyle(): string {
        return <string>vscode.workspace.getConfiguration('projectNameInStatusBar').get('textStyle');
    }

    function getAlign(): vscode.StatusBarAlignment {
        const align: string = <string>vscode.workspace.getConfiguration('projectNameInStatusBar').get('align');
        switch (align) {
            case 'left':
                return vscode.StatusBarAlignment.Left;
            case 'right':
                return vscode.StatusBarAlignment.Right;
            default:
                return vscode.StatusBarAlignment.Right;
        }
    }

    function alignPriority(): number {
        return <number>vscode.workspace.getConfiguration('projectNameInStatusBar').get('alignPriority');
    }

    function getTemplate(): string {
        return <string>vscode.workspace.getConfiguration('projectNameInStatusBar').get('template');
    }

    function updateStatusBarItem() {
        getProjectName(projectName => {
            if (projectName) {
                switch (getTextStyle()) {
                    case 'uppercase':
                        projectName = projectName.toUpperCase();
                        break;
                    case 'lowercase':
                        projectName = projectName.toLowerCase();
                        break;
                }

                statusBarItem.text = getTemplate().replace('${project-name}', projectName);
                statusBarItem.show();
            } else {
                statusBarItem.text = '';
                statusBarItem.hide();
            }
        });
    }
    
    function getProjectName(callback: UpdateStatusBarItemCallback) {
        const source: string = getSource();
        const command: string = getCommand();
        switch (source) {
            case 'none':
                break;
            case 'folderName':
                callback(getProjectNameByFolder());
                break;
            case 'commandOutput':
                if (command) {
                    getProjectNameByCommand(command, callback);
                }
                break;
        }
    }

    function getProjectNameByFolder(): string | undefined {
        if (Array.isArray(vscode.workspace.workspaceFolders)) {
            if (vscode.workspace.workspaceFolders.length === 1) {
                return vscode.workspace.workspaceFolders[0].name;
            } else if (vscode.workspace.workspaceFolders.length > 1) {
                const activeTextEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
                if (activeTextEditor) {
                    const workspaceFolder: vscode.WorkspaceFolder | undefined =
                        vscode.workspace.workspaceFolders.find(folder =>
                            activeTextEditor.document.uri.path.startsWith(folder.uri.path)
                        );
                    if (workspaceFolder) {
                        return workspaceFolder.name;
                    }
                }
            }
        }
    }

    function getProjectNameByCommand(command: string, callback: (projectName: string) => void) {
        let workspaceFolder = (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.path);
        let cwd = (workspaceFolder || '');

        exec(command, {cwd: cwd}, (error, stdout, stderr) => {
            let projectName = '';
            if (error) {
                console.log(`Command failed with error: ${error.message}`);
            }
            else if (stderr) {
                console.log(`Command failed with stderr: ${stderr}`);
            }
            else {
                projectName = stdout.split('\n')[0].trim();
            }
            callback(projectName);
        });
    }
}



export function deactivate() {
}
