import { Session, SessionControl } from '@/types/winrt';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import AudioProgressBar from './AudioProgressBar';
import OverflowingText from './OverflowingText';
import { Button } from './ui/button';
import { SkipBack, Pause, Play, SkipForward } from 'lucide-react';

type Props = {
  sessions: Session[];
  controlSession: (source: string, control: SessionControl) => void;
};

const MiniMode = ({ sessions, controlSession }: Props) => {
  return (
    <div data-tauri-drag-region className="w-full h-full p-1">
      <Carousel opts={{ loop: true }}>
        <CarouselContent>
          {sessions.map((s, i) => (
            <CarouselItem key={i}>
              <div className={`grid grid-cols-8 gap-3 w-[${window.innerWidth}px] h-[${window.innerHeight}px]`}>
                <div className="col-span-1">
                  <img className="h-full object-contain" src={s.imageUrl} />
                </div>
                <div className="col-span-3 h-full">
                  <div className="grid grid-cols-3 grid-rows-2 gap-1">
                    <div className="col-span-4">
                      <OverflowingText text={`${s.session?.media?.title} - ${s.session?.media?.artist}`} twClass="" />
                    </div>
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
                </div>
                <div className="col-span-4 w-full">
                  <AudioProgressBar rawTimeline={s.session?.timeline} playbackStatus={s.session?.playback?.status} />
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious variant={'ghost'} />
        <CarouselNext variant={'ghost'} />
      </Carousel>
    </div>
  );
};

export default MiniMode;
