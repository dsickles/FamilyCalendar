export default function RotateNotice() {
  return (
    <div className="kiosk-rotate-notice">
      <div className="kiosk-rotate-card">
        <svg
          className="kiosk-rotate-icon"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="24" y="6" width="16" height="30" rx="3" />
          <path d="M32 12h.01" />
          <path d="M16 40a16 16 0 0 0 28 6" />
          <path d="M44 34v12H32" />
        </svg>
        <h1 className="kiosk-rotate-title">Rotate to landscape</h1>
        <p className="kiosk-rotate-copy">
          Family Calendar is a wall display. Turn your phone sideways to view it.
        </p>
      </div>
    </div>
  );
}
