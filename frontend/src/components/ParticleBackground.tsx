// Flat neobrutalism background — no gradients, no blur
export default function Background() {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden="true" style={{ background: "#FFFBF0" }}>
      {/* Chunky grid pattern for neobrutalism texture */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        pointerEvents: "none",
      }} />
    </div>
  );
}
