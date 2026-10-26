import Dexie from 'dexie';

// Initialize Dexie IndexedDB
export const db = new Dexie('HerCareLocalDB');

// Define database schema
db.version(1).stores({
  preferences: 'key, value, updatedAt',
  cycles: 'id, startDate, endDate, cycleLength, periodLength, syncStatus, createdAt',
  symptomLogs: 'id, date, flow, crampsLevel, symptoms, mood, createdAt',
  chatHistory: 'id, sessionId, role, text, language, isEmergency, createdAt',
});

// Helper: Save preference locally
export async function saveLocalPreference(key, value) {
  return await db.preferences.put({
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}

// Helper: Get preference locally
export async function getLocalPreference(key, defaultValue = null) {
  const record = await db.preferences.get(key);
  return record ? record.value : defaultValue;
}

// Helper: Save cycle record locally
export async function saveLocalCycle(cycleData) {
  const record = {
    id: cycleData.id || `local_cycle_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    startDate: cycleData.startDate,
    endDate: cycleData.endDate || null,
    cycleLength: cycleData.cycleLength || 28,
    periodLength: cycleData.periodLength || 5,
    symptoms: cycleData.symptoms || [],
    mood: cycleData.mood || 'calm',
    flow: cycleData.flow || 'medium',
    notes: cycleData.notes || '',
    syncStatus: cycleData.syncStatus || 'local_only',
    createdAt: cycleData.createdAt || new Date().toISOString(),
  };
  await db.cycles.put(record);
  return record;
}

// Helper: Get all local cycle records
export async function getLocalCycles() {
  return await db.cycles.orderBy('startDate').reverse().toArray();
}

// Helper: Save symptom log locally
export async function saveLocalSymptomLog(logData) {
  const record = {
    id: logData.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    date: logData.date || new Date().toISOString().split('T')[0],
    flow: logData.flow || 'medium',
    // Numeric 0-5 pain scale (crampsLevel kept as an alias for older records)
    pain_level: typeof logData.pain_level === 'number' ? logData.pain_level : (logData.crampsLevel ?? 0),
    crampsLevel: typeof logData.crampsLevel === 'number' ? logData.crampsLevel : (logData.pain_level ?? 0),
    symptoms: logData.symptoms || [],
    mood: logData.mood || 'calm',
    notes: logData.notes || '',
    supplementsTaken: Boolean(logData.supplementsTaken),
    syncStatus: logData.syncStatus || 'local_only',
    createdAt: logData.createdAt || new Date().toISOString(),
  };
  await db.symptomLogs.put(record);
  return record;
}

// Helper: Delete a single symptom log
export async function deleteLocalSymptomLog(id) {
  await db.symptomLogs.delete(id);
  return true;
}

// Helper: Delete a single cycle record
export async function deleteLocalCycle(id) {
  await db.cycles.delete(id);
  return true;
}

// Sync reconciliation: replace the local record ID with the server record ID
export async function markLocalCycleSynced(localId, serverId) {
  const record = await db.cycles.get(localId);
  if (!record) return null;
  const updated = { ...record, id: serverId || localId, syncStatus: 'synced' };
  if (serverId && localId !== serverId) {
    await db.cycles.delete(localId);
  }
  await db.cycles.put(updated);
  return updated;
}

export async function markLocalSymptomLogSynced(localId, serverId) {
  const record = await db.symptomLogs.get(localId);
  if (!record) return null;
  const updated = { ...record, id: serverId || localId, syncStatus: 'synced' };
  if (serverId && localId !== serverId) {
    await db.symptomLogs.delete(localId);
  }
  await db.symptomLogs.put(updated);
  return updated;
}

// Helper: Get symptom logs
export async function getLocalSymptomLogs() {
  return await db.symptomLogs.orderBy('date').reverse().toArray();
}

// Helper: Save chat message locally
export async function saveLocalChatMessage(messageData) {
  const record = {
    id: messageData.id || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    sessionId: messageData.sessionId || 'default_session',
    role: messageData.role, // 'user' or 'assistant'
    text: messageData.text,
    language: messageData.language || 'en',
    isEmergency: messageData.isEmergency || false,
    emergencyCategory: messageData.emergencyCategory || null,
    createdAt: new Date().toISOString(),
  };
  await db.chatHistory.put(record);
  return record;
}

// Helper: Get local chat history
export async function getLocalChatHistory(limit = 50) {
  return await db.chatHistory.orderBy('createdAt').reverse().limit(limit).toArray();
}

// ---------------------------------------------------------------------
// ChatGPT-style conversation sessions (IndexedDB chatHistory.sessionId)
// ---------------------------------------------------------------------

// All conversations on this device, newest first. Each entry:
// { sessionId, title, messageCount, lastMessageAt }
export async function getLocalChatSessions() {
  const all = await db.chatHistory.orderBy('createdAt').toArray();
  const map = new Map();
  for (const m of all) {
    const sid = m.sessionId || 'default_session';
    const s = map.get(sid) || {
      sessionId: sid,
      title: '',
      messageCount: 0,
      lastMessageAt: m.createdAt,
    };
    s.messageCount += 1;
    if (m.createdAt >= s.lastMessageAt) s.lastMessageAt = m.createdAt;
    // Conversation title = the user's first message, like ChatGPT
    if (!s.title && m.role === 'user' && m.text) s.title = m.text.slice(0, 60);
    map.set(sid, s);
  }
  return [...map.values()].sort((a, b) =>
    a.lastMessageAt < b.lastMessageAt ? 1 : -1
  );
}

// One conversation's messages, oldest first.
export async function getLocalChatMessages(sessionId, limit = 200) {
  const rows = await db.chatHistory
    .where('sessionId')
    .equals(sessionId || 'default_session')
    .sortBy('createdAt');
  return rows.slice(-limit);
}

// Delete a single conversation from this device.
export async function deleteLocalChatSession(sessionId) {
  await db.chatHistory
    .where('sessionId')
    .equals(sessionId || 'default_session')
    .delete();
  return true;
}

// Build a complete snapshot of every local record (used by Export My Data)
export async function buildLocalExportPayload() {
  const preferences = await db.preferences.toArray();
  const cycles = await db.cycles.toArray();
  const symptomLogs = await db.symptomLogs.toArray();
  const chatHistory = await db.chatHistory.toArray();

  return {
    app: 'HerCare',
    version: '1.0.0-hackathon-r2',
    exportedAt: new Date().toISOString(),
    dataStorage: 'IndexedDB (Local-First)',
    preferences,
    cycles,
    symptomLogs,
    chatHistory,
  };
}

// Trigger a browser download of an arbitrary JSON payload
export function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export entire local IndexedDB as JSON file
export async function exportLocalData() {
  const exportPayload = await buildLocalExportPayload();
  downloadJson(exportPayload, `hercare_backup_${new Date().toISOString().split('T')[0]}.json`);
  return exportPayload;
}

// Clear only the AI conversation history
export async function clearChatHistory() {
  await db.chatHistory.clear();
  return true;
}

// Wipe every local table (correct Dexie table names: cycles / symptomLogs / chatHistory / preferences)
export async function wipeLocalData() {
  await db.preferences.clear();
  await db.cycles.clear();
  await db.symptomLogs.clear();
  await db.chatHistory.clear();
  return true;
}
