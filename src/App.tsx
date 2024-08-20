import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
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

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);

  const getCurrentSessions = async () => {
    setSessions(await invoke('get_current_sessions'));
  };

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

  useEffect(() => {
    invoke<Session[]>('get_current_sessions').then((s) => {
      setSessions(s);
    });
    const unlistenFuncs: UnlistenFn[] = [];
    const initListeners = async () => {
      const unlistenTestListener = await listen('test-event', (e) => {
        console.log(e.payload);
      });
      unlistenFuncs.push(unlistenTestListener);

      const unlistenSessionCreateListener = await listen<SessionCreate>('session_create', (e) => {
        debugPrint('Session Create: ', e.payload);
        setSessions((prev) => {
          return [...prev, { sessionId: e.payload.sessionId, source: e.payload.source }];
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
            if (e.payload.image) exist.image = e.payload.image;
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
    };

    initListeners();
    return () => {
      unlistenFuncs.forEach((f) => {
        f();
      });
    };
  }, []);

  useEffect(() => {
    console.log(sessions);
  }, [sessions]);

  return (
    <div className="container">
      <h1>Welcome to Tauri!</h1>

      <div className="row">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          getCurrentSessions();
        }}
      >
        <button type="submit">Greet</button>
      </form>
      <div>
        {sessions.map((s, i) => (
          <div key={i}>
            <p>
              {s.source} : {s.sessionId}
            </p>
            <p> {s.session?.media?.title}</p>
            <p> {s.session?.media?.artist}</p>
            <img src={URL.createObjectURL(new Blob([new Uint8Array(s.image || [])], { type: 'image/png' }))} />
            <button onClick={() => controlSession(s.source, 'Pause')}>Pause</button>
            <button onClick={() => controlSession(s.source, 'Play')}>Play</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
