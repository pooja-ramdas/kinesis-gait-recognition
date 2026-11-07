import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Bell, Shield, MapPin, Activity } from 'lucide-react';

// Fix for default Leaflet marker icons in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Alert {
  type: string;
  id: string;
  severity: string;
  message: string;
  location: { lat: number; lng: number };
  timestamp: string;
}

function App() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to FastAPI local WebSocket
    const ws = new WebSocket('ws://localhost:8000/ws');

    ws.onopen = () => {
      console.log('Connected to Kinesis WebSocket');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ALERT') {
          setAlerts(prev => [data, ...prev]);
        }
      } catch (e) {
        console.log('Received raw message:', event.data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('Disconnected from Kinesis WebSocket');
    };

    return () => ws.close();
  }, []);

  const triggerDemo = async () => {
    try {
      await fetch('http://localhost:8000/api/demo/trigger_alert', { method: 'POST' });
    } catch(e) {
      console.error(\"Demo trigger failed\", e);
    }
  };

  return (
    <div className=\"min-h-screen bg-[#f8f9fa] flex flex-col font-sans\">
      {/* Header */}
      <header className=\"bg-white border-b-4 border-[#92b0fc] shadow-sm py-4 px-8 flex justify-between items-center\">
        <div className=\"flex items-center gap-3\">
          <Shield className=\"text-[#92b0fc] w-8 h-8\" />
          <h1 className=\"text-2xl font-bold text-gray-800 tracking-tight\">Kinesis</h1>
          <span className=\"text-sm text-gray-500 font-medium ml-2\">Public Safety Platform</span>
        </div>
        <div className=\"flex items-center gap-6\">
          <div className=\"flex items-center gap-2\">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className=\"text-sm font-semibold text-gray-600\">{connected ? 'System Live' : 'Disconnected'}</span>
          </div>
          <button onClick={triggerDemo} className=\"bg-[#92b0fc] hover:bg-[#7fa0f2] text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-colors\">
            Simulate Alert
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className=\"flex-1 flex p-6 gap-6 h-[calc(100vh-80px)]\">
        
        {/* Left Sidebar: Alert Feed */}
        <div className=\"w-1/3 min-w-[350px] bg-white rounded-xl shadow-lg border border-[#CCCCFF] p-5 flex flex-col overflow-hidden\">
          <div className=\"flex items-center justify-between mb-4 pb-2 border-b border-gray-100\">
            <h2 className=\"text-xl font-bold flex items-center gap-2 text-gray-800\">
              <Bell className=\"text-[#92b0fc]\" /> Live Alerts
            </h2>
            <span className=\"bg-[#CCCCFF] text-[#4a6cd4] text-xs font-bold px-3 py-1 rounded-full\">{alerts.length} New</span>
          </div>
          
          <div className=\"flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide\">
            {alerts.length === 0 ? (
              <div className=\"h-full flex flex-col items-center justify-center text-gray-400 opacity-70\">
                <Activity size={48} className=\"mb-3\" />
                <p>Monitoring for suspicious gait activity...</p>
              </div>
            ) : (
              alerts.map((alert, i) => (
                <div key={i} className={`p-4 rounded-xl border-l-4 shadow-sm animate-fade-in ${alert.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-[#92b0fc]'}`}>
                  <div className=\"flex justify-between items-start mb-2\">
                    <h3 className={`font-bold ${alert.severity === 'CRITICAL' ? 'text-red-700' : 'text-gray-800'}`}>
                      {alert.severity === 'CRITICAL' ? '🚨 BACKUP CALLED' : 'Suspicious Recognition'}
                    </h3>
                    <span className=\"text-xs text-gray-500 font-mono\">{alert.timestamp}</span>
                  </div>
                  <p className=\"text-sm text-gray-600 mb-3\">{alert.message}</p>
                  <div className=\"flex items-center text-xs text-gray-500 font-medium\">
                    <MapPin size={14} className=\"mr-1\" /> {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Area: Map View */}
        <div className=\"flex-1 bg-white rounded-xl shadow-lg border border-[#CCCCFF] overflow-hidden relative\">
            {/* Map Placeholder or Actual Leaflet */}
            <MapContainer center={[34.0522, -118.2437]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url=\"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png\"
              />
              {alerts.map((alert, i) => (
                <Marker key={i} position={[alert.location.lat, alert.location.lng]}>
                  <Popup>
                    <strong className=\"text-red-600\">{alert.severity} ALERT</strong><br/>
                    {alert.message}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
        </div>
      </main>
    </div>
  );
}

export default App;
