import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  Switch,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  StatusBar,
  FlatList,
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
  onBaseUrlChange?: (newUrl: string) => void;
  baseUrls?: string[] | { title: string; url: string }[];
  onExitDebugMode?: () => void;
  language?: 'az' | 'en' | 'ru' | 'tr' | 'auto';
}

const TRANSLATIONS: Record<string, any> = {
  az: { title: 'Debug Monitor', entries: 'qeyd', search: 'Axtar...', clear: 'Təmizlə', all: 'Hamısı', logs: 'Loglar', network: 'Şəbəkə', db: 'Baza', nav: 'Nav', settings: 'Ayarlar', export: 'Export', close: 'Bağla', exit: 'Xitam', back: 'Geri', empty: 'Log tapılmadı', request: 'Sorğu', response: 'Cavab', method: 'METOD', url: 'URL', headers: 'HEADERS', status: 'STATUS KODU', body: 'BODY', customUrl: 'Fərdi URL', selectUrl: 'MƏNBƏ SEÇİMİ', manualUrl: 'ƏL İLƏ DAXİL ET' },
  en: { title: 'Debug Monitor', entries: 'entries', search: 'Search...', clear: 'Clear', all: 'All', logs: 'Logs', network: 'Network', db: 'DB', nav: 'Nav', settings: 'Settings', export: 'Export', close: 'Close', exit: 'Exit', back: 'Back', empty: 'No logs found', request: 'Request', response: 'Response', method: 'METHOD', url: 'URL', headers: 'HEADERS', status: 'STATUS CODE', body: 'BODY', customUrl: 'Custom URL', selectUrl: 'SELECT SOURCE', manualUrl: 'MANUAL ENTRY' },
  tr: { title: 'Debug Monitor', entries: 'kayıt', search: 'Ara...', clear: 'Temizle', all: 'Hepsi', logs: 'Loglar', network: 'Ağ', db: 'Veri', nav: 'Nav', settings: 'Ayarlar', export: 'Dışa Aktar', close: 'Kapat', exit: 'Çıkış', back: 'Geri', empty: 'Log bulunamadı', request: 'Sorgu', response: 'Yanıt', method: 'METOD', url: 'URL', headers: 'HEADERS', status: 'DURUM KODU', body: 'BODY' },
  ru: { title: 'Дебаг Монитор', entries: 'записей', search: 'Поиск...', clear: 'Очистить', all: 'Все', logs: 'Логи', network: 'Сеть', db: 'База', nav: 'Нав', settings: 'Настройки', export: 'Экспорт', close: 'Закрыть', exit: 'Выход', back: 'Назад', empty: 'Логи не найдены', request: 'Запрос', response: 'Ответ', method: 'МЕТОД', url: 'URL', headers: 'HEADERS', status: 'КОД СТАТУСА', body: 'ТЕЛО' }
};

const COLORS = {
  background: '#020617',
  surface: '#1E293B',
  surfaceLight: '#334155',
  primary: '#38BDF8',
  secondary: '#94A3B8',
  text: '#F8FAFC',
  textDim: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#F43F5E',
  border: '#1E293B60',
  accent: '#A855F7',
  glass: 'rgba(30, 41, 59, 0.4)',
  highlight: '#FFFFFF10'
};

