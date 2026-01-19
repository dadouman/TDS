/**
 * useCMRAutoSave Hook - Story 6.024
 * 
 * Auto-saves CMR form data on field blur with optimistic locking
 * Handles version conflicts and provides visual feedback
 */

import { useCallback, useRef, useState } from 'react';

export interface CMRData {
  tripId: string;
  receivedCount: number | null;
  damageDeclared: boolean;
  damageNotes: string | null;
  inspectorName: string | null;
  status: string;
  version: number;
  lastUpdatedBy?: string;
}

export interface CMRAutoSaveHookResult {
  data: CMRData | null;
  saving: boolean;
  error: string | null;
  hasConflict: boolean;
  version: number;
  lastSavedAt: Date | null;
  handleFieldChange: (field: keyof CMRData, value: any) => Promise<void>;
  discardConflict: () => void;
  acceptServerVersion: (serverData: CMRData) => void;
}

const DEBOUNCE_MS = 300;
const SAVE_INDICATOR_TIMEOUT_MS = 800;

export function useCMRAutoSave(tripId: string): CMRAutoSaveHookResult {
  const [data, setData] = useState<CMRData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [version, setVersion] = useState(1);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangeRef = useRef<Partial<CMRData> | null>(null);

  // Save CMR data to server
  const saveCMRData = useCallback(
    async (fieldsToSave: Partial<CMRData>) => {
      if (!data) return;

      setSaving(true);
      setError(null);

      try {
        const payload = {
          ...fieldsToSave,
          version
        };

        const response = await fetch(`/api/protected/warehouse/cmr/${tripId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.status === 409) {
          // Version conflict
          const conflictData = await response.json();
          setHasConflict(true);
          setError('CMR has been modified by another user');

          // Update local state with server data
          if (conflictData.conflict?.currentData) {
            const serverData = conflictData.conflict.currentData;
            setData(prev => ({
              ...prev!,
              ...serverData
            }));
            setVersion(serverData.version);
          }
        } else if (response.ok) {
          const saved = await response.json();

          // Update version and data
          setVersion(saved.data.version);
          setData(prev => ({
            ...prev!,
            status: saved.data.status,
            version: saved.data.version,
            lastUpdatedBy: saved.data.lastUpdatedBy
          }));
          setLastSavedAt(new Date());
          setHasConflict(false);

          // Clear save indicator after delay
          if (saveIndicatorTimeoutRef.current) {
            clearTimeout(saveIndicatorTimeoutRef.current);
          }
          saveIndicatorTimeoutRef.current = setTimeout(() => {
            setSaving(false);
          }, SAVE_INDICATOR_TIMEOUT_MS);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to save CMR');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      } finally {
        // Only set saving to false if not using indicator timeout
        if (!saveIndicatorTimeoutRef.current) {
          setSaving(false);
        }
      }
    },
    [tripId, version, data]
  );

  // Initialize data on mount
  const initializeData = useCallback(async () => {
    try {
      const response = await fetch(`/api/protected/warehouse/cmr/${tripId}`, {
        method: 'GET'
      });

      if (response.ok) {
        const result = await response.json();
        const cmrData = result.data.cmrForm;

        setData({
          tripId: cmrData.tripId,
          receivedCount: cmrData.receivedCount,
          damageDeclared: cmrData.damageDeclared,
          damageNotes: cmrData.damageNotes,
          inspectorName: cmrData.inspectorName,
          status: cmrData.status,
          version: 1 // Will be updated on first save
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CMR');
    }
  }, [tripId]);

  // Initialize on mount
  React.useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Handle field change with debounce
  const handleFieldChange = useCallback(
    async (field: keyof CMRData, value: any) => {
      if (!data) return;

      // Update local state immediately (optimistic update)
      const newData = {
        ...data,
        [field]: value
      };
      setData(newData);
      pendingChangeRef.current = { [field]: value };

      // Clear existing debounce timer
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new debounce timer for save
      debounceTimeoutRef.current = setTimeout(async () => {
        if (pendingChangeRef.current) {
          setSaving(true);
          await saveCMRData(pendingChangeRef.current);
          pendingChangeRef.current = null;
        }
      }, DEBOUNCE_MS);
    },
    [data, saveCMRData]
  );

  // Handle version conflict - discard local changes
  const discardConflict = useCallback(() => {
    setHasConflict(false);
    setError(null);
    // Data has already been updated to server version
  }, []);

  // Handle version conflict - accept server version and resume
  const acceptServerVersion = useCallback((serverData: CMRData) => {
    setData(serverData);
    setVersion(serverData.version);
    setHasConflict(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (saveIndicatorTimeoutRef.current) {
        clearTimeout(saveIndicatorTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    saving,
    error,
    hasConflict,
    version,
    lastSavedAt,
    handleFieldChange,
    discardConflict,
    acceptServerVersion
  };
}
