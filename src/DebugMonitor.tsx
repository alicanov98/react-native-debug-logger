import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Switch,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  NativeModules,
} from 'react-native';
import { Logger, LogEntry, LogType } from './Logger';

interface DebugMonitorProps {
  onClose: () => void;
  envConfig?: {
    currentEnv: string;
    onEnvChange: (newEnv: 'demo' | 'prod') => void;
  };
  onExitDebugMode?: () => void;
  language?: 'az' | 'en' | 'ru' | 'auto';
}

const TRANSLATIONS: Record<string, any> = {
  az: {
    title: 'Debug Monitor',
    found: 'qeyd tapıldı',
    search: 'Axtar...',
    clear: 'Təmizlə',
    all: 'Hamısı',
    empty: 'Log tapılmadı',
    export: 'Bütün Logları Export Et',
    back: 'Geri',
    details: 'Təfərrüat',
    share: 'Paylaş',
    exit: 'Xitam',
    close: 'Bağla',
    envTitle: 'Mühit Dəyişikliyi',
    envMessage: (env: string) => `API-ı ${env} rejimine keçirmək istəyirsiniz?`,
    cancel: 'Ləğv et',
    confirm: 'Təsdiqlə',
    error: 'Xəta',
    login: 'Debug Girişi',
    clicksDetected: (n: number) => `Ardıcıl ${n} klik aşkar edildi`,
    enterPassword: 'Şifrəni daxil edin',
    accessDenied: 'Giriş rədd edildi',
    wrongPassword: 'Şifrə yanlışdır',
    statusCode: 'Status kodu',
  },
  en: {
    title: 'Debug Monitor',
    found: 'entries found',
    search: 'Search...',
    clear: 'Clear',
    all: 'All',
    empty: 'No logs found',
    export: 'Export All Logs',
    back: 'Back',
    details: 'Details',
    share: 'Share',
    exit: 'Exit',
    close: 'Close',
    envTitle: 'Environment Change',
    envMessage: (env: string) => `Switch API to ${env} mode?`,
    cancel: 'Cancel',
    confirm: 'Confirm',
    error: 'Error',
    login: 'Debug Login',
    clicksDetected: (n: number) => `${n} consecutive clicks detected`,
    enterPassword: 'Enter password',
    accessDenied: 'Access Denied',
    wrongPassword: 'Wrong password',
    statusCode: 'Status code',
  },
  ru: {
    title: 'Дебаг Монитор',
    found: 'записей найдено',
    search: 'Поиск...',
    clear: 'Очистить',
    all: 'Все',
    empty: 'Логи не найдены',
    export: 'Экспортировать все логи',
    back: 'Назад',
    details: 'Детали',
    share: 'Поделиться',
    exit: 'Выход',
    close: 'Закрыть',
    envTitle: 'Смена среды',
    envMessage: (env: string) => `Переключить API в режим ${env}?`,
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    error: 'Ошибка',
    login: 'Отладка Вход',
    clicksDetected: (n: number) => `Обнаружено ${n} кликов подряд`,
    enterPassword: 'Введите пароль',
    accessDenied: 'Доступ запрещен',
    wrongPassword: 'Неверный пароль',
    statusCode: 'Код статуса',
  },
  tr: {
    title: 'Debug Monitörü',
    found: 'kayıt bulundu',
    search: 'Ara...',
    clear: 'Temizle',
    all: 'Hepsi',
    empty: 'Log bulunamadı',
    export: 'Tüm Logları Dışa Aktar',
    back: 'Geri',
    details: 'Detaylar',
    share: 'Paylaş',
    exit: 'Çıkış',
    close: 'Kapat',
    envTitle: 'Ortam Değişikliği',
    envMessage: (env: string) => `API'yi ${env} moduna geçirmek istiyor musunuz?`,
    cancel: 'İptal',
    confirm: 'Onayla',
    error: 'Hata',
    login: 'Hata Ayıklama Girişi',
    clicksDetected: (n: number) => `Üst üste ${n} tıklama tespit edildi`,
    enterPassword: 'Şifreyi girin',
    accessDenied: 'Erişim Reddedildi',
    wrongPassword: 'Hatalı şifre',
    statusCode: 'Durum kodu',
  },
  zh: {
    title: '调试监视器',
    found: '条记录',
    search: '搜索...',
    clear: '清除',
    all: '全部',
    empty: '未找到日志',
    export: '导出所有日志',
    back: '返回',
    details: '详情',
    share: '分享',
    exit: '退出',
    close: '关闭',
    envTitle: '环境变更',
    envMessage: (env: string) => `将 API 切换到 ${env} 模式？`,
    cancel: '取消',
    confirm: '确认',
    error: '错误',
    login: '调试登录',
    clicksDetected: (n: number) => `检测到连续 ${n} 次点击`,
    enterPassword: '输入密码',
    accessDenied: '拒绝访问',
    wrongPassword: '密码错误',
    statusCode: '状态代码',
  },
  ur: {
    title: 'ڈبگ مانیٹر',
    found: 'ریکارڈ مل گئے',
    search: 'تلاش کریں...',
    clear: 'صاف کریں',
    all: 'تمام',
    empty: 'کوئی لاگ نہیں ملا',
    export: 'تمام لاگز ایکسپورٹ کریں',
    back: 'واپس',
    details: 'تفصیلات',
    share: 'شیئر کریں',
    exit: 'باہر نکلیں',
    close: 'بند کریں',
    envTitle: 'ماحول کی تبدیلی',
    envMessage: (env: string) => `کیا آپ API کو ${env} موڈ میں تبدیل کرنا چاہتے ہیں؟`,
    cancel: 'منسوخ کریں',
    confirm: 'تصدیق کریں',
    error: 'خرابی',
    login: 'ڈبگ لاگ ان',
    clicksDetected: (n: number) => `مسلسل ${n} کلکس ملے`,
    enterPassword: 'پاس ورڈ درج کریں',
    accessDenied: 'رسائی مسترد کر دی گئی',
    wrongPassword: 'غلط پاس ورڈ',
    statusCode: 'اسٹیٹس کوڈ',
  },
  hi: {
    title: 'डीबग मॉनिटर',
    found: 'रिकॉर्ड मिले',
    search: 'खोजें...',
    clear: 'साफ करें',
    all: 'सभी',
    empty: 'कोई लॉग नहीं मिला',
    export: 'सभी लॉग निर्यात करें',
    back: 'पीछे',
    details: 'विवरण',
    share: 'साझा करें',
    exit: 'बाहر निकलें',
    close: 'बंद करें',
    envTitle: 'वातावरण परिवर्तन',
    envMessage: (env: string) => `क्या आप API को ${env} मोड में बदलना चाहते हैं?`,
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    error: 'त्रुटि',
    login: 'डीबग लॉगिन',
    clicksDetected: (n: number) => `लगातार ${n} क्लिक मिले`,
    enterPassword: 'पासवर्ड दर्ज करें',
    accessDenied: 'पहुंच अस्वीकार',
    wrongPassword: 'गलत पासवर्ड',
    statusCode: 'स्थिति कोड',
  },
  th: {
    title: 'Debug Monitor',
    found: 'พบรายการ',
    search: 'ค้นหา...',
    clear: 'ล้าง',
    all: 'ทั้งหมด',
    empty: 'ไม่พบประวัติ',
    export: 'ส่งออกประวัติทั้งหมด',
    back: 'ย้อนกลับ',
    details: 'รายละเอียด',
    share: 'แชร์',
    exit: 'ออก',
    close: 'ปิด',
    envTitle: 'เปลี่ยนสภาพแวดล้อม',
    envMessage: (env: string) => `เปลี่ยน API เป็นโหมด ${env} หรือไม่?`,
    cancel: 'ยกเลิก',
    confirm: 'ยืนยัน',
    error: 'ข้อผิดพลาด',
    login: 'เข้าสู่ระบบดีบั๊ก',
    clicksDetected: (n: number) => `ตรวจพบการคลิกติดต่อกัน ${n} ครั้ง`,
    enterPassword: 'ป้อนรหัสผ่าน',
    accessDenied: 'ปฏิเสธการเข้าถึง',
    wrongPassword: 'รหัสผ่านผิด',
    statusCode: 'รหัสสถานะ',
  }
};

