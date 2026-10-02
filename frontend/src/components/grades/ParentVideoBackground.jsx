import { useState } from 'react';

// خلفية فيديو لكامل صفحة ولي الأمر — تظهر فقط على الكمبيوتر، وتُستبدل بخلفية ثابتة على الهاتف
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;

export default function ParentVideoBackground({ dim = 0.1 }) {
  const [fade, setFade] = useState(false);
  const [showVideo] = useState(isDesktop);

  const onTime = (e) => {
    const v = e.currentTarget;
    if (v.duration && v.duration - v.currentTime < 0.35) setFade(true);
  };
  const onEnded = (e) => {
    const v = e.currentTarget;
    v.currentTime = 0;
    v.play().catch(() => {});
    setTimeout(() => setFade(false), 60);
  };

  if (!showVideo) {
    return <div className="parent-video-root parent-video-static" data-testid="parent-video-bg" />;
  }

  return (
    <div className="parent-video-root" data-testid="parent-video-bg">
      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        className="parent-video"
        style={{ opacity: fade ? 0.35 : 1 }}
        onTimeUpdate={onTime}
        onEnded={onEnded}
        data-testid="parent-video"
      >
        <source src="/parent-bg.webm" type="video/webm" />
        <source src="/parent-bg.mp4" type="video/mp4" />
      </video>
      <div className="parent-video-shade" style={{ '--dim': dim }} />
    </div>
  );
}

