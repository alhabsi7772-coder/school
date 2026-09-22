/**
 * خلفية فيديو سينمائية لصفحات الدخول.
 * ميزات:
 *  - فيديو لانهائي (autoplay + loop + muted) بتأثير Ken Burns ناعم لإحساس بالعمق
 *  - فينييت دائري + تدرّجات + لمسة لون الثيم + غبار ضوئي متطاير
 *  - شرائط سينمائية أعلى وأسفل لإطار أنيق (letterbox-style ناعم)
 */
export default function LoginVideoBackground({ overlay = 0.45, accentRgb = '99,179,237' }) {
  // 8 جسيمات غبار ضوئي — عدد منخفض للحفاظ على سلاسة الفيديو
  const dust = Array.from({ length: 8 }).map((_, i) => ({
    left: `${(i * 12.7 + 6) % 100}%`,
    duration: 16 + (i * 1.9) % 10,
    delay: -((i * 2.6) % 16),
    size: 2 + ((i * 3) % 4),
  }));

  return (
    <div className="fixed inset-0 z-0 overflow-hidden login-cinematic-bars login-bg-root"
      data-testid="login-video-bg"
      style={{ '--accent-rgb': accentRgb, backgroundImage: 'url(/login-bg-poster.jpg)' }}>
      {/* طبقة Ken Burns منفصلة عن الفيديو: الحركة على الحاوية والفلتر على الفيديو
          => المتصفح يخزّن الفيديو المفلتر كطبقة واحدة ويحرّكها فقط (بدون إعادة فلترة كل إطار) */}
      <div className="absolute inset-0 login-kenburns">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/login-bg-poster.jpg"
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          className="absolute inset-0 w-full h-full object-cover login-video-tinted"
          style={{ objectPosition: '30% center' }}
          onLoadedMetadata={(e) => { try { e.currentTarget.play(); } catch { /* autoplay blocked */ } }}
          onEnded={(e) => { e.currentTarget.currentTime = 0; e.currentTarget.play().catch(() => {}); }}
        >
          <source src="/login-bg-720.mp4" type="video/mp4" />
        </video>
      </div>

      {/* فينييت دائري — يُبقي الأطراف ساطعة والمركز معتم لقراءة النموذج */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            `radial-gradient(ellipse at 50% 50%, rgba(11,17,32,${overlay * 1.25}) 0%, rgba(11,17,32,${overlay * 0.9}) 30%, rgba(11,17,32,${overlay * 0.5}) 75%, rgba(11,17,32,${overlay * 0.3}) 100%)`,
        }}
      />

      {/* تدرّج علوي/سفلي خفيف يُكمّل الشرائط السينمائية */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            `linear-gradient(180deg, rgba(11,17,32,0.25) 0%, transparent 30%, transparent 70%, rgba(11,17,32,0.3) 100%)`,
        }}
      />

      {/* لمسة لون بمحاذاة الثيم */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
        style={{
          background:
            `radial-gradient(circle at 50% 65%, rgba(${accentRgb}, 0.32) 0%, transparent 60%)`,
        }}
      />

      {/* غبار ضوئي طافي يصعد ببطء — يُضيف حياة وعمق */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {dust.map((d, i) => (
          <span
            key={i}
            className="login-dust"
            style={{
              left: d.left,
              width: `${d.size}px`,
              height: `${d.size}px`,
              animationDuration: `${d.duration}s`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}
      </div>

      {/* غرين/نويز خفيف يكسر الانطباع البلاستيكي */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.65 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
