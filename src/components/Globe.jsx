/**
 * Globe.jsx — a wireframe Earth built from CSS 3D.
 * No images, no network, no canvas: just rings on a rotating sphere.
 * Latitude rings shrink toward the poles; longitude rings are rotated
 * around the Y axis. The whole thing turns slowly.
 */

const R = 250; // radius in px

const LATITUDES = [-60, -40, -20, 0, 20, 40, 60].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { r: R * Math.cos(rad), y: -R * Math.sin(rad) };
});

const LONGITUDES = Array.from({ length: 8 }, (_, i) => i * 22.5);

export default function Globe({ dim = false }) {
  return (
    <div className={`globe${dim ? ' is-dim' : ''}`} aria-hidden="true">
      <div className="globe-halo" />
      <div className="globe-rotor">
        {LATITUDES.map((l, i) => (
          <span
            key={`lat-${i}`}
            className="globe-lat"
            style={{
              width: `${l.r * 2}px`,
              height: `${l.r * 2}px`,
              transform: `translate(-50%, -50%) translateY(${l.y}px)`,
            }}
          />
        ))}
        {LONGITUDES.map((a, i) => (
          <span
            key={`lon-${i}`}
            className="globe-lon"
            style={{
              width: `${R * 2}px`,
              height: `${R * 2}px`,
              transform: `translate(-50%, -50%) rotateY(${a}deg)`,
            }}
          />
        ))}
        <span className="globe-orbit">
          <i />
        </span>
      </div>
    </div>
  );
}
