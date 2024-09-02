import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import {
  ActiveSessionChange,
  Session,
  SessionControl,
  SessionCreate,
  SessionRemove,
  SessionUpdate,
  WinRTError,
} from './types/winrt';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { debugPrint } from './utils/debug';
import NormalMode from './components/NormalMode';
import MiniMode from './components/MiniMode';

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isMini, setIsMini] = useState(false);

  const controlSession = (source: string, control: SessionControl) => {
    invoke('control_session', { source, control })
      .then(() => {
        debugPrint('Session control succeeded');
      })
      .catch((e) => {
        const err = e as WinRTError;
        debugPrint(`Failed to control: ${err.message}, ${source}:${control}`);
      });
  };

  const initSessions = () => {
    invoke<Session[]>('get_current_sessions').then((s) => {
      const ss = s.sort((a, b) => {
        if (a.source > b.source) return 1;
        else return -1;
      });
      ss.forEach((session) => {
        if (session.image) {
          session.imageUrl = URL.createObjectURL(new Blob([new Uint8Array(session.image)], { type: 'image/png' }));
        }
      });
      console.log(ss);
      setSessions(ss);
    });
  };

  useEffect(() => {
    initSessions();

    const unlistenFuncs: UnlistenFn[] = [];
    const initListeners = async () => {
      const unlistenSessionCreateListener = await listen<SessionCreate>('session_create', (e) => {
        debugPrint('Session Create: ', e.payload);
        setSessions((prev) => {
          return [...prev, { source: e.payload.source }];
        });
      });
      unlistenFuncs.push(unlistenSessionCreateListener);

      const unlistenSessionUpdateListener = await listen<SessionUpdate>('session_update', (e) => {
        debugPrint('Session Update', e.payload);
        setSessions((prev) => {
          const exist = prev.find((s) => s.source === e.payload.source);
          const filtered = prev.filter((s) => s.source !== e.payload.source);
          if (exist === undefined) {
            return prev;
          } else {
            // update info
            if (e.payload.image) {
              exist.image = e.payload.image;
              if (exist.imageUrl) URL.revokeObjectURL(exist.imageUrl);
              exist.imageUrl = URL.createObjectURL(new Blob([new Uint8Array(e.payload.image)], { type: 'image/png' }));
            }
            exist.session = e.payload.sessionModel;
            exist.sessionId = e.payload.sessionId;
            const newSessions = [...filtered, exist].sort((a, b) => {
              if (a.source > b.source) return 1;
              else return -1;
            });
            return newSessions;
          }
        });
      });
      unlistenFuncs.push(unlistenSessionUpdateListener);

      const unlistenSessionRemoveListener = await listen<SessionRemove>('session_remove', (e) => {
        debugPrint('Session Remove: ', e.payload);
        setSessions((prev) => {
          return prev.filter((s) => s.sessionId !== e.payload.sessionId);
        });
      });
      unlistenFuncs.push(unlistenSessionRemoveListener);

      const unlistenCurrentSessionChangeListener = await listen<ActiveSessionChange>('current_session_change', (e) => {
        debugPrint('Current Session Change', e.payload);
        // todo
      });
      unlistenFuncs.push(unlistenCurrentSessionChangeListener);

      const unlistenCurrentSessionRemoveListener = await listen('current_session_remove', () => {
        debugPrint('Current Session Remove');
        // currently no sessions
        setSessions([]);
      });
      unlistenFuncs.push(unlistenCurrentSessionRemoveListener);

      const unlistenMiniListener = await listen<boolean>('mini_mode', (e) => {
        if (e.payload === true) {
          // changed to mini mode
          setIsMini(true);
        } else {
          setIsMini(false);
        }
        initSessions();
      });
      unlistenFuncs.push(unlistenMiniListener);
    };

    initListeners();
    return () => {
      unlistenFuncs.forEach((f) => {
        f();
      });
      sessions.forEach((s) => {
        if (s.imageUrl) URL.revokeObjectURL(s.imageUrl);
      });
    };
  }, []);

  return (
    <div className={`w-[${window.innerWidth}px] h-[${window.innerHeight}px]`}>
      {isMini ? (
        <MiniMode sessions={sessions} controlSession={controlSession} />
      ) : (
        <NormalMode sessions={sessions} controlSession={controlSession} />
      )}
    </div>
  );
}

export default App;
