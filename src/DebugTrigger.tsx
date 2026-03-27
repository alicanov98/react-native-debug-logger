import React, { useState, ReactNode } from 'react';
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
import { useEffect } from 'react';

interface DebugTriggerProps {
  children?: ReactNode;
  password?: string;
  clicksNeeded?: number;
  isDemo?: boolean;
  onEnvChange?: (newEnv: 'demo' | 'prod') => void;
  enabled?: boolean;
  checkAccess?: () => boolean | Promise<boolean>;
  language?: 'az' | 'en' | 'ru' | 'auto';
}

const TRANSLATIONS = {
  az: {
    login: 'Debug Girişi',
    clicksDetected: (n: number) => `Ardıcıl ${n} klik aşkar edildi`,
    enterPassword: 'Şifrəni daxil edin',
    accessDenied: 'Giriş rədd edildi',
    wrongPassword: 'Şifrə yanlışdır',
    cancel: 'Ləğv et',
    confirm: 'Təsdiqlə',
  },
  en: {
    login: 'Debug Login',
    clicksDetected: (n: number) => `${n} consecutive clicks detected`,
    enterPassword: 'Enter password',
    accessDenied: 'Access Denied',
    wrongPassword: 'Wrong password',
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
  ru: {
    login: 'Отладка Вход',
    clicksDetected: (n: number) => `Обнаружено ${n} кликов подряд`,
    enterPassword: 'Введите пароль',
    accessDenied: 'Доступ запрещен',
    wrongPassword: 'Неверный пароль',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
  }
};

const getDeviceLanguage = (): 'az' | 'en' | 'ru' => {
  try {
    const locale = Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;

    const lang = locale?.split(/[-_]/)[0] || 'en';
    if (lang === 'az') return 'az';
    if (lang === 'ru') return 'ru';
  } catch (e) {
    // Fallback
  }
  return 'en';
};

const COLORS = {
  background: '#0F172A',
  surface: '#1E293B',
  primary: '#38BDF8',
  text: '#F8FAFC',
  textDim: '#94A3B8',
  error: '#EF4444',
  border: '#334155',
  overlay: 'rgba(2, 6, 23, 0.85)',
};

export const DebugTrigger = ({ 
  children, 
  password = '2024', 
  clicksNeeded = 5,
  isDemo = false,
  onEnvChange,
  enabled = true,
  checkAccess,
  language = 'auto'
}: DebugTriggerProps) => {
  const activeLang = language === 'auto' ? getDeviceLanguage() : language;
  const t = TRANSLATIONS[activeLang];
  useEffect(() => {
    // Automatically setup network monitoring when the trigger is used
    setupNetworkMonitor();
  }, []);

  const [clicks, setClicks] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [showMonitor, setShowMonitor] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  const handleClick = async () => {
    if (!enabled) return;

    const nextClicks = clicks + 1;
    setClicks(nextClicks);
    if (nextClicks >= clicksNeeded) {
      if (checkAccess) {
        const hasAccess = await checkAccess();
        if (!hasAccess) {
          setClicks(0);
          return;
        }
      }
      const isPasswordEmpty = password === undefined || password === null || password === '';
      if (isPasswordEmpty) {
        setShowMonitor(true);
        setShowFloatingButton(true);
      } else {
        setShowPasswordModal(true);
      }
      setClicks(0);
    }
    
    // Auto-reset clicks after 2 seconds of inactivity
    setTimeout(() => setClicks(0), 2000);
  };

  const handlePasswordSubmit = () => {
    if (inputPassword === password) {
      setShowPasswordModal(false);
      setInputPassword('');
      setShowMonitor(true);
      setShowFloatingButton(true);
    } else {
      Alert.alert(t.accessDenied, t.wrongPassword);
      setInputPassword('');
    }
  };

  return (
    <>
      <TouchableOpacity activeOpacity={1} onPress={handleClick}>
        {children}
      </TouchableOpacity>

      <Modal 
        visible={showMonitor} 
        animationType="slide" 
        onRequestClose={() => setShowMonitor(false)}
      >
        <DebugMonitor 
          onClose={() => setShowMonitor(false)} 
          envConfig={onEnvChange ? {
            currentEnv: isDemo ? 'demo' : 'prod',
            onEnvChange: onEnvChange
          } : undefined}
          onExitDebugMode={() => setShowFloatingButton(false)}
          language={language}
        />
      </Modal>

      <Modal 
        visible={showPasswordModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlay}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.title}>{t.login}</Text>
                            <Text style={styles.subtitle}>{t.clicksDetected(clicksNeeded)}</Text>
                        </View>
                        
                        <TextInput
                            style={styles.input}
                            placeholder={t.enterPassword}
                            placeholderTextColor={COLORS.textDim}
                            secureTextEntry
                            value={inputPassword}
                            onChangeText={setInputPassword}
                            autoFocus
                            onSubmitEditing={handlePasswordSubmit}
                        />

                        <View style={styles.actions}>
                            <TouchableOpacity 
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setInputPassword('');
                                }} 
                                style={styles.cancelBtn}
                            >
                                <Text style={styles.cancelText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={handlePasswordSubmit} 
                                style={styles.submitBtn}
                            >
                                <Text style={styles.submitText}>{t.confirm}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

      {showFloatingButton && !showMonitor && !showPasswordModal && (
        <TouchableOpacity 
           style={styles.floatingButton} 
           onPress={() => {
              if (password) {
                setShowPasswordModal(true);
              } else {
                setShowMonitor(true);
              }
           }}
           activeOpacity={0.8}
        >
           <Text style={styles.floatingButtonText}>DEBUG</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: COLORS.overlay, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modal: { 
    backgroundColor: COLORS.surface, 
    padding: 24, 
    borderRadius: 24, 
    width: '85%',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  modalHeader: {
    marginBottom: 20,
    alignItems: 'center'
  },
  title: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: COLORS.text,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textDim,
    textAlign: 'center'
  },
  input: { 
    backgroundColor: COLORS.background,
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: 15, 
    borderRadius: 12, 
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20
  },
  actions: { 
    flexDirection: 'row', 
    gap: 12 
  },
  cancelBtn: { 
    flex: 1,
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  submitBtn: { 
    flex: 2,
    backgroundColor: COLORS.primary,
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  cancelText: {
    color: COLORS.textDim,
    fontWeight: '600'
  },
  submitText: { 
    color: COLORS.background, 
    fontWeight: 'bold' 
  },
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 9999,
  },
  floatingButtonText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1
  }
});
