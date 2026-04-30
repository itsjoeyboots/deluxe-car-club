import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radii } from '@/lib/theme';

type Outcome =
  | { kind: 'success'; name: string; appNumber: number | null; awarded: number; firstEvent: boolean }
  | { kind: 'duplicate'; name: string }
  | { kind: 'error'; message: string };

type CheckinResult = {
  user_id: string;
  full_name: string | null;
  app_number: number | null;
  awarded: number;
  first_event: boolean;
  rsvp_status: string;
  already_checked_in: boolean;
};

export default function AdminScanScreen() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ event?: string; eventTitle?: string }>();
  const eventId = typeof params.event === 'string' ? params.event : null;
  const eventTitle =
    typeof params.eventTitle === 'string' ? params.eventTitle : null;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  if (profile?.role !== 'admin') {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Scanner', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!eventId) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Scanner', headerShown: true }} />
        <Text variant="display">No event selected.</Text>
        <Text tone="muted">
          Open an event and tap the Scan button to start checking members in.
        </Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function processScan(value: string) {
    if (!value || busy || !eventId) return;
    setBusy(true);
    setScanning(false);
    const { data, error } = await supabase.rpc('checkin_member', {
      qr_data: value,
      target_event: eventId,
    });
    setBusy(false);

    if (error) {
      console.error('[scan] checkin failed', error);
      setOutcome({ kind: 'error', message: error.message });
    } else {
      const row = (data as CheckinResult[] | null)?.[0];
      if (!row) {
        setOutcome({ kind: 'error', message: 'No result from server' });
      } else if (row.already_checked_in) {
        setOutcome({ kind: 'duplicate', name: row.full_name ?? 'Member' });
      } else {
        setOutcome({
          kind: 'success',
          name: row.full_name ?? 'Member',
          appNumber: row.app_number,
          awarded: row.awarded,
          firstEvent: row.first_event,
        });
      }
    }

    cooldownRef.current = setTimeout(() => {
      setOutcome(null);
      setScanning(true);
    }, 1800);
  }

  function rescan() {
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    setOutcome(null);
    setScanning(true);
  }

  async function submitManual() {
    const v = manualToken.trim();
    if (!v) return;
    setManualToken('');
    await processScan(v);
  }

  // ---- camera permission handling ----
  if (!permission) {
    return (
      <Screen>
        <Text>Loading camera…</Text>
      </Screen>
    );
  }
  if (!permission.granted) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Scanner', headerShown: true }} />
        <Text variant="display">Camera access needed</Text>
        <Text tone="muted">
          To scan member QR codes, allow camera access for this app.
        </Text>
        <Button label="Grant access" onPress={() => requestPermission()} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
      <Stack.Screen
        options={{
          title: eventTitle ? `Scan · ${eventTitle}` : 'Scanner',
          headerShown: true,
        }}
      />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Founders only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Check-In Scanner
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Point at a member card or event RSVP QR. We auto-dedupe; the same
          member can only earn points once per event.
        </Text>
      </View>

      <View style={styles.frame}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallback}>
            <Text variant="bodyBold" tone="onDark">
              Live camera unavailable on web.
            </Text>
            <Text variant="small" tone="onDark" style={{ marginTop: 6, textAlign: 'center' }}>
              Use the iOS / Android app for camera scanning, or paste a token
              below to check someone in manually.
            </Text>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={
              scanning
                ? ({ data }) => processScan(data)
                : undefined
            }
          />
        )}
        <View pointerEvents="none" style={styles.reticle} />
      </View>

      {outcome ? <OutcomeCard outcome={outcome} /> : null}

      {outcome ? (
        <Button label="Scan another" onPress={rescan} />
      ) : (
        <Card variant="inset">
          <Text variant="eyebrow" tone="muted">
            Manual entry
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            If a phone screen is dim or the camera can{'’'}t lock on, paste
            the token from the member{'’'}s card.
          </Text>
          <TextInput
            value={manualToken}
            onChangeText={setManualToken}
            placeholder="mbr_abc123…  or  event RSVP token"
            placeholderTextColor={colors.textMuted}
            style={styles.manualInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            label={busy ? 'Checking in…' : 'Check in'}
            onPress={submitManual}
            disabled={!manualToken.trim() || busy}
            loading={busy}
            style={{ marginTop: 10 }}
          />
        </Card>
      )}
    </Screen>
  );
}

function OutcomeCard({ outcome }: { outcome: Outcome }) {
  if (outcome.kind === 'success') {
    return (
      <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.success }}>
        <Text variant="eyebrow" style={{ color: colors.success }}>
          Checked in
        </Text>
        <Text variant="h2" style={{ marginTop: 4 }}>
          {outcome.name}
          {outcome.appNumber
            ? ` · #${String(outcome.appNumber).padStart(3, '0')}`
            : ''}
        </Text>
        <Text variant="bodyBold" tone="terracotta" style={{ marginTop: 6 }}>
          +{outcome.awarded} points{outcome.firstEvent ? ' · first event bonus' : ''}
        </Text>
      </Card>
    );
  }
  if (outcome.kind === 'duplicate') {
    return (
      <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.gold }}>
        <Text variant="eyebrow" style={{ color: colors.gold }}>
          Already checked in
        </Text>
        <Text variant="bodyBold" style={{ marginTop: 4 }}>
          {outcome.name} is already in. No points awarded.
        </Text>
      </Card>
    );
  }
  return (
    <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.danger }}>
      <Text variant="eyebrow" style={{ color: colors.danger }}>
        Couldn’t check in
      </Text>
      <Text variant="small" style={{ marginTop: 4 }}>
        {outcome.message}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 320,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    position: 'relative',
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.ink,
  },
  reticle: {
    position: 'absolute',
    top: '20%',
    left: '20%',
    right: '20%',
    bottom: '20%',
    borderWidth: 3,
    borderColor: colors.gold,
    borderRadius: radii.md,
  },
  manualInput: {
    marginTop: 10,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 14,
  },
});
