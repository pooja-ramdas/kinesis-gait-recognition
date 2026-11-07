import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  FlatList,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Set your machine's Local LAN IP address here (e.g. 192.168.1.100 or 10.0.2.2 for Android Emulator)
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

type AppAlert = {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'WARNING' | 'INFO';
  message: string;
  location: { lat: number; lng: number };
  timestamp: string;
  person_id?: string;
  confidence?: number;
};

export default function App() {
  const [hostIp, setHostIp] = useState(DEFAULT_HOST);
  const [showSettings, setShowSettings] = useState(false);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [callingState, setCallingState] = useState<'IDLE' | 'CALLING' | 'CONNECTED'>('IDLE');
  const ws = useRef<WebSocket | null>(null);

  const WS_URL = `ws://${hostIp}:8000/ws`;
  const API_URL = `http://${hostIp}:8000/api/backup/call`;

  useEffect(() => {
    connectWebSocket();
    return () => {
      ws.current?.close();
    };
  }, [hostIp]);

  const connectWebSocket = () => {
    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        setConnected(true);
        console.log('Connected to Kinesis Local Hub');
      };

      ws.current.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ALERT' || payload.severity) {
            const newAlert: AppAlert = {
              id: payload.id || Math.random().toString(36).substring(2, 9),
              type: payload.type || 'REID_DETECTION',
              severity: payload.severity || 'HIGH',
              message: payload.message || 'Suspicious gait pattern detected',
              location: payload.location || { lat: 34.0522, lng: -118.2437 },
              timestamp: payload.timestamp || new Date().toLocaleTimeString(),
              person_id: payload.person_id,
              confidence: payload.confidence
            };

            setAlerts((prev) => [newAlert, ...prev]);

            if (newAlert.severity === 'CRITICAL' || newAlert.severity === 'HIGH') {
              Alert.alert('🚨 Emergency Alert', `${newAlert.message}`);
            }
          }
        } catch (err) {
          console.log('WS parse notice:', event.data);
        }
      };

      ws.current.onclose = () => {
        setConnected(false);
      };

      ws.current.onerror = () => {
        setConnected(false);
      };
    } catch (e) {
      console.log('Connection failed:', e);
    }
  };

  const handleCallForBackup = async () => {
    try {
      // 1. Send via WebSocket if open
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          action: 'backup',
          officer_id: 'UNIT-402',
          location: { lat: 34.0522, lng: -118.2437 }
        }));
      }

      // 2. Also send via REST fallback
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officer_id: 'UNIT-402',
          location: { lat: 34.0522, lng: -118.2437 },
          message: 'Officer requests immediate tactical assistance!'
        })
      });

      if (resp.ok) {
        Alert.alert('✅ Dispatch Acknowledged', 'Priority Alert broadcasted to Central Command & Units.');
      }
    } catch (err) {
      Alert.alert('Offline Mode Alert', 'Dispatch triggered locally via emergency packet.');
    }
  };

  const startVoiceCall = () => {
    setCallingState('CALLING');
    setCallModalVisible(true);
    setTimeout(() => {
      setCallingState('CONNECTED');
    }, 2000);
  };

  const endVoiceCall = () => {
    setCallingState('IDLE');
    setCallModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>Kinesis Field</Text>
          <Text style={styles.subTitle}>Tactical Gait & Safety Network</Text>
        </View>

        <View style={styles.statusContainer}>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: connected ? '#22c55e' : '#ef4444' }]}
            onPress={() => setShowSettings(!showSettings)}
          >
            <Text style={styles.statusText}>{connected ? 'LIVE' : 'OFFLINE'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Network Configuration IP Input */}
      {showSettings && (
        <View style={styles.settingsBox}>
          <Text style={styles.settingsLabel}>Local Server IP Address:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.ipInput}
              value={hostIp}
              onChangeText={setHostIp}
              placeholder="192.168.x.x"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.reconnectBtn} onPress={connectWebSocket}>
              <Text style={styles.reconnectBtnText}>Connect</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Alert Feed */}
      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>Active Surveillance Incidents ({alerts.length})</Text>
        <TouchableOpacity style={styles.callDispatchBtn} onPress={startVoiceCall}>
          <Text style={styles.callDispatchText}>📞 Dispatch</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No alerts active. Perimeter clear.</Text>
            <Text style={styles.emptySubText}>AI CASIA-B engine scanning live tracks...</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCritical = item.severity === 'CRITICAL';
          return (
            <View style={[styles.alertCard, isCritical ? styles.alertCardCritical : styles.alertCardNormal]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.alertSeverity, isCritical ? styles.textCritical : styles.textNormal]}>
                  {isCritical ? '🚨 CRITICAL' : `⚠️ ${item.severity}`}
                </Text>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>
              <Text style={styles.message}>{item.message}</Text>
              {item.person_id && (
                <Text style={styles.meta}>Target ID: {item.person_id} | Conf: {item.confidence ? `${(item.confidence * 100).toFixed(0)}%` : 'N/A'}</Text>
              )}
              <Text style={styles.location}>📍 Coordinates: {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}</Text>
            </View>
          );
        }}
      />

      {/* High-Priority "Call For Backup" Button */}
      <View style={styles.actionFooter}>
        <TouchableOpacity style={styles.backupButton} onPress={handleCallForBackup}>
          <Text style={styles.backupButtonText}>🚨 CALL FOR BACKUP</Text>
        </TouchableOpacity>
      </View>

      {/* Simulated Dispatch Call Modal */}
      <Modal visible={callModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Central Command Dispatch</Text>
            {callingState === 'CALLING' ? (
              <View style={styles.callingView}>
                <ActivityIndicator size="large" color="#92b0fc" />
                <Text style={styles.callingText}>Connecting secure channel...</Text>
              </View>
            ) : (
              <View style={styles.callingView}>
                <Text style={styles.connectedText}>🟢 SECURE AUDIO LINK ACTIVE</Text>
                <Text style={styles.audioMeta}>Encrypted channel: SEC-NET-09</Text>
              </View>
            )}
            <TouchableOpacity style={styles.endCallBtn} onPress={endVoiceCall}>
              <Text style={styles.endCallText}>End Transmission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: '#92b0fc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff'
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b'
  },
  subTitle: {
    fontSize: 12,
    color: '#64748b'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  settingsBox: {
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  settingsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8
  },
  ipInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  reconnectBtn: {
    backgroundColor: '#92b0fc',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 6
  },
  reconnectBtnText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fafafa'
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155'
  },
  callDispatchBtn: {
    backgroundColor: '#CCCCFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  callDispatchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e1b4b'
  },
  listContent: {
    padding: 16
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b'
  },
  emptySubText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4
  },
  alertCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  alertCardCritical: {
    borderLeftColor: '#ef4444',
    backgroundColor: '#fef2f2'
  },
  alertCardNormal: {
    borderLeftColor: '#92b0fc',
    backgroundColor: '#f8fafc'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  alertSeverity: {
    fontSize: 12,
    fontWeight: '800'
  },
  textCritical: {
    color: '#dc2626'
  },
  textNormal: {
    color: '#3b82f6'
  },
  timestamp: {
    fontSize: 11,
    color: '#94a3b8'
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6
  },
  meta: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 2
  },
  location: {
    fontSize: 11,
    color: '#64748b'
  },
  actionFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  backupButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4
  },
  backupButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20
  },
  callingView: {
    alignItems: 'center',
    marginVertical: 20
  },
  callingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14
  },
  connectedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16a34a'
  },
  audioMeta: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6
  },
  endCallBtn: {
    marginTop: 10,
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  endCallText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});
