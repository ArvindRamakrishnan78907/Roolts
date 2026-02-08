import { useEffect, useRef } from 'react';
import { useFileStore } from '../store';
import fileSyncService from '../services/fileSyncService';
import backgroundEnvManager from '../services/backgroundEnvManager';

/**
 * Auto-save hook that saves file changes to Docker container
 * Saves when:
 * 1. User switches to a different file
 * 2. After a debounce period of inactivity (2 seconds)
 * 3. Component unmounts
 */
export function useAutoSave() {
    const { files, activeFileId, markFileSaved } = useFileStore();
    const saveTimeoutRef = useRef(null);
    const previousFileIdRef = useRef(null);
    const isSavingRef = useRef(false);

    // Save file to Docker container
    const saveFile = async (file) => {
        if (!file || !file.modified || isSavingRef.current) {
            return;
        }

        // Check if virtual environment is available
        if (!backgroundEnvManager.isVirtualEnvAvailable()) {
            console.warn('[AutoSave] Virtual environment not available, skipping save');
            return;
        }

        isSavingRef.current = true;

        try {
            console.log('[AutoSave] Saving file to Docker:', file.name);

            // Push file content to Docker container
            const success = await fileSyncService.pushFile(file.path, file.content);

            if (success) {
                // Mark file as saved in store
                markFileSaved(file.id);
                console.log('[AutoSave] File saved successfully:', file.name);
            } else {
                console.error('[AutoSave] Failed to save file:', file.name);
            }
        } catch (error) {
            console.error('[AutoSave] Error saving file:', error);
        } finally {
            isSavingRef.current = false;
        }
    };

    // Debounced save - saves after 2 seconds of inactivity
    useEffect(() => {
        const activeFile = files.find(f => f.id === activeFileId);

        if (activeFile && activeFile.modified) {
            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set new timeout for debounced save
            saveTimeoutRef.current = setTimeout(() => {
                saveFile(activeFile);
            }, 2000); // 2 second debounce
        }

        // Cleanup timeout on unmount or when dependencies change
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [files, activeFileId]);

    // Save on file switch
    useEffect(() => {
        // If we switched files, save the previous file if it was modified
        if (previousFileIdRef.current && previousFileIdRef.current !== activeFileId) {
            const previousFile = files.find(f => f.id === previousFileIdRef.current);

            if (previousFile && previousFile.modified) {
                // Clear debounce timeout since we're saving immediately
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }

                console.log('[AutoSave] File switched, saving previous file:', previousFile.name);
                saveFile(previousFile);
            }
        }

        // Update previous file ID
        previousFileIdRef.current = activeFileId;
    }, [activeFileId, files]);

    // Save on unmount (when user closes the app)
    useEffect(() => {
        return () => {
            const activeFile = files.find(f => f.id === activeFileId);
            if (activeFile && activeFile.modified) {
                // Note: This is a best-effort save on unmount
                // It may not complete if the user closes the tab quickly
                saveFile(activeFile);
            }
        };
    }, []);

    return {
        saveFile // Expose saveFile for manual saves if needed
    };
}
