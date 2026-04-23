import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// 🔥 FIX DEFAULT MARKER ICON
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function LiveMap({ job, userData }) {
  if (!job?.location || !userData?.location) return null;

  const clientPos = [
    userData.location.lat,
    userData.location.lng,
  ];

  const artisanPos = job.artisanLocation
    ? [job.artisanLocation.lat, job.artisanLocation.lng]
    : null;

  return (
    <div className="mt-4 rounded-xl overflow-hidden">
      <MapContainer
        center={clientPos}
        zoom={13}
        style={{ height: "250px", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* CLIENT */}
        <Marker position={clientPos}>
          <Popup>📍 You</Popup>
        </Marker>

        {/* ARTISAN */}
        {artisanPos && (
          <Marker position={artisanPos}>
            <Popup>👷 Artisan</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}