const getDeviceLanguage = (): string => {
  try {
    const locale = Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;

    const lang = locale?.split(/[-_]/)[0] || 'en';
    if (TRANSLATIONS[lang]) return lang;
  } catch (e) {
    // Fallback to English on detection error
  }
  return 'en';
};

const COLORS = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  primary: '#38BDF8',
  secondary: '#94A3B8',
  text: '#F8FAFC',
  textDim: '#94A3B8',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#334155',
  header: '#1E293B',
};

export const DebugMonitor = ({ onClose, envConfig, onExitDebugMode, language = 'auto' }: DebugMonitorProps) => {
  const activeLang = language === 'auto' ? getDeviceLanguage() : language;
  const t = TRANSLATIONS[activeLang] || TRANSLATIONS.en;

  const [logs, setLogs] = useState<LogEntry[]>(Logger.getLogs());
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isDemo, setIsDemo] = useState(envConfig?.currentEnv === 'demo');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<string | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string | 'ALL'>('ALL');

  useEffect(() => {
    const unsubscribe = Logger.subscribe(newLogs => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (envConfig) {
      setIsDemo(envConfig.currentEnv === 'demo');
    }
  }, [envConfig?.currentEnv]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log: LogEntry) => {
      const matchesSearch = searchQuery === '' || 
        (log.url?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         log.method?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesMethod = filterMethod === 'ALL' || log.method === filterMethod;
      
      let matchesStatus = true;
      if (filterStatus !== 'ALL') {
        const status = log.status || 0;
        if (filterStatus === '2xx') matchesStatus = status >= 200 && status < 300;
        else if (filterStatus === '4xx') matchesStatus = status >= 400 && status < 500;
        else if (filterStatus === '5xx') matchesStatus = status >= 500;
        else if (filterStatus === 'ERROR') matchesStatus = log.type === 'error' || status >= 400;
        else matchesStatus = status.toString() === filterStatus;
      }
      
      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [logs, searchQuery, filterMethod, filterStatus]);

  const handleShare = async () => {
    try {
      const logsJson = JSON.stringify(logs, null, 2);
      await Share.share({
        message: logsJson,
        title: 'Debug Logs - React Native',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share logs');
    }
  };

  const handleEnvToggle = (value: boolean) => {
    if (!envConfig) return;
    
    const newEnv = value ? 'demo' : 'prod';
    Alert.alert(
      t.envTitle,
      t.envMessage(newEnv.toUpperCase()),
      [
        { text: t.cancel, style: 'cancel' },
        { 
          text: t.confirm, 
          onPress: () => {
            setIsDemo(value);
            envConfig.onEnvChange(newEnv);
          }
        }
      ]
    );
  };

  const getLogTypeColor = (type: LogType, status?: number) => {
    if (status && status >= 400) return COLORS.error;
    switch (type) {
      case 'request': return COLORS.primary;
      case 'response': return COLORS.success;
      case 'error': return COLORS.error;
      default: return COLORS.secondary;
    }
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => {
    const logColor = getLogTypeColor(item.type, item.status);
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.logItem}
        onPress={() => setSelectedLog(item)}
      >
        <View style={[styles.logIndicator, { backgroundColor: logColor }]} />
        <View style={styles.logContent}>
          <View style={styles.logHeader}>
            <Text style={[styles.method, { color: logColor }]}>
              {item.method || (item.type === 'error' ? 'ERR' : 'INFO')}
            </Text>
            {item.status && (
              <Text style={[styles.status, { color: logColor }]}>
                {item.status}
              </Text>
            )}
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </View>
          <Text style={styles.url} numberOfLines={2}>
            {item.url || item.message}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetails = () => {
    if (!selectedLog) return null;

    return (
      <Modal visible={!!selectedLog} animationType="slide" transparent>
        <SafeAreaView style={styles.detailsModal}>
          <View style={styles.detailsHeader}>
            <TouchableOpacity onPress={() => setSelectedLog(null)} style={styles.backButton}>
              <Text style={styles.detailsHeaderText}>← {t.back}</Text>
            </TouchableOpacity>
            <Text style={styles.detailsTitle}>{t.details}</Text>
            <TouchableOpacity 
                onPress={() => Share.share({ message: JSON.stringify(selectedLog, null, 2) })} 
                style={styles.backButton}
            >
              <Text style={styles.detailsHeaderText}>{t.share}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.detailsScrollView}>
            <View style={styles.detailCard}>
              <DetailField label="URL" value={selectedLog.url} selectable />
              <DetailField label="Method" value={selectedLog.method} />
              {selectedLog.status && (
                <DetailField 
                  label="Status" 
                  value={selectedLog.status.toString()} 
                  color={selectedLog.status >= 400 ? COLORS.error : COLORS.success} 
                />
              )}
            </View>

            <JsonField label="Request Data" data={selectedLog.requestData} />
            <JsonField label="Response Data" data={selectedLog.responseData} />
            <JsonField label="Headers" data={selectedLog.headers} />
            
            {selectedLog.message && (
              <View style={[styles.detailCard, { borderLeftColor: COLORS.error, borderLeftWidth: 4 }]}>
                <Text style={styles.label}>Error Message</Text>
                <Text style={[styles.value, { color: COLORS.error }]}>{selectedLog.message}</Text>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <View>
                <Text style={styles.headerTitle}>{t.title}</Text>
                <Text style={styles.headerSubtitle}>{logs.length} {t.found}</Text>
            </View>
            <View style={styles.headerActions}>
                {envConfig && (
                    <View style={styles.envSwitcher}>
                         <Text style={[styles.envLabel, { color: isDemo ? COLORS.warning : COLORS.success }]}>
                            {isDemo ? 'DEMO' : 'PROD'}
                         </Text>
                         <Switch 
                            value={isDemo} 
                            onValueChange={handleEnvToggle}
                            trackColor={{ false: COLORS.surfaceLight, true: COLORS.surfaceLight }}
                            thumbColor={isDemo ? COLORS.warning : COLORS.success}
                            ios_backgroundColor={COLORS.surface}
                         />
                    </View>
                )}
                {onExitDebugMode && (
                  <TouchableOpacity 
                    onPress={() => {
                        onExitDebugMode();
                        onClose();
                    }} 
                    style={styles.exitButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.exitButtonText}>{t.exit}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.closeButtonText}>{t.close}</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.searchBar}>
            <TextInput
                style={styles.searchInput}
                placeholder={t.search}
                placeholderTextColor={COLORS.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            <TouchableOpacity onPress={() => Logger.clearLogs()} style={styles.clearIcon}>
                <Text style={{ color: COLORS.error, fontSize: 12 }}>{t.clear}</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.filterArea}>
            {/* Row 1: All | Error | Methods */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <TouchableOpacity onPress={() => { setFilterMethod('ALL'); setFilterStatus('ALL'); }} style={[styles.filterTab, filterMethod === 'ALL' && filterStatus === 'ALL' && styles.filterTabActive]}>
                    <Text style={[styles.filterTabText, filterMethod === 'ALL' && filterStatus === 'ALL' && styles.filterTabTextActive]}>{t.all}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setFilterStatus(filterStatus === 'ERROR' ? 'ALL' : 'ERROR')} 
                    style={[styles.filterTab, filterStatus === 'ERROR' && { backgroundColor: COLORS.error, borderColor: COLORS.error }]}
                >
                    <Text style={[styles.filterTabText, filterStatus === 'ERROR' && styles.filterTabTextActive]}>{t.error}</Text>
                </TouchableOpacity>

                <View style={styles.divider} />
                
                {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
                    <TouchableOpacity key={m} onPress={() => setFilterMethod(m)} style={[styles.filterTab, filterMethod === m && styles.filterTabActive]}>
                        <Text style={[styles.filterTabText, filterMethod === m && styles.filterTabTextActive]}>{m}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Row 2: Status Code Label + Values */}
            <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t.statusCode} : </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {['2xx', '4xx', '5xx'].map(s => (
                        <TouchableOpacity key={s} onPress={() => setFilterStatus(s)} style={[styles.filterTab, filterStatus === s && styles.filterTabActive]}>
                            <Text style={[styles.filterTabText, filterStatus === s && styles.filterTabTextActive]}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>

        <FlatList
          data={filteredLogs}
          renderItem={renderLogItem}
          keyExtractor={(item: LogEntry) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t.empty}</Text>
            </View>
          }
        />

        <View style={styles.footer}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Text style={styles.shareButtonText}>{t.export}</Text>
            </TouchableOpacity>
        </View>

        {renderDetails()}
      </SafeAreaView>
    </View>
  );
};

const DetailField = ({ label, value, color, selectable }: { label: string; value?: string; color?: string; selectable?: boolean }) => {
  if (!value) return null;
  return (
    <View style={styles.detailField}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable={selectable} style={[styles.value, { color: color || COLORS.text }]}>{value}</Text>
    </View>
  );
};

const JsonField = ({ label, data }: { label: string; data: any }) => {
  if (!data || Object.keys(data).length === 0) return null;
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  
  return (
    <View style={styles.jsonCard}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.jsonContainer}>
        <Text selectable style={styles.jsonText}>{jsonStr}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: COLORS.header,
    borderBottomWidth:1,
    borderBottomColor: COLORS.border
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 11, color: COLORS.textDim, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  envSwitcher: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingLeft: 8, paddingRight: 2, paddingVertical: 2, borderRadius: 20 },
  envLabel: { fontSize: 10, fontWeight: 'bold' },
  closeButton: { padding: 4 },
  closeButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  exitButton: { padding: 4 },
  exitButtonText: { color: COLORS.error, fontWeight: '600', fontSize: 14 },
  
  searchBar: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  searchInput: { 
    flex: 1, 
    backgroundColor: COLORS.surface, 
    height: 40, 
    borderRadius: 10, 
    paddingHorizontal: 15, 
    color: COLORS.text,
    fontSize: 14 
  },
  clearIcon: { marginLeft: 15 },

  filterArea: { paddingBottom: 5 },
  filterScroll: { paddingHorizontal: 15, alignItems: 'center', gap: 6, paddingVertical: 5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 15, marginTop: 4 },
  statusLabel: { fontSize: 11, color: COLORS.textDim, fontWeight: 'bold', marginRight: 5 },
  errorRow: { paddingHorizontal: 15, marginTop: 8 },
  filterTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterTabText: { fontSize: 10, color: COLORS.textDim, fontWeight: 'bold' },
  filterTabTextActive: { color: COLORS.background },
  divider: { width: 1, height: 15, backgroundColor: COLORS.border, marginHorizontal: 4 },

  listContent: { paddingBottom: 100 },
  logItem: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.surface, 
    marginHorizontal: 15, 
    marginVertical: 4, 
    borderRadius: 12, 
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  logIndicator: { width: 6 },
  logContent: { flex: 1, padding: 12 },
  logHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  method: { fontSize: 12, fontWeight: '900', width: 60 },
  status: { fontSize: 12, fontWeight: '900', marginHorizontal: 8 },
  timestamp: { fontSize: 10, color: COLORS.textDim, marginLeft: 'auto' },
  url: { fontSize: 13, color: COLORS.text, lineHeight: 18 },

  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 20, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  shareButton: { 
    backgroundColor: COLORS.primary, 
    height: 50, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  shareButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },

  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textDim, fontSize: 16 },

  // Details Modal
  detailsModal: { flex: 1, backgroundColor: COLORS.background },
  detailsHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backButton: { paddingVertical: 5, paddingHorizontal: 10 },
  detailsHeaderText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  detailsTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  detailsScrollView: { flex: 1, padding: 20 },
  detailCard: { backgroundColor: COLORS.surface, padding: 15, borderRadius: 16, marginBottom: 15 },
  detailField: { marginBottom: 15 },
  label: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 },
  value: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  jsonCard: { backgroundColor: COLORS.surface, padding: 15, borderRadius: 16, marginBottom: 15 },
  jsonContainer: { backgroundColor: COLORS.background, padding: 12, borderRadius: 10, marginTop: 8 },
  jsonText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', color: COLORS.success },
});
