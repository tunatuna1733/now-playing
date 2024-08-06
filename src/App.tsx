import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import { NowPlaying } from './types/winrt';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

function App() {
  const [sessions, setSessions] = useState<NowPlaying[]>();

  const getCurrentSessions = async () => {
    setSessions(await invoke('get_current_sessions'));
  };

  useEffect(() => {
    const unlistenFuncs: UnlistenFn[] = [];
    const initListeners = async () => {
      const unlistenTestListener = await listen('test-event', (e) => {
        console.log(e.payload);
      });
      unlistenFuncs.push(unlistenTestListener);
    };
    initListeners();
    return () => {
      unlistenFuncs.forEach((f) => {
        f();
      });
    };
  }, []);

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
        {sessions?.map((s, i) => (
          <div key={i}>
            <p>Title: {s.title}</p>
            <p>Album: {s.album}</p>
            <p>Artist: {s.artist}</p>
            <p>Guid: {s.guid}</p>
            <img src={URL.createObjectURL(new Blob([new Uint8Array(s.thumbnail)], { type: 'image/png' }))} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