export const DebugMonitor = ({ onClose, envConfig, onBaseUrlChange, baseUrls, onExitDebugMode, language = 'auto' }: DebugMonitorProps) => {
  const [logs, setLogs] = useState<LogEntry[]>(Logger.getLogs());
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [detailTab, setDetailTab] = useState<DetailTab>('RESPONSE');
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [baseUrl, setBaseUrl] = useState(Logger.getBaseUrl());
  const [manualUrl, setManualUrl] = useState('');
  const [customUrlEntries, setCustomUrlEntries] = useState<{title: string, url: string}[]>([]);
  const [filterMethod, setFilterMethod] = useState<string | 'ALL'>('ALL');

  useEffect(() => {
    const unsubscribe = Logger.subscribe(newLogs => setLogs(newLogs));
    return unsubscribe;
  }, []);

  const t = useMemo(() => {
    let lang = language;
    if (lang === 'auto') {
      try {
        const locale = Platform.OS === 'ios'
          ? NativeModules.SettingsManager?.settings?.AppleLocale || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
          : NativeModules.I18nManager?.localeIdentifier;
        lang = (locale?.split(/[-_]/)[0] || 'en') as any;
      } catch (e) { lang = 'en'; }
    }
    return TRANSLATIONS[lang] || TRANSLATIONS.en;
  }, [language]);

  const tabCounts = useMemo(() => {
    return {
      ALL: logs.length,
      NETWORK: logs.filter((l: LogEntry) => ['request', 'response', 'error'].includes(l.type)).length,
      LOGS: logs.filter((l: LogEntry) => l.type === 'info').length,
      /* DB: logs.filter((l: LogEntry) => l.type === 'database').length,
      NAV: logs.filter((l: LogEntry) => l.type === 'navigation').length, */
      SETTINGS: 0
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log: LogEntry) => {
      const typeMatch =
        activeTab === 'ALL' ? true :
          activeTab === 'NETWORK' ? ['request', 'response', 'error'].includes(log.type) :
            activeTab === 'LOGS' ? log.type === 'info' :
              /* activeTab === 'DB' ? log.type === 'database' :
                activeTab === 'NAV' ? log.type === 'navigation' : */ false;

      if (!typeMatch && activeTab !== 'SETTINGS') return false;

      const matchesSearch = searchQuery === '' ||
        (log.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.message?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMethod = filterMethod === 'ALL' || log.method === filterMethod;

      return matchesSearch && matchesMethod;
    });
  }, [logs, activeTab, searchQuery, filterMethod]);

  const handleShare = async () => {
    try {
      await Share.share({ message: JSON.stringify(logs, null, 2), title: 'Debug Logs' });
    } catch (e) { Alert.alert('Error', 'Could not share logs'); }
  };

  const generateCurl = (log: LogEntry) => {
    if (!log.url) return '';
    let curl = `curl -X ${log.method || 'GET'} "${log.url}"`;
    if (log.headers) {
      Object.keys(log.headers).forEach(key => {
        curl += ` -H "${key}: ${log.headers[key]}"`;
      });
    }
    if (log.requestData) {
      curl += ` -d '${JSON.stringify(log.requestData)}'`;
    }
    return curl;
  };

  const handleSaveSettings = () => {
    if (!manualUrl.trim()) {
        Alert.alert('Error', 'Please enter a valid URL');
        return;
    }
    
    const newUrl = manualUrl.trim();
    Logger.setBaseUrl(newUrl);
    setBaseUrl(newUrl);
    
    const predefinedList = baseUrls ? (Array.isArray(baseUrls) ? baseUrls : []) : [];
    const exists = predefinedList.some(item => (typeof item === 'string' ? item : item.url) === newUrl) || 
                   customUrlEntries.some(item => item.url === newUrl);
                   
    if (!exists) {
        setCustomUrlEntries([{ title: `Custom ${customUrlEntries.length + 1}`, url: newUrl }, ...customUrlEntries]);
    }
    
    setManualUrl('');
    if (onBaseUrlChange) onBaseUrlChange(newUrl);
    Alert.alert('Success', 'New source applied and added to list');
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => {
    const isError = item.type === 'error' || (item.status && item.status >= 400);
    const indicatorColor = isError ? COLORS.error :
      item.type === 'database' ? COLORS.accent :
        item.type === 'navigation' ? COLORS.warning :
          item.status && item.status >= 200 && item.status < 300 ? COLORS.success :
            COLORS.primary;

    return (
      <TouchableOpacity activeOpacity={0.8} style={styles.logItem} onPress={() => { setSelectedLog(item); setDetailTab('RESPONSE'); }}>
        <View style={[styles.logIndicator, { backgroundColor: indicatorColor }]} />
        <View style={styles.logBody}>
          <View style={styles.logHeader}>
            <View style={[styles.badge, { backgroundColor: indicatorColor + '15' }]}>
              <Text style={[styles.logMethod, { color: indicatorColor }]}>
                {item.method || item.type.toUpperCase()}
              </Text>
            </View>
            {item.status && <Text style={[styles.logStatus, { color: indicatorColor }]}>{item.status}</Text>}
            <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
          </View>
          <Text style={styles.logUrl} numberOfLines={2}>{item.url || item.message}</Text>
          {item.durationMs !== undefined && (
            <View style={styles.logMetaBox}>
              <Text style={styles.logMeta}>{item.durationMs ?? 0}ms</Text>
              <View style={styles.metaDivider} />
              <Text style={styles.logMeta}>{item.size || '0.00kb'}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSettings = () => {
    const predefinedList = baseUrls ? (Array.isArray(baseUrls) ? baseUrls : []) : [];
    
    // Build the selection list
    const allSources: { title: string, url?: string, type: 'env' | 'url', val: any }[] = [];
    
    if (envConfig) {
        allSources.push({ title: 'PRODUCTIVE (PROD)', type: 'env', val: 'prod' });
        allSources.push({ title: 'DEMONSTRATION (DEMO)', type: 'env', val: 'demo' });
    }
    
    predefinedList.forEach(item => {
        const title = typeof item === 'string' ? item : item.title;
        const url = typeof item === 'string' ? item : item.url;
        allSources.push({ title, url, type: 'url', val: url });
    });
    
    customUrlEntries.forEach(item => {
        allSources.push({ title: item.title, url: item.url, type: 'url', val: item.url });
    });
    
    return (
      <ScrollView style={styles.settingsContainer}>
        {allSources.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionTitle}>{t.selectUrl}</Text>
            </View>
            <View style={styles.card}>
              {allSources.map((item: any, index: number) => {
                // If we have a baseUrl set, environment choice shouldn't be "active" visually
                const isUrlActive = baseUrl !== '' && baseUrl === item.val;
                const isEnvActive = baseUrl === '' && item.type === 'env' && envConfig?.currentEnv === item.val;
                const isActive = item.type === 'env' ? isEnvActive : isUrlActive;

                return (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.urlOption, isActive && styles.urlOptionActive]} 
                    onPress={() => {
                        if (item.type === 'env') {
                            setBaseUrl('');
                            Logger.setBaseUrl('');
                            envConfig?.onEnvChange(item.val);
                        } else {
                            setBaseUrl(item.val);
                            Logger.setBaseUrl(item.val);
                            if (onBaseUrlChange) onBaseUrlChange(item.val);
                        }
                    }}
                  >
                    <View style={styles.urlOptionInfo}>
                        <Text style={[styles.urlOptionTitle, isActive && styles.urlOptionTitleActive]}>{item.title}</Text>
                        {item.url && <Text style={styles.urlOptionUrl} numberOfLines={1}>{item.url}</Text>}
                    </View>
                    {isActive && <View style={styles.activeDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={[styles.section, { marginTop: allSources.length > 0 ? 32 : 0 }]}>
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionTitle}>{t.manualUrl}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>{t.customUrl.toUpperCase()}</Text>
            <TextInput 
              style={styles.textInput} 
              value={manualUrl} 
              onChangeText={setManualUrl} 
              placeholder="https://api.example.com" 
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
              <Text style={styles.saveBtnText}>APPLY CHANGES</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { marginTop: 32 }]}>
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionTitle}>ADVANCED TOOLS</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity style={styles.toolBtn} onPress={handleShare}>
              <Text style={styles.toolBtnText}>EXPORT JSON REPORT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toolBtn, { marginTop: 12, borderColor: COLORS.error + '40' }]} onPress={() => Logger.clearLogs()}>
              <Text style={[styles.toolBtnText, { color: COLORS.error }]}>WIPE ALL RECORDS</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <View style={styles.titleDot} />
              <Text style={styles.headerTitle}>{t.title.toUpperCase()}</Text>
            </View>
            <Text style={styles.headerSubtitle}>{logs.length} {t.entries}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>{t.close.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {(['ALL', 'NETWORK', 'LOGS', /* 'DB', 'NAV', */ 'SETTINGS'] as TabType[]).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'ALL' ? t.all : tab === 'NETWORK' ? t.network : tab === 'LOGS' ? t.logs : /* tab === 'DB' ? t.db : tab === 'NAV' ? t.nav : */ t.settings}
                  {tab !== 'SETTINGS' && ` (${(tabCounts as any)[tab]})`}
                </Text>
                {activeTab === tab && <View style={styles.activeTabDot} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {activeTab !== 'SETTINGS' && (
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder={t.search}
                placeholderTextColor={COLORS.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        )}

        {activeTab === 'SETTINGS' ? renderSettings() : (
          <FlatList
            data={filteredLogs}
            renderItem={renderLogItem}
            keyExtractor={(item: LogEntry) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>{t.empty}</Text></View>}
          />
        )}

        <Modal visible={!!selectedLog} animationType="slide" transparent>
          <SafeAreaView style={styles.detailsModal}>
            <View style={styles.detailsHeader}>
              <View style={styles.detailsTopRow}>
                <TouchableOpacity onPress={() => { setSelectedLog(null); setShowMenu(false); }} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.detailsPerfText}>
                  {selectedLog?.durationMs ?? 0}ms, {selectedLog?.size || '0.00kb'}
                </Text>
                <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuBtn}>
                  <Text style={styles.menuBtnText}>⋮</Text>
                </TouchableOpacity>
              </View>

              {showMenu && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { Share.share({ message: JSON.stringify(selectedLog, null, 2) }); setShowMenu(false); }}>
                    <Text style={styles.menuItemText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { Share.share({ message: generateCurl(selectedLog!) }); setShowMenu(false); }}>
                    <Text style={styles.menuItemText}>Copy cURL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setShowMenu(false)}>
                    <Text style={styles.menuItemText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.detailsTabs}>
                <TouchableOpacity
                  style={[styles.detailTab, detailTab === 'REQUEST' && styles.detailTabActive]}
                  onPress={() => setDetailTab('REQUEST')}
                >
                  <Text style={[styles.detailTabText, detailTab === 'REQUEST' && styles.detailTabTextActive]}>
                    {t.request.toUpperCase()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailTab, detailTab === 'RESPONSE' && styles.detailTabActive]}
                  onPress={() => setDetailTab('RESPONSE')}
                >
                  <Text style={[styles.detailTabText, detailTab === 'RESPONSE' && styles.detailTabTextActive]}>
                    {t.response.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
              {detailTab === 'REQUEST' ? (
                <>
                  <Section label={t.method} value={selectedLog?.method} />
                  <Section label={t.url} value={selectedLog?.url} selectable />
                  <Section label={t.headers} json={selectedLog?.headers} />
                  <Section label={t.body} json={selectedLog?.requestData} />
                </>
              ) : (
                <>
                  <Section label={t.status} value={selectedLog?.status?.toString()} color={selectedLog?.status && selectedLog.status >= 400 ? COLORS.error : COLORS.success} />
                  <Section label={t.headers} json={selectedLog?.headers} />
                  <Section label={t.body} json={selectedLog?.responseData} />
                </>
              )}
              <View style={{ height: 100 }} />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const Section = ({ label, value, json, color, selectable }: any) => {
  if (!value && (!json || Object.keys(json).length === 0)) return null;
  return (
    <View style={styles.sectionBox}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {value ? (
        <Text selectable={selectable} style={[styles.sectionValue, { color: color || COLORS.text }]}>{value}</Text>
      ) : (
        <View style={styles.jsonBox}>
          <Text selectable style={styles.jsonText}>{JSON.stringify(json, null, 2)}</Text>
        </View>
      )}
    </View>
  );
};

type TabType = 'ALL' | 'NETWORK' | 'LOGS' | /* 'DB' | 'NAV' | */ 'SETTINGS';
type DetailTab = 'REQUEST' | 'RESPONSE';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20 },
  headerInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  titleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 8, shadowColor: COLORS.primary, shadowRadius: 4, shadowOpacity: 0.8 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  headerSubtitle: { color: COLORS.textDim, fontSize: 11, fontWeight: '600' },
  closeBtn: { backgroundColor: COLORS.surfaceLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  closeBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 10 },
  tabContainer: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabScroll: { paddingHorizontal: 15 },
  tab: { paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center' },
  activeTabDot: { position: 'absolute', bottom: 8, width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
  tabActive: {},
  tabText: { color: COLORS.textDim, fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5 },
  tabTextActive: { color: COLORS.primary },
  searchRow: { padding: 15, paddingBottom: 5 },
  searchBox: { backgroundColor: COLORS.surface, height: 44, borderRadius: 12, paddingHorizontal: 15, justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  searchInput: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  listContent: { padding: 15, paddingBottom: 40 },
  logItem: { flexDirection: 'row', backgroundColor: COLORS.surface, marginBottom: 10, borderRadius: 16, borderLeftWidth: 0, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: COLORS.highlight },
  logIndicator: { width: 4 },
  logBody: { flex: 1, padding: 14 },
  logHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  logMethod: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  logStatus: { fontSize: 12, fontWeight: '900', marginHorizontal: 8 },
  logTime: { fontSize: 10, color: COLORS.textDim, marginLeft: 'auto', fontWeight: '500' },
  logUrl: { color: COLORS.text, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  logMetaBox: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  metaDivider: { width: 1, height: 10, backgroundColor: COLORS.border, marginHorizontal: 8 },
  logMeta: { fontSize: 10, color: COLORS.secondary, fontWeight: 'bold' },
  emptyContainer: { padding: 60, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: COLORS.textDim, fontSize: 13, fontWeight: '500' },
  settingsContainer: { flex: 1, padding: 20 },
  section: { marginBottom: 12 },
  sectionHeaderBox: { marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  card: { backgroundColor: COLORS.surface, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 20 },
  text: { color: COLORS.textDim, fontSize: 13, fontWeight: '500' },
  inputLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: 'bold', marginBottom: 12, letterSpacing: 0.5 },
  textInput: { borderBottomWidth: 1, borderBottomColor: COLORS.primary + '40', paddingVertical: 12, color: COLORS.text, fontSize: 16, marginBottom: 24, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: 'center', shadowColor: COLORS.primary, shadowRadius: 8, shadowOpacity: 0.3 },
  saveBtnText: { color: COLORS.background, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  toolBtn: { borderWidth: 1.5, borderColor: COLORS.border, padding: 16, borderRadius: 14, alignItems: 'center' },
  toolBtnText: { color: COLORS.text, fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },
  urlOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.background, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  urlOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '05' },
  urlOptionInfo: { flex: 1 },
  urlOptionTitle: { color: COLORS.text, fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  urlOptionTitleActive: { color: COLORS.primary },
  urlOptionUrl: { color: COLORS.textDim, fontSize: 11 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },

  // Details Modal
  detailsModal: { flex: 1, backgroundColor: COLORS.background },
  detailsHeader: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  detailsPerfText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  backBtnText: { color: COLORS.primary, fontSize: 24, fontWeight: '300' },
  menuBtn: { padding: 5 },
  menuBtnText: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold' },
  dropdownMenu: { position: 'absolute', top: 60, right: 20, backgroundColor: COLORS.surface, borderRadius: 12, width: 150, zIndex: 1000, elevation: 10, shadowColor: '#000', shadowRadius: 10, shadowOpacity: 0.5 },
  menuItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuItemText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  detailsTabs: { flexDirection: 'row', paddingHorizontal: 20 },
  detailTab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  detailTabActive: { borderBottomColor: COLORS.primary },
  detailTabText: { color: COLORS.textDim, fontSize: 13, fontWeight: 'bold' },
  detailTabTextActive: { color: COLORS.primary },
  detailsContent: { flex: 1, padding: 20 },
  sectionBox: { marginBottom: 30 },
  sectionLabel: { color: COLORS.secondary, fontSize: 12, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
  sectionValue: { color: COLORS.text, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  jsonBox: { backgroundColor: COLORS.surface, padding: 15, borderRadius: 16 },
  jsonText: { color: COLORS.success, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', lineHeight: 18 },
});
