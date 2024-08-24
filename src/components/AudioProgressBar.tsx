import type { PlaybackModel, Timeline, TimelineModel } from '@/types/winrt';
import { useEffect, useState } from 'react';

const AudioProgressBar = ({
  rawTimeline,
  playbackStatus,
}: {
  rawTimeline?: TimelineModel;
  playbackStatus?: PlaybackModel['status'];
}) => {
  if (!rawTimeline || !playbackStatus) return <div></div>;
  const [timeline, setTimeline] = useState<Timeline>({ positionMs: 0, length: 1 });
  useEffect(() => {
    const length = rawTimeline.end / 10000000;
    const positionMs = rawTimeline.position / 10000;
    clearInterval(timeline.positionLoop);
    if (playbackStatus === 'Playing') {
      const interval = setInterval(() => {
        setTimeline((prev) => {
          return { ...prev, positionMs: (prev.positionMs += 250) };
        });
      }, 250);
      setTimeline({ length, positionMs, positionLoop: interval });
    } else if (playbackStatus === 'Paused') {
      setTimeline({ length, positionMs });
    }

    return () => {
      clearInterval(timeline.positionLoop);
    };
  }, [rawTimeline]);

  const posMins = Math.floor(timeline.positionMs / 60000);
  const posSecs = Math.trunc((timeline.positionMs - posMins * 60000) / 1000);
  const lenMins = Math.floor(timeline.length / 60);
  const lenSecs = Math.trunc(timeline.length - lenMins * 60);
  const percentage = (timeline.positionMs / 1000 / timeline.length) * 100;
  return (
    <div className="w-full">
      <div className="w-full flex justify-between text-xs text-gray-300">
        <p>
          {posMins}:{posSecs < 10 ? `0${posSecs}` : posSecs}
        </p>
        <p>
          {lenMins}:{lenSecs < 10 ? `0${lenSecs}` : lenSecs}
        </p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1 dark:bg-gray-700">
        <div className="bg-white h-1.5 rounded-full dark:bg-white" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

export default AudioProgressBar;
