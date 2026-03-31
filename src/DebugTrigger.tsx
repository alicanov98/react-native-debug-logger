import React, { useState, ReactNode, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  NativeModules,
} from 'react-native';
import { DebugMonitor } from './DebugMonitor';
import { setupNetworkMonitor } from './NetworkMonitor';
import { setupConsoleMonitor } from './ConsoleMonitor';

interface DebugTriggerProps {
  children?: ReactNode;
  password?: string;
  clicksNeeded?: number;
  isDemo?: boolean;
  onEnvChange?: (newEnv: 'demo' | 'prod') => void;
  onBaseUrlChange?: (newUrl: string) => void;
  baseUrls?: string[] | { title: string; url: string }[];
  enabled?: boolean;
  checkAccess?: () => boolean | Promise<boolean>;
  language?: 'az' | 'en' | 'ru' | 'tr' | 'auto';
}

const TRANSLATIONS: Record<string, any> = {
  az: { login: 'Debug Girişi', clicks: (n: number) => `Ardıcıl ${n} klik aşkar edildi`, passPlaceholder: 'Şifrəni daxil edin', cancel: 'Ləğv et', confirm: 'Təsdiqlə', error: 'Xəta', wrongPass: 'Şifrə yanlışdır' },
  en: { login: 'Debug Login', clicks: (n: number) => `${n} clicks detected`, passPlaceholder: 'Enter password', cancel: 'Cancel', confirm: 'Confirm', error: 'Error', wrongPass: 'Wrong password' },
  ru: { login: 'Вход', clicks: (n: number) => `Обнаружено ${n} кликов`, passPlaceholder: 'Введите пароль', cancel: 'Отмена', confirm: 'Ок', error: 'Ошибка', wrongPass: 'Неверный пароль' },
  tr: { login: 'Giriş', clicks: (n: number) => `${n} tıklama tespit edildi`, passPlaceholder: 'Şifreyi giriniz', cancel: 'İptal', confirm: 'Onayla', error: 'Hata', wrongPass: 'Yanlış şifre' }
};

const COLORS = {
  background: '#0F172A',
  surface: '#1E293B',
  primary: '#38BDF8',
  text: '#F8FAFC',
  textDim: '#94A3B8',
  border: '#334155',
  overlay: 'rgba(2, 6, 23, 0.9)',
};

const getDeviceLanguage = (): string => {
  try {
    const locale = Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;

    const lang = locale?.split(/[-_]/)[0] || 'en';
    if (TRANSLATIONS[lang]) return lang;
  } catch (e) {}
  return 'en';
};

export const DebugTrigger = ({
  children,
  password = '2024',
  clicksNeeded = 5,
  isDemo = false,
  onEnvChange,
  onBaseUrlChange,
  baseUrls,
  enabled = true,
  checkAccess,
  language = 'auto',
}: DebugTriggerProps) => {
  const [clicks, setClicks] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const timerRef = useRef<any>(null);

  const activeLang = language === 'auto' ? getDeviceLanguage() : language;
  const t = TRANSLATIONS[activeLang] || TRANSLATIONS.en;

  useEffect(() => {
    setupNetworkMonitor();
    setupConsoleMonitor();
  }, []);

  const handleClick = () => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const nextClicks = clicks + 1;
    setClicks(nextClicks);

    if (nextClicks >= clicksNeeded) {
      handleOpen();
      setClicks(0);
    } else {
      timerRef.current = setTimeout(() => setClicks(0), 2000);
    }
  };

  const handleOpen = async () => {
    if (checkAccess) {
      const hasAccess = await checkAccess();
      if (!hasAccess) return;
    }
    if (!password) {
      setShowMonitor(true);
      setShowFloatingButton(true);
    } else {
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = () => {
    if (inputPassword === password) {
      setShowPasswordModal(false);
      setShowMonitor(true);
      setShowFloatingButton(true);
      setInputPassword('');
    } else {
      Alert.alert(t.error, t.wrongPass);
      setInputPassword('');
    }
  };

  return (
    <View style={{ flex: 1 }} onTouchEnd={handleClick}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        {children}
      </View>

      <Modal visible={showMonitor} animationType="slide">
        <DebugMonitor
          onClose={() => setShowMonitor(false)}
          envConfig={onEnvChange ? { currentEnv: isDemo ? 'demo' : 'prod', onEnvChange } : undefined}
          onBaseUrlChange={onBaseUrlChange}
          baseUrls={baseUrls}
          onExitDebugMode={() => setShowFloatingButton(false)}
          language={language}
        />
      </Modal>

      <Modal visible={showPasswordModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowPasswordModal(false)}>
          <View style={styles.overlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modal}>
                  <Text style={styles.title}>{t.login}</Text>
                  <Text style={styles.subtitle}>{t.clicks(clicksNeeded)}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t.passPlaceholder}
                    placeholderTextColor={COLORS.textDim}
                    secureTextEntry
                    value={inputPassword}
                    onChangeText={setInputPassword}
                    autoFocus
                    onSubmitEditing={handlePasswordSubmit}
                  />
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.cancelBtn}>
                      <Text style={styles.cancelText}>{t.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePasswordSubmit} style={styles.submitBtn}>
                      <Text style={styles.submitText}>{t.confirm}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {showFloatingButton && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => (password ? setShowPasswordModal(true) : setShowMonitor(true))}
          activeOpacity={0.8}
        >
          <Text style={styles.floatingButtonText}>DEBUG</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  keyboardView: { width: '100%', alignItems: 'center' },
  modal: { backgroundColor: COLORS.surface, padding: 24, borderRadius: 24, width: '85%', borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: 4, textAlign: 'center' },
  subtitle: { color: COLORS.textDim, textAlign: 'center', marginBottom: 20, fontSize: 13 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, padding: 15, borderRadius: 12, color: COLORS.text, fontSize: 16, textAlign: 'center', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  submitBtn: { flex: 2, backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { color: COLORS.textDim, fontWeight: 'bold' },
  submitText: { color: COLORS.background, fontWeight: '900' },
  floatingButton: { position: 'absolute', bottom: 100, right: 20, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, elevation: 10, shadowColor: COLORS.primary, shadowAlpha: 0.5, shadowRadius: 10 },
  floatingButtonText: { color: COLORS.background, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
});
