/**
 * خلفية فيديو متحرّكة لصفحات الدخول — تشتغل بصمت، لانهائية، 4K UHD.
 * الفيديو يملأ كامل الشاشة، مع طبقة تظليل لضمان قراءة النصوص فوقه.
 */
export default function LoginVideoBackground({ overlay = 0.45, accentRgb = '99,179,237' }) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" data-testid="login-video-bg">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          // إزاحة لطيفة لقصّ الجانب الأيمن من الفيديو حيث توجد النجمة (object-position) — طريقة احترافية بلا تشويه
          objectPosition: '30% center',
          // تعزيز حدة الخطوط السماوية والتباين دون تأثير على بقية المحتوى
          filter: 'saturate(1.35) contrast(1.15) brightness(0.95)',
          willChange: 'transform',
        }}
        onLoadedMetadata={(e) => { try { e.currentTarget.play(); } catch { /* autoplay blocked */ } }}
        onEnded={(e) => { e.currentTarget.currentTime = 0; e.currentTarget.play().catch(() => {}); }}
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      {/* فينييت دائري لإبقاء الفيديو ظاهراً في الأطراف والمركز معتم لقراءة المحتوى */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            `radial-gradient(ellipse at 50% 50%, rgba(11,17,32,${overlay * 1.15}) 0%, rgba(11,17,32,${overlay * 0.85}) 30%, rgba(11,17,32,${overlay * 0.45}) 75%, rgba(11,17,32,${overlay * 0.25}) 100%)`,
        }}
      />

      {/* تدرّج علوي/سفلي خفيف للحدود */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            `linear-gradient(180deg, rgba(11,17,32,0.3) 0%, transparent 25%, transparent 75%, rgba(11,17,32,0.35) 100%)`,
        }}
      />

      {/* لمسة لون بسيطة بمحاذاة الثيم */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-25"
        style={{
          background:
            `radial-gradient(circle at 50% 60%, rgba(${accentRgb}, 0.22) 0%, transparent 65%)`,
        }}
      />

      {/* غرين/نويز خفيف يكسر الانطباع البلاستيكي */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.65 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
