import React, { useState, useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import RotaryCycleTracker from '../components/cycle/RotaryCycleTracker';
import MoodSymptomDrawer from '../components/dashboard/MoodSymptomDrawer';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { useAssistant, usePageContext } from '../context/AssistantContext';

/** Cycle tracking screen: circular dial, date selection, records, per-date check-in. */
export default function CyclePage() {
  const { symptomLogs, cycles, addSymptomLog, updateSymptomLog, deleteSymptomLog, deleteCycle } =
    useCycle();
  const { language, t } = useLanguage();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedDateForCheckIn, setSelectedDateForCheckIn] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  const dayLog =
    symptomLogs.find((l) => l.date === selectedDateForCheckIn) || null;

  const recentCycles = (cycles || []).slice(0, 5);

  // Live page context for the assistant: record counts + open check-in form
  const { registerAction } = useAssistant();
  usePageContext({
    sections: [
      language === 'ta'
        ? `சேமிக்கப்பட்ட சுழற்சிப் பதிவுகள்: ${recentCycles.length}`
        : `Saved cycle records: ${recentCycles.length}`,
      ...(isCheckInOpen
        ? [language === 'ta' ? 'செக்-இன் படிவம் திறந்துள்ளது' : 'Daily check-in form is open']
        : []),
    ],
  });

  useEffect(() => {
    const unsubs = [
      registerAction({
        id: 'open_check_in',
        label: t('assistant.open_check_in_label'),
        needsConfirm: false,
        run: () => {
          setSelectedDateForCheckIn(new Date().toISOString().split('T')[0]);
          setIsCheckInOpen(true);
          return { ok: true, message: t('assistant.checkin_opened') };
        },
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [registerAction, t]);

  return (
    <div className="flex-1 w-full h-full overflow-hidden animate-fadeIn relative flex flex-col">
      <RotaryCycleTracker
        onOpenCheckIn={(dateStr) => {
          setSelectedDateForCheckIn(dateStr);
          setIsCheckInOpen(true);
        }}
      />

      {/* Compact Recent Cycle History with delete */}
      {recentCycles.length > 0 && (
        <div className="shrink-0 px-3 pb-1.5 pt-0.5">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1">
            {t('cycle.recent_history')}
          </p>
          <div className="flex space-x-2 overflow-x-auto pb-1 -mx-1 px-1">
            {recentCycles.map((c) => (
              <div
                key={c.id}
                className="shrink-0 flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 rounded-xl px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300"
              >
                <span>
                  {c.startDate}
                  {c.cycleLength ? ` • ${c.cycleLength}d` : ''}
                </span>
                {confirmingDeleteId === c.id ? (
                  <span className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => {
                        deleteCycle(c.id);
                        setConfirmingDeleteId(null);
                      }}
                      className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-extrabold"
                      aria-label={t('symptoms.delete_yes')}
                    >
                      {t('symptoms.delete_yes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(null)}
                      className="px-1 py-0.5 rounded-md text-slate-500"
                      aria-label={t('symptoms.delete_no')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteId(c.id)}
                    className="text-rose-500 hover:text-rose-700"
                    aria-label={t('symptoms.btn_delete')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <MoodSymptomDrawer
        isOpen={isCheckInOpen}
        initialDate={selectedDateForCheckIn}
        initialData={dayLog || null}
        onClose={() => setIsCheckInOpen(false)}
        onSave={async (logData) => {
          if (dayLog?.id) {
            await updateSymptomLog(dayLog.id, logData);
          } else {
            await addSymptomLog(logData);
          }
        }}
        onDelete={deleteSymptomLog}
      />
    </div>
  );
}
