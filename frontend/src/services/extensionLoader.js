/**
 * Monaco Extension Loader Service
 * Handles the registration of snippets and language features 
 * extracted from real VS Code extension packages.
 */

import { useExtensionStore } from '../store';

class ExtensionLoader {
    constructor() {
        this.registeredProviders = new Set();
        this.isInitialized = false;
    }

    /**
     * Load all contributions from currently installed extensions
     */
    async loadActiveExtensions(monaco) {
        if (!monaco) return;

        console.log(">>> ExtensionLoader: Loading active extensions...");
        const { installedExtensions } = useExtensionStore.getState();

        // Clear old ones (optional but safer for dynamic install/uninstall)
        this.disposeAll();

        installedExtensions.forEach(ext => {
            if (ext.snippets && ext.snippets.length > 0) {
                this.registerExtensionSnippets(monaco, ext);
            }
        });

        this.isInitialized = true;
    }

    /**
     * Register snippets from a specific extension
     */
    registerExtensionSnippets(monaco, ext) {
        ext.snippets.forEach(snippetSet => {
            const language = snippetSet.language;
            if (!language) return;

            try {
                // Snippet content is a JSON string or object
                const snippetsRaw = typeof snippetSet.content === 'string'
                    ? JSON.parse(snippetSet.content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '')) // Strip comments
                    : snippetSet.content;

                const provider = monaco.languages.registerCompletionItemProvider(language, {
                    provideCompletionItems: (model, position) => {
                        const suggestions = [];

                        for (const name in snippetsRaw) {
                            const snippet = snippetsRaw[name];
                            const body = Array.isArray(snippet.body) ? snippet.body.join('\n') : snippet.body;

                            suggestions.push({
                                label: snippet.prefix || name,
                                kind: monaco.languages.CompletionItemKind.Snippet,
                                documentation: snippet.description || name,
                                insertText: body,
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                detail: `From Extension: ${ext.displayName}`
                            });
                        }

                        return { suggestions };
                    }
                });

                this.registeredProviders.add(provider);
                console.log(`>>> Registered snippets for ${language} from ${ext.displayName}`);
            } catch (err) {
                console.error(`Failed to parse snippets for ${language} in ${ext.id}:`, err);
            }
        });
    }

    /**
     * Clean up all registered providers
     */
    disposeAll() {
        this.registeredProviders.forEach(p => {
            if (p && typeof p.dispose === 'function') {
                p.dispose();
            }
        });
        this.registeredProviders.clear();
    }
}

export const extensionLoader = new ExtensionLoader();
