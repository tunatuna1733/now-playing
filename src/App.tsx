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
  Timeline,
  WinRTError,
} from './types/winrt';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { debugPrint } from './utils/debug';
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './components/ui/carousel';

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

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
      const ss = s.sort((a, b) => {
        if (a.source > b.source) return 1;
        else return -1;
      });
      setSessions(ss);
    });
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
        /*
        if (e.payload.sessionModel.timeline) {
          const timelineInfo = e.payload.sessionModel.timeline;
          setTimelines((prev) => {
            const exist = prev.find((t) => t.source === e.payload.source);
            const filtered = prev.filter((t) => t.source !== e.payload.source);
            if (!exist) {
              const songLength = timelineInfo.end / 10000000;
              const startTime = timelineInfo.lastUpdatedAtMs - timelineInfo.position / 10000;
              const interval = setInterval(() => {}, 100);
              const timeline: Timeline = {
                source: e.payload.source,
              };
              return [...filtered];
            }
          });
          
        }*/
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
    if (!carouselApi) return;
  }, [carouselApi]);

  const OverflowingText = ({ text }: { text: string }) => {
    const [hover, setHover] = useState(false);
    const [overflow, setOverflow] = useState(false);
    const containerId = `overflowing-text-container-${text}`;
    const pId = `overflowing-text-text-${text}`;

    useEffect(() => {
      const containerWidth = document.getElementById(containerId)?.clientWidth;
      const pWidth = document.getElementById(pId)?.clientWidth;
      if (!containerWidth || !pWidth) return;
      if (containerWidth < pWidth) {
        setOverflow(true);
      }
    }, []);

    return (
      <div
        className="w-full whitespace-nowrap overflow-hidden box-border relative"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        id={containerId}
      >
        {overflow ? (
          <p className={`inline-block relative font-semibold text-2xl${hover ? ' animate-text-move' : ''}`} id={pId}>
            {text}
          </p>
        ) : (
          <p className={'inline-block relative font-semibold text-2xl'} id={pId}>
            {text}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={`w-[${window.innerWidth}px] h-[${window.innerHeight}px]`}>
      <Carousel className="my-3 mx-10 h-full" setApi={setCarouselApi} opts={{ loop: true }}>
        <CarouselContent>
          {sessions.map((s, i) => (
            <CarouselItem key={i}>
              <div className="h-[45%] flex">
                <img
                  className="mx-auto h-full object-contain"
                  src={URL.createObjectURL(new Blob([new Uint8Array(s.image || [])], { type: 'image/png' }))}
                />
              </div>
              <p className="text-gray-400">{s.session?.media?.artist}</p>
              <OverflowingText text={s.session?.media?.title || ''} />
              <p>
                {s.source} : {s.sessionId}
              </p>
              <p> {s.session?.media?.artist}</p>
              <button onClick={() => controlSession(s.source, 'Pause')}>Pause</button>
              <button onClick={() => controlSession(s.source, 'Play')}>Play</button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious variant={'ghost'} />
        <CarouselNext variant={'ghost'} />
      </Carousel>
    </div>
  );
}

export default App;
