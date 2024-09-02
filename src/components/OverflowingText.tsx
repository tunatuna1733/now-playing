import { useState, useEffect } from 'react';

const OverflowingText = ({ text, twClass }: { text: string; twClass?: string }) => {
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
      <p className={`${twClass}${overflow && hover ? ' animate-text-move' : ''}`} id={pId}>
        {text}
      </p>
    </div>
  );
};

export default OverflowingText;
