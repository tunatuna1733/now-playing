import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import AudioProgressBar from './AudioProgressBar';
import { Button } from './ui/button';
import { Equal, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { exit } from '@tauri-apps/plugin-process';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Session, SessionControl } from '@/types/winrt';
import React from 'react';
import OverflowingText from './OverflowingText';

type Props = {
  sessions: Session[];
  controlSession: (source: string, control: SessionControl) => void;
};

const NormalMode = ({ sessions, controlSession }: Props) => {
  const setAlwaysOnTop = async (alwaysOnTop: boolean) => {
    const currentWindow = getCurrentWindow();
    try {
      await currentWindow.setAlwaysOnTop(alwaysOnTop);
    } catch {
      console.error('Failed to set window always on top.');
    }
  };

  const closeApp = () => {
    exit(1);
  };

  return (
    <React.Fragment>
      <div data-tauri-drag-region className="h-[20px] w-full flex justify-between">
        <div data-tauri-drag-region className="w-[20px]"></div>
        <Equal data-tauri-drag-region className="justify-self-center" size={20} />
        <X className="hover:bg-gray-500" size={20} onClick={closeApp} />
      </div>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger className="float-end">
            <Switch className="pr-[20px]" onCheckedChange={setAlwaysOnTop} />
          </TooltipTrigger>
          <TooltipContent>
            <p>Set Always on Top</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Carousel className="mt-[20px] mx-10" opts={{ loop: true }}>
        <CarouselContent>
          {sessions.map((s, i) => (
            <CarouselItem key={i}>
              <div className="h-2/5 flex">
                <img className="mx-auto h-full object-contain" src={s.imageUrl} />
              </div>
              <p className="text-gray-400 text-sm">{s.session?.media?.artist || ''}</p>
              <OverflowingText
                text={s.session?.media?.title || ''}
                twClass="inline-block relative font-semibold text-lg"
              />
              <AudioProgressBar rawTimeline={s.session?.timeline} playbackStatus={s.session?.playback?.status} />
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
    </React.Fragment>
  );
};

export default NormalMode;
