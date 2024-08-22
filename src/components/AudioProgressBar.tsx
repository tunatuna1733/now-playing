import { Timeline } from '@/types/winrt';

const AudioProgressBar = ({ timeline }: { timeline?: Timeline }) => {
  if (!timeline) return <div></div>;
  const position = timeline.position;
  const length = timeline.length;
  const posMins = Math.floor(position / 60);
  const posSecs = Math.trunc(position - posMins * 60);
  const lenMins = Math.floor(length / 60);
  const lenSecs = Math.trunc(length - lenMins * 60);
  const percentage = (position / length) * 100;
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
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 dark:bg-gray-700">
        <div className="bg-white h-1.5 rounded-full dark:bg-white" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

export default AudioProgressBar;
