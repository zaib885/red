import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { createStopIcon } from './BusMarker';

const stopIcons = {
  idle: createStopIcon(false),
  selected: createStopIcon(true),
};

function MapBehavior({ stops, busPosition, follow, onUserDrag }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(L.latLngBounds(stops.map((stop) => [stop.lat, stop.lng])), { padding: [40, 40] });
  }, [map, stops]);

  useEffect(() => {
    if (follow && busPosition) map.panTo(busPosition, { animate: true });
  }, [map, busPosition, follow]);

  useMapEvents({ dragstart: onUserDrag });
  return null;
}

export function TrackingMap({
  mapRef,
  route,
  selectedStop,
  onSelectStop,
  passengerPos,
  passengerIcon,
  busPosition,
  busIcon,
  follow,
  onUserDrag,
}) {
  return (
    <MapContainer
      center={[route.stops[0].lat, route.stops[0].lng]}
      zoom={12}
      scrollWheelZoom
      className="tracking-map"
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline
        positions={route.stops.map((stop) => [stop.lat, stop.lng])}
        pathOptions={{ color: '#126ac1', weight: 5, opacity: 0.8 }}
      />
      {route.stops.map((stop) => (
        <Marker
          key={stop.name}
          position={[stop.lat, stop.lng]}
          icon={selectedStop?.name === stop.name ? stopIcons.selected : stopIcons.idle}
          eventHandlers={{ click: () => onSelectStop(stop) }}
        >
          <Tooltip>{stop.name}</Tooltip>
        </Marker>
      ))}
      {passengerPos && <Marker position={passengerPos} icon={passengerIcon} />}
      {busPosition && <Marker position={busPosition} icon={busIcon} />}
      <MapBehavior
        stops={route.stops}
        busPosition={busPosition}
        follow={follow}
        onUserDrag={onUserDrag}
      />
    </MapContainer>
  );
}
