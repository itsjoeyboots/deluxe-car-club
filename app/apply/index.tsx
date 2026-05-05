import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import {
  Button,
  Card,
  Divider,
  ProgressBar,
  Screen,
  Text,
  TextField,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MEMBERSHIP } from '@/lib/membership';
import { colors, fonts } from '@/lib/theme';

const STEPS = [
  { key: 'intro', title: 'Welcome' },
  { key: 'personal', title: 'About You' },
  { key: 'car', title: 'Your Car' },
  { key: 'motivation', title: 'Why DCC' },
  { key: 'review', title: 'Review' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

export default function ApplyScreen() {
  const { profile, session, refreshProfile } = useAuth();
  const userId = session?.user.id;

  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [instagram, setInstagram] = useState(profile?.instagram_handle ?? '');

  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');

  const [motivation, setMotivation] = useState('');
  const [heardVia, setHeardVia] = useState('');
  const [referrer, setReferrer] = useState('');

  useEffect(() => {
    if (profile?.full_name && !fullName) setFullName(profile.full_name);
    if (profile?.city && !city) setCity(profile.city);
    if (profile?.phone && !phone) setPhone(profile.phone);
    if (profile?.instagram_handle && !instagram)
      setInstagram(profile.instagram_handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const step: StepKey = STEPS[stepIdx].key;

  const personalValid =
    fullName.trim().length > 1 &&
    city.trim().length > 0 &&
    phone.trim().length >= 7;
  const carValid =
    make.trim().length > 0 &&
    model.trim().length > 0 &&
    !!parseValidYear(year);
  const motivationValid = motivation.trim().length >= 10;

  const canAdvance = useMemo(() => {
    if (step === 'intro') return true;
    if (step === 'personal') return personalValid;
    if (step === 'car') return carValid;
    if (step === 'motivation') return motivationValid;
    return personalValid && carValid && motivationValid;
  }, [step, personalValid, carValid, motivationValid]);

  function next() {
    if (!canAdvance) {
      showError('Missing info', 'Fill the required fields before continuing.');
      return;
    }
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
  }

  function back() {
    if (stepIdx === 0) {
      router.back();
      return;
    }
    setStepIdx(stepIdx - 1);
  }

  async function submit() {
    if (!userId) {
      showError('Not signed in', 'Sign in again before applying.');
      return;
    }
    if (!isSupabaseConfigured) {
      showError(
        'Not configured',
        'Supabase env vars are missing. Check .env.local.',
      );
      return;
    }
    setSubmitting(true);
    try {
      // 1. Update profile fields used by the welcome kit / WhatsApp roster.
      const { error: pErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          city: city.trim(),
          phone: phone.trim(),
          instagram_handle:
            instagram.trim().replace(/^@/, '') || null,
          status: 'pending',
          applied_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (pErr) throw new Error(`Profile: ${pErr.message}`);

      // 2. Create the application row. No payment — application is free now.
      const primaryCar = `${year.trim()} ${make.trim()} ${model.trim()}`;
      const { data: appRow, error: aErr } = await supabase
        .from('applications')
        .insert({
          user_id: userId,
          primary_car: primaryCar,
          motivation_text: motivation.trim(),
          heard_via: heardVia.trim() || null,
          notes: referrer.trim() ? `Referrer: ${referrer.trim()}` : null,
          status: 'pending',
          payment_status: 'paid',
        })
        .select('id')
        .single();
      if (aErr || !appRow) throw new Error(`Application: ${aErr?.message ?? 'no row'}`);
      await refreshProfile();
      router.replace(`/apply/confirmation?app=${appRow.id}`);
    } catch (err) {
      console.error('[apply] submit failed', err);
      showError(
        'Submission failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Stack.Screen
        options={{
          title: 'Apply to DCC',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <Screen contentContainerStyle={{ paddingTop: 16, gap: 18 }}>
        <View>
          <Text variant="eyebrow" tone="terracotta">
            Application · Step {stepIdx + 1} of {STEPS.length}
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            {STEPS[stepIdx].title}
          </Text>
        </View>
        <ProgressBar
          value={(stepIdx + 1) / STEPS.length}
          max={1}
          tone="gold"
        />

        {step === 'intro' ? <IntroStep /> : null}
        {step === 'personal' ? (
          <PersonalStep
            fullName={fullName}
            setFullName={setFullName}
            city={city}
            setCity={setCity}
            phone={phone}
            setPhone={setPhone}
            instagram={instagram}
            setInstagram={setInstagram}
          />
        ) : null}
        {step === 'car' ? (
          <CarStep
            year={year}
            setYear={setYear}
            make={make}
            setMake={setMake}
            model={model}
            setModel={setModel}
          />
        ) : null}
        {step === 'motivation' ? (
          <MotivationStep
            motivation={motivation}
            setMotivation={setMotivation}
            heardVia={heardVia}
            setHeardVia={setHeardVia}
            referrer={referrer}
            setReferrer={setReferrer}
          />
        ) : null}
        {step === 'review' ? (
          <ReviewStep
            fullName={fullName}
            city={city}
            phone={phone}
            instagram={instagram}
            year={year}
            make={make}
            model={model}
            motivation={motivation}
            heardVia={heardVia}
            referrer={referrer}
          />
        ) : null}

        <Divider />

        <View style={{ gap: 10 }}>
          {step === 'review' ? (
            <Button
              label={submitting ? 'Submitting…' : 'Submit Application'}
              size="lg"
              fullWidth
              loading={submitting}
              onPress={submit}
            />
          ) : (
            <Button label="Continue" size="lg" fullWidth onPress={next} />
          )}
          <Button
            label={stepIdx === 0 ? 'Cancel' : 'Back'}
            variant="ghost"
            fullWidth
            onPress={back}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function IntroStep() {
  return (
    <View style={{ gap: 14 }}>
      <Card variant="raised">
        <Text variant="eyebrow" tone="terracotta">
          The basics
        </Text>
        <Bullet>Application is free</Bullet>
        <Bullet>Founders review every application by hand</Bullet>
        <Bullet>
          If approved, base membership is ${MEMBERSHIP.base.annual}/yr
        </Bullet>
        <Bullet>
          Optional add-ons: Marketplace (${MEMBERSHIP.marketplaceAddon.annual}/yr) ·
          Season Pass (${MEMBERSHIP.seasonPass.monthly}/mo)
        </Bullet>
        <Bullet>
          Cap is {MEMBERSHIP.approvedCap} approved applicants total
        </Bullet>
      </Card>
      <Card>
        <Text variant="bodyBold">What happens next</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          You{'’'}ll get an email when a founder reviews your application.
          Once approved, you can activate your $
          {MEMBERSHIP.base.annual}/yr base membership and add the
          Marketplace or Season Pass add-ons whenever you want.
        </Text>
      </Card>
    </View>
  );
}

function PersonalStep(props: {
  fullName: string;
  setFullName: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  instagram: string;
  setInstagram: (v: string) => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      <TextField
        label="Full name"
        value={props.fullName}
        onChangeText={props.setFullName}
        autoCapitalize="words"
      />
      <TextField
        label="City"
        value={props.city}
        onChangeText={props.setCity}
        placeholder="Queen Creek, Gilbert, Chandler…"
        autoCapitalize="words"
      />
      <TextField
        label="Phone (for the WhatsApp channel)"
        value={props.phone}
        onChangeText={props.setPhone}
        keyboardType="phone-pad"
      />
      <TextField
        label="Instagram handle (optional)"
        value={props.instagram}
        onChangeText={props.setInstagram}
        placeholder="username (no @)"
        autoCapitalize="none"
      />
    </View>
  );
}

function CarStep(props: {
  year: string;
  setYear: (v: string) => void;
  make: string;
  setMake: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      <Text variant="small" tone="muted">
        Tell us about your headline car. Daily, weekend, or project — all
        welcome.
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 120 }}>
          <TextField
            label="Year"
            value={props.year}
            onChangeText={props.setYear}
            keyboardType="number-pad"
            placeholder="2015"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Make"
            value={props.make}
            onChangeText={props.setMake}
            placeholder="Toyota"
            autoCapitalize="words"
          />
        </View>
      </View>
      <TextField
        label="Model"
        value={props.model}
        onChangeText={props.setModel}
        placeholder="GR Corolla"
        autoCapitalize="words"
      />
    </View>
  );
}

function MotivationStep(props: {
  motivation: string;
  setMotivation: (v: string) => void;
  heardVia: string;
  setHeardVia: (v: string) => void;
  referrer: string;
  setReferrer: (v: string) => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      <TextField
        label="Why are you applying?"
        value={props.motivation}
        onChangeText={props.setMotivation}
        placeholder="What you're hoping to get out of DCC. Be honest, no buzzwords needed."
        multiline
        numberOfLines={5}
        style={{ minHeight: 110, textAlignVertical: 'top' }}
      />
      <TextField
        label="How did you hear about us?"
        value={props.heardVia}
        onChangeText={props.setHeardVia}
        placeholder="Instagram / friend / event / other…"
      />
      <TextField
        label="Referred by (optional)"
        value={props.referrer}
        onChangeText={props.setReferrer}
        placeholder="Name or @handle of the member who told you"
      />
    </View>
  );
}

function ReviewStep(props: {
  fullName: string;
  city: string;
  phone: string;
  instagram: string;
  year: string;
  make: string;
  model: string;
  motivation: string;
  heardVia: string;
  referrer: string;
}) {
  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Text variant="eyebrow" tone="muted">
          Personal
        </Text>
        <ReviewRow label="Name" value={props.fullName} />
        <ReviewRow label="City" value={props.city} />
        <ReviewRow label="Phone" value={props.phone} />
        {props.instagram ? (
          <ReviewRow label="Instagram" value={`@${props.instagram.replace(/^@/, '')}`} />
        ) : null}
      </Card>
      <Card>
        <Text variant="eyebrow" tone="muted">
          Car
        </Text>
        <ReviewRow
          label="Primary car"
          value={`${props.year} ${props.make} ${props.model}`.trim()}
        />
      </Card>
      <Card>
        <Text variant="eyebrow" tone="muted">
          Motivation
        </Text>
        <Text variant="small" style={{ marginTop: 6 }}>
          {props.motivation}
        </Text>
        {props.heardVia ? (
          <ReviewRow label="Heard via" value={props.heardVia} />
        ) : null}
        {props.referrer ? (
          <ReviewRow label="Referred by" value={props.referrer} />
        ) : null}
      </Card>
      <Text variant="caption" tone="muted">
        By submitting, you understand that founders review applications at
        their own pace. Approval is required before activating your base
        membership.
      </Text>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text variant="caption" tone="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyBold" numberOfLines={2} style={{ flexShrink: 1 }}>
        {value || '—'}
      </Text>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
      <Text style={{ color: colors.terracottaDeep, fontFamily: fonts.sansBold }}>
        ·
      </Text>
      <Text variant="small" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

function parseValidYear(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 1900 || n > 2100) return null;
  return n;
}

function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const styles = StyleSheet.create({
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
});
