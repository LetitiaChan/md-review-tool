import * as vscode from 'vscode';

export class StateService {
    constructor(private context: vscode.ExtensionContext) {}

    get<T>(key: string): T | undefined {
        return this.context.workspaceState.get<T>(key);
    }

    async set(key: string, value: any): Promise<void> {
        await this.context.workspaceState.update(key, value);
    }

    async remove(key: string): Promise<void> {
        await this.context.workspaceState.update(key, undefined);
    }
}
