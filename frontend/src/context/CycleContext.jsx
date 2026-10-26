import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getLocalCycles,
  saveLocalCycle,
  deleteLocalCycle,
  getLocalSymptomLogs,
  saveLocalSymptomLog,
  deleteLocalSymptomLog,
  getLocalPreference,
  saveLocalPreference
} from '../lib/db';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const CycleContext = createContext(null);

// Map user-facing pain labels to the backend's 0-5 numeric scale.
const PAIN_SCALE = {
  none: 0, 'no pain': 0, 'வலி இல்லை': 0,
  low: 1, mild: 1, 'லேசானது': 1,
  medium: 2, moderate: 2, 'மிதமானது': 2,
  high: 3,
  intense: 4,
  severe: 5, 'கடுமையானது': 5,
};

export function normalizePainLevel(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(5, Math.round(value)));
  }
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase();
    if (key in PAIN_SCALE) return PAIN_SCALE[key];
    const asNumber = Number(key);
    if (!Number.isNaN(asNumber) && key !== '') {
      return Math.max(0, Math.min(5, Math.round(asNumber)));
    }
  }
  return 0;
}

export function CycleProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [symptomLogs, setSymptomLogs] = useState([]);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load local IndexedDB records on mount
  useEffect(() => {
    async function loadData() {
      try {
        const localCyclesList = await getLocalCycles();
        setCycles(localCyclesList);

        const localLogsList = await getLocalSymptomLogs();
        setSymptomLogs(localLogsList);

        const storedSyncPref = await getLocalPreference('cloud_sync_consent', false);
        setCloudSyncEnabled(storedSyncPref);

        // If authenticated, check server sync status
        if (isAuthenticated) {
          try {
            const res = await api.get('/sync/status');
            setCloudSyncEnabled(res.data.cloud_sync_enabled);
            await saveLocalPreference('cloud_sync_consent', res.data.cloud_sync_enabled);
          } catch (err) {
            console.warn('Could not reach backend sync status (offline mode):', err);
          }
        }
      } catch (err) {
        console.error('Error loading IndexedDB data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAuthenticated]);

  // Add Cycle Entry (Local-First + Optional Encrypted Cloud Sync)
  const addCycle = async (cycleData) => {
    // 1. Save locally in IndexedDB immediately (Offline-First)
    const localRecord = await saveLocalCycle({
      ...cycleData,
      syncStatus: cloudSyncEnabled ? 'pending' : 'local_only',
    });

    setCycles((prev) => [localRecord, ...prev.filter((c) => c.id !== localRecord.id)]);

    // 2. If Cloud Sync is enabled by user consent, push to PostgreSQL via FastAPI
    if (cloudSyncEnabled && isAuthenticated) {
      try {
        const res = await api.post('/cycles', {
          start_date: cycleData.startDate,
          end_date: cycleData.endDate,
          cycle_length: cycleData.cycleLength || 28,
          period_length: cycleData.periodLength || 5,
          symptoms: cycleData.symptoms || [],
          mood: cycleData.mood || null,
          flow: cycleData.flow || 'medium',
          notes: cycleData.notes || '',
        });

        // Reconcile local ID with the server record ID so later edits target the cloud copy
        const synced = await markLocalCycleSynced(localRecord.id, res.data.id);
        setCycles((prev) => prev.map((c) => (c.id === localRecord.id ? synced : c)));
        return synced;
      } catch (err) {
        console.warn('Backend sync failed, saved locally in IndexedDB:', err);
        const pending = await saveLocalCycle({ ...localRecord, syncStatus: 'pending' });
        setCycles((prev) => prev.map((c) => (c.id === localRecord.id ? pending : c)));
        return pending;
      }
    }

    return localRecord;
  };

  // Add Daily Symptom Log (Local-First + Optional Encrypted Cloud Sync)
  const addSymptomLog = async (logData) => {
    const painLevel = normalizePainLevel(logData.pain_level ?? logData.crampsLevel);
    const localLog = await saveLocalSymptomLog({
      ...logData,
      pain_level: painLevel,
      crampsLevel: painLevel,
      syncStatus: cloudSyncEnabled ? 'pending' : 'local_only',
    });
    setSymptomLogs((prev) => [localLog, ...prev.filter((l) => l.id !== localLog.id)]);

    if (cloudSyncEnabled && isAuthenticated) {
      try {
        const res = await api.post('/symptoms', {
          date: localLog.date,
          symptoms: localLog.symptoms || [],
          mood: localLog.mood || null,
          energy_level: 'moderate',
          pain_level: painLevel,
          flow: localLog.flow || null,
          supplements_taken: Boolean(localLog.supplementsTaken),
          notes: localLog.notes || '',
        });

        const synced = await markLocalSymptomLogSynced(localLog.id, res.data.id);
        setSymptomLogs((prev) => prev.map((l) => (l.id === localLog.id ? synced : l)));
        return synced;
      } catch (err) {
        console.warn('Symptom log cloud sync failed; kept locally:', err);
      }
    }

    return localLog;
  };

  // Update an existing daily symptom log (local upsert + cloud PUT when synced)
  const updateSymptomLog = async (logId, data) => {
    const painLevel = normalizePainLevel(data.pain_level ?? data.crampsLevel);
    const previous = symptomLogs.find((l) => l.id === logId) || {};

    const updated = await saveLocalSymptomLog({
      ...previous,
      ...data,
      id: logId,
      createdAt: previous.createdAt || new Date().toISOString(),
      pain_level: painLevel,
      crampsLevel: painLevel,
      syncStatus: cloudSyncEnabled ? 'pending' : 'local_only',
    });
    setSymptomLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)));

    if (cloudSyncEnabled && isAuthenticated) {
      try {
        const res = await api.put(`/symptoms/${logId}`, {
          symptoms: updated.symptoms || [],
          mood: updated.mood || null,
          energy_level: 'moderate',
          pain_level: painLevel,
          flow: updated.flow || null,
          supplements_taken: Boolean(updated.supplementsTaken),
          notes: updated.notes || '',
        });
        const synced = await markLocalSymptomLogSynced(logId, res.data.id);
        if (synced) {
          setSymptomLogs((prev) => prev.map((l) => (l.id === logId ? synced : l)));
          return synced;
        }
      } catch (err) {
        console.warn('Symptom log cloud update failed; kept locally as pending:', err);
      }
    }

    return updated;
  };

  // Delete a daily symptom log from device (and cloud when synced)
  const deleteSymptomLog = async (logId) => {
    if (cloudSyncEnabled && isAuthenticated) {
      try {
        await api.delete(`/symptoms/${logId}`);
      } catch (err) {
        // Local-only record: server returns 404, which is fine to ignore
        console.warn('Cloud symptom delete skipped:', err);
      }
    }
    await deleteLocalSymptomLog(logId);
    setSymptomLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  // Delete a cycle record from device (and cloud when synced)
  const deleteCycle = async (cycleId) => {
    if (cloudSyncEnabled && isAuthenticated) {
      try {
        await api.delete(`/cycles/${cycleId}`);
      } catch (err) {
        console.warn('Cloud cycle delete skipped:', err);
      }
    }
    await deleteLocalCycle(cycleId);
    setCycles((prev) => prev.filter((c) => c.id !== cycleId));
  };

  // Toggle Cloud Sync with user consent
  const toggleCloudSync = async (enabled) => {
    setCloudSyncEnabled(enabled);
    await saveLocalPreference('cloud_sync_consent', enabled);

    if (isAuthenticated) {
      try {
        await api.post('/sync/toggle', { enabled });
      } catch (err) {
        console.warn('Failed to update cloud sync on backend:', err);
      }
    }
  };

  /**
   * Cycle phase derived from real recorded data only.
   * Returns phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown'
   * with dayOfCycle/daysToNext === null when there is not enough recorded data.
   * Predictions are labelled estimates elsewhere in the UI — never confirmed events.
   */
  const getCurrentPhase = () => {
    const emptyState = {
      phase: 'unknown',
      dayOfCycle: null,
      daysToNext: null,
      hasRecords: false,
    };

    if (!cycles || cycles.length === 0) return emptyState;

    const latest = cycles.find((c) => c && c.startDate);
    if (!latest) return emptyState;

    const startDate = new Date(latest.startDate);
    if (Number.isNaN(startDate.getTime())) return emptyState;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return emptyState;

    const dayOfCycle = diffDays + 1;
    const cycleLength = latest.cycleLength || 28;
    const periodLength = latest.periodLength || 5;

    let phase = 'follicular';
    if (dayOfCycle <= periodLength) {
      phase = 'menstrual';
    } else if (dayOfCycle >= 12 && dayOfCycle <= 16) {
      phase = 'ovulatory';
    } else if (dayOfCycle > 16) {
      phase = 'luteal';
    }

    const daysToNext = Math.max(0, cycleLength - dayOfCycle);
    return { phase, dayOfCycle, daysToNext, hasRecords: true };
  };

  return (
    <CycleContext.Provider
      value={{
        cycles,
        symptomLogs,
        cloudSyncEnabled,
        loading,
        addCycle,
        addSymptomLog,
        updateSymptomLog,
        deleteSymptomLog,
        deleteCycle,
        toggleCloudSync,
        getCurrentPhase,
        refreshCycles: async () => {
          const list = await getLocalCycles();
          setCycles(list);
          const logs = await getLocalSymptomLogs();
          setSymptomLogs(logs);
        },
      }}
    >
      {children}
    </CycleContext.Provider>
  );
}

export function useCycle() {
  const context = useContext(CycleContext);
  if (!context) {
    throw new Error('useCycle must be used within a CycleProvider');
  }
  return context;
}
