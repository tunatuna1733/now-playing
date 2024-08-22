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
  TimelineModel,
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
import AudioProgressBar from './components/AudioProgressBar';
import { Button } from './components/ui/button';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';

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

  const addTime = (source: string, time: number) => {
    setTimelines((prev) => {
      const exist = prev.find((t) => t.source === source);
      if (!exist) return prev;
      const filtered = prev.filter((t) => t.source !== source);
      exist.position += time / 1000;
      return [...filtered, exist];
    });
  };

  const resumeTimeline = (timeline: TimelineModel, source: string) => {
    setTimelines((prev) => {
      const exist = prev.find((t) => t.source === source);
      const filtered = prev.filter((t) => t.source !== source);
      const length = timeline.end / 10000000;
      const position = timeline.position / 10000000;
      if (!exist) {
        const interval = setInterval(() => {
          addTime(source, 250);
        }, 250);
        const newTimeline: Timeline = {
          length,
          position,
          source,
          positionLoop: interval,
        };
        return [...filtered, newTimeline];
      }
      clearInterval(exist.positionLoop);
      const interval = setInterval(() => {
        addTime(source, 250);
      }, 250);
      exist.length = length;
      exist.position = position;
      exist.positionLoop = interval;
      return [...filtered, exist];
    });
  };

  const pauseTimeline = (timeline: TimelineModel, source: string) => {
    setTimelines((prev) => {
      const exist = prev.find((t) => t.source === source);
      const filtered = prev.filter((t) => t.source !== source);
      const length = timeline.end / 10000000;
      const position = timeline.position / 10000000;
      if (!exist) {
        const newTimeline: Timeline = {
          length,
          position,
          source,
        };
        return [...filtered, newTimeline];
      }
      if (exist.positionLoop) clearInterval(exist.positionLoop);
      exist.length = length;
      exist.position = position;
      return [...filtered, exist];
    });
  };

  useEffect(() => {
    invoke<Session[]>('get_current_sessions').then((s) => {
      const ss = s.sort((a, b) => {
        if (a.source > b.source) return 1;
        else return -1;
      });
      ss.forEach((session) => {
        if (session.session && session.session.timeline) {
          const timeline = session.session.timeline;
          if (session.session.playback?.status === 'Playing') {
            resumeTimeline(timeline, session.source);
          } else if (session.session.playback?.status === 'Paused') {
            pauseTimeline(timeline, session.source);
          }
        }
        if (session.image) {
          session.imageUrl = URL.createObjectURL(new Blob([new Uint8Array(session.image)], { type: 'image/png' }));
        }
      });
      console.log(ss);
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
            if (e.payload.image) {
              exist.image = e.payload.image;
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
        if (e.payload.sessionModel.timeline) {
          const timeline = e.payload.sessionModel.timeline;
          if (e.payload.sessionModel.playback?.status === 'Playing') {
            resumeTimeline(timeline, e.payload.source);
          } else if (e.payload.sessionModel.playback?.status === 'Paused') {
            pauseTimeline(timeline, e.payload.source);
          }
        }
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
      timelines.forEach((t) => {
        if (t.positionLoop) clearInterval(t.positionLoop);
      });
      sessions.forEach((s) => {
        if (s.imageUrl) URL.revokeObjectURL(s.imageUrl);
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
          <p className={`inline-block relative font-semibold text-lg${hover ? ' animate-text-move' : ''}`} id={pId}>
            {text}
          </p>
        ) : (
          <p className={'inline-block relative font-semibold text-lg'} id={pId}>
            {text}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={`w-[${window.innerWidth}px] h-[${window.innerHeight}px]`}>
      <Carousel className="mt-3 mx-10 h-full" setApi={setCarouselApi} opts={{ loop: true }}>
        <CarouselContent>
          {sessions.map((s, i) => (
            <CarouselItem key={i}>
              <div className="h-2/5 flex">
                <img className="mx-auto h-full object-contain" src={s.imageUrl} />
              </div>
              <p className="text-gray-400">{s.session?.media?.artist || ''}</p>
              <OverflowingText text={s.session?.media?.title || ''} />
              <AudioProgressBar timeline={timelines.find((t) => t.source === s.source)} />
              <div className="w-full flex justify-between">
                <Button variant="ghost" size="icon" onClick={() => controlSession(s.source, 'SkipPrevious')}>
                  <SkipBack />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => controlSession(s.source, 'TogglePlayPause')}>
                  {s.session?.playback?.status === 'Playing' ? <Pause /> : <Play />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => controlSession(s.source, 'SkipNext')}>
                  <SkipForward />
                </Button>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious variant={'ghost'} className="ml-4 top-1/3" />
        <CarouselNext variant={'ghost'} className="mr-4 top-1/3" />
      </Carousel>
    </div>
  );
}

export default App;
