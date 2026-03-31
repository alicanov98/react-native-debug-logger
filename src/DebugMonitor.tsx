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
  LayoutAnimation,
} from 'react-native';
import { Logger, LogEntry, LogType, CustomUrlEntry } from './Logger';

interface DebugMonitorProps {
  onClose: () => void;
  envConfig?: {
    currentEnv: string;
    onEnvChange: (newEnv: 'demo' | 'prod') => void;
  };
  onBaseUrlChange?: (newUrl: string) => void;
  baseUrls?: string[] | { title: string; url: string }[];
  prodUrl?: string;
  testUrl?: string;
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
  highlight: '#FFFFFF08'
};

export const DebugMonitor = ({ onClose, envConfig, onBaseUrlChange, baseUrls, prodUrl, testUrl, onExitDebugMode, language = 'auto' }: DebugMonitorProps) => {
  const [logs, setLogs] = useState<LogEntry[]>(Logger.getLogs());
// ... other code stays the same, I'll use multi_replace for accuracy ...
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [detailTab, setDetailTab] = useState<DetailTab>('RESPONSE');
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [baseUrl, setBaseUrl] = useState(Logger.getBaseUrl());
  const [manualUrl, setManualUrl] = useState('');
  const [customUrlEntries, setCustomUrlEntries] = useState<CustomUrlEntry[]>(Logger.getCustomUrls());
  const [filterMethod, setFilterMethod] = useState<string | 'ALL'>('ALL');

  useEffect(() => {
    const unsubscribe = Logger.subscribe(newLogs => {
        setLogs(newLogs);
    });
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
      NETWORK: logs.filter((l: LogEntry) => ['request', 'response'].includes(l.type) || (l.type === 'error' && !!l.url)).length,
      LOGS: logs.filter((l: LogEntry) => l.type === 'info' || (l.type === 'error' && !l.url)).length,
      SETTINGS: 0
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log: LogEntry) => {
      const typeMatch =
        activeTab === 'ALL' ? true :
          activeTab === 'NETWORK' ? (['request', 'response'].includes(log.type) || (log.type === 'error' && !!log.url)) :
            activeTab === 'LOGS' ? (log.type === 'info' || (log.type === 'error' && !log.url)) :
              false;

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
    const newUrl = manualUrl.trim();
    if (!newUrl) {
        Alert.alert('Error', 'Please enter a URL');
        return;
    }

    // Strict standard validation
    try {
        const parsed = new URL(newUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            Alert.alert('Error', 'URL must start with http:// or https://');
            return;
        }

        const host = parsed.hostname;
        const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
        const isLocal = host === 'localhost';
        const hasDot = host.includes('.');

        if (!isLocal && !isIp && !hasDot) {
            Alert.alert('Error', 'Invalid domain format. Example: https://api.example.com or http://localhost');
            return;
        }
    } catch (e) {
        Alert.alert('Error', 'Invalid URL format. Please include protocol (e.g., https://api.example.com)');
        return;
    }
    
    Logger.setBaseUrl(newUrl);
    setBaseUrl(newUrl);
    
    Logger.addCustomUrl({ title: `Custom ${Logger.getCustomUrls().length + 1}`, url: newUrl });
    setCustomUrlEntries(Logger.getCustomUrls());
    
    setManualUrl('');
    if (onBaseUrlChange) onBaseUrlChange(newUrl);
    Alert.alert('Success', 'New source applied');
  };

  const handleRemoveCustomUrl = (url: string) => {
    Logger.removeCustomUrl(url);
    setCustomUrlEntries(Logger.getCustomUrls());
    setBaseUrl(Logger.getBaseUrl());
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => {
    const isConsoleError = item.type === 'info' && item.message?.startsWith('[ERROR]');
    const isError = item.type === 'error' || (item.status && item.status >= 400) || isConsoleError;
    const indicatorColor = isError ? COLORS.error :
      item.type === 'database' ? COLORS.accent :
        item.type === 'navigation' ? COLORS.warning :
          item.status && item.status >= 200 && item.status < 300 ? COLORS.success :
            COLORS.primary;

    return (
      <TouchableOpacity activeOpacity={0.7} style={styles.logItem} onPress={() => { setSelectedLog(item); setDetailTab('RESPONSE'); }}>
        <View style={[styles.logIndicator, { backgroundColor: indicatorColor }]} />
        <View style={styles.logBody}>
          <View style={styles.logHeader}>
            <View style={[styles.badge, { backgroundColor: indicatorColor + '10' }]}>
              <Text style={[styles.logMethod, { color: indicatorColor }]}>
                {item.method || (isConsoleError ? 'ERROR' : item.type.toUpperCase())}
              </Text>
            </View>
            {item.status ? <Text style={[styles.logStatus, { color: indicatorColor }]}>{item.status}</Text> : null}
            <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
          </View>
          <Text style={styles.logUrl}>
            {item.isRedirected ? `${item.originalUrl} ➔ ${item.url}` : (item.url || item.message)}
          </Text>
          {item.durationMs !== undefined ? (
            <View style={styles.logMetaBox}>
              <View style={styles.metaBadge}>
                <Text style={styles.logMeta}>{item.durationMs ?? 0}ms</Text>
              </View>
              <View style={styles.metaBadge}>
                <Text style={styles.logMeta}>{item.size || '0.00kb'}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSettings = () => {
    const predefinedList = baseUrls ? (Array.isArray(baseUrls) ? baseUrls : []) : [];
    const allCustoms = Logger.getCustomUrls();
    
    // Build the selection list
    const allSources: { title: string, url?: string, type: 'env' | 'url', val: any }[] = [];
    
    if (prodUrl) {
        allSources.push({ title: 'PRODUCTION API (PROD)', url: prodUrl, type: 'url', val: prodUrl });
    }
    if (testUrl) {
        allSources.push({ title: 'TEST API (TEST)', url: testUrl, type: 'url', val: testUrl });
    }

    if (envConfig) {
        allSources.push({ title: 'PRODUCTIVE (PROD)', type: 'env', val: 'prod' });
        allSources.push({ title: 'DEMONSTRATION (DEMO)', type: 'env', val: 'demo' });
    }
    
    predefinedList.forEach(item => {
        const title = typeof item === 'string' ? item : item.title;
        const url = typeof item === 'string' ? item : item.url;
        allSources.push({ title, url, type: 'url', val: url });
    });
    
    allCustoms.forEach(item => {
        allSources.push({ title: item.title, url: item.url, type: 'url', val: item.url });
    });
    
    return (
      <ScrollView style={styles.settingsContainer}>
        {allSources.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionTitle}>{t.selectUrl}</Text>
            </View>
            <View style={styles.card}>
              {allSources.map((item: any, index: number) => {
                const isUrlActive = baseUrl !== '' && baseUrl === item.val;
                const isEnvActive = baseUrl === '' && item.type === 'env' && envConfig?.currentEnv === item.val;
                const isActive = item.type === 'env' ? isEnvActive : isUrlActive;
                
                const isCustom = allCustoms.some(u => u.url === item.val);

                return (
                  <View key={index} style={[styles.urlOption, isActive && styles.urlOptionActive]}>
                    <TouchableOpacity 
                        style={styles.urlOptionInfo}
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
                        <Text style={[styles.urlOptionTitle, isActive && styles.urlOptionTitleActive]}>{item.title}</Text>
                        {item.url ? <Text style={styles.urlOptionUrl} numberOfLines={1}>{item.url}</Text> : null}
                    </TouchableOpacity>
                    <View style={styles.optionActions}>
                        {isCustom ? (
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemoveCustomUrl(item.val)}>
                                <Text style={styles.deleteBtnText}>✕</Text>
                            </TouchableOpacity>
                        ) : null}
                        {isActive ? <View style={styles.activeDot} /> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

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
              keyboardType="url"
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
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => Logger.clearLogs()} style={[styles.closeBtn, { marginRight: 8, backgroundColor: COLORS.error + '15' }]}>
              <Text style={[styles.closeBtnText, { color: COLORS.error }]}>{t.clear.toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>{t.close.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {(['ALL', 'NETWORK', 'LOGS', 'SETTINGS'] as TabType[]).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'ALL' ? t.all : tab === 'NETWORK' ? t.network : tab === 'LOGS' ? t.logs : t.settings}
                  {tab !== 'SETTINGS' ? ` (${(tabCounts as any)[tab]})` : ''}
                </Text>
                {activeTab === tab ? <View style={styles.activeTabDot} /> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {activeTab !== 'SETTINGS' ? (
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={t.search}
                placeholderTextColor={COLORS.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Text style={styles.clearSearch}>✕</Text>
                  </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {activeTab === 'SETTINGS' ? renderSettings() : (
          <FlatList
            data={filteredLogs}
            renderItem={renderLogItem}
            keyExtractor={(item: LogEntry) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📂</Text>
                    <Text style={styles.emptyText}>{t.empty}</Text>
                </View>
            }
          />
        )}

        <Modal visible={!!selectedLog} animationType="slide" transparent>
          {(() => {
            const isSelectedConsoleError = selectedLog?.type === 'info' && selectedLog?.message?.startsWith('[ERROR]');
            return (
              <SafeAreaView style={styles.detailsModal}>
                <View style={styles.detailsHeader}>
                  <View style={styles.detailsTopRow}>
                    <TouchableOpacity onPress={() => { setSelectedLog(null); setShowMenu(false); }} style={styles.backBtn}>
                      <Text style={styles.backBtnText}>←</Text>
                    </TouchableOpacity>
                    <Text style={[styles.detailsPerfText, isSelectedConsoleError && { color: COLORS.error }]}>
                      {selectedLog?.type === 'info' 
                        ? (isSelectedConsoleError ? 'CONSOLE ERROR' : t.logs.toUpperCase()) 
                        : `${selectedLog?.durationMs ?? 0}ms, ${selectedLog?.size || '0.00kb'}`}
                    </Text>
                    <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuBtn}>
                      <Text style={styles.menuBtnText}>⋮</Text>
                    </TouchableOpacity>
                  </View>

              {showMenu ? (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { Share.share({ message: JSON.stringify(selectedLog, null, 2) }); setShowMenu(false); }}>
                    <Text style={styles.menuItemText}>Share</Text>
                  </TouchableOpacity>
                  {selectedLog?.type !== 'info' ? (
                    <TouchableOpacity style={styles.menuItem} onPress={() => { Share.share({ message: generateCurl(selectedLog!) }); setShowMenu(false); }}>
                      <Text style={styles.menuItemText}>Copy cURL</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setShowMenu(false)}>
                    <Text style={styles.menuItemText}>Close</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {selectedLog?.type !== 'info' ? (
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
              ) : null}
            </View>

            <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
              {selectedLog?.type === 'info' ? (
                <>
                  <Section label="LOG MESSAGE" value={selectedLog?.message} selectable />
                  <Section label="DATA" json={selectedLog?.requestData} />
                </>
              ) : detailTab === 'REQUEST' ? (
                <>
                  <Section label={t.method} value={selectedLog?.method} />
                  <Section 
                    label={t.url} 
                    value={selectedLog?.isRedirected ? `${selectedLog?.originalUrl} ➔ ${selectedLog?.url}` : selectedLog?.url} 
                    selectable 
                  />
                  <Section label={t.headers} json={selectedLog?.requestHeaders} />
                  <Section label={t.body} json={selectedLog?.requestData} />
                </>
              ) : (
                <>
                  <Section label={t.status} value={selectedLog?.status?.toString()} color={selectedLog?.status && selectedLog.status >= 400 ? COLORS.error : COLORS.success} />
                  <Section label={t.headers} json={selectedLog?.responseHeaders} />
                  <Section label={t.body} json={selectedLog?.responseData} />
                </>
              )}
              <View style={{ height: 100 }} />
            </ScrollView>
              </SafeAreaView>
            );
          })()}
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

type TabType = 'ALL' | 'NETWORK' | 'LOGS' | 'SETTINGS';
type DetailTab = 'REQUEST' | 'RESPONSE';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20 },
  headerInfo: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
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
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, height: 46, borderRadius: 14, paddingHorizontal: 15, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '500' },
  clearSearch: { color: COLORS.textDim, fontSize: 18, paddingHorizontal: 5 },
  listContent: { padding: 15, paddingBottom: 40 },
  logItem: { flexDirection: 'row', backgroundColor: COLORS.surface, marginBottom: 10, borderRadius: 18, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: COLORS.highlight },
  logIndicator: { width: 4.5 },
  logBody: { flex: 1, padding: 16 },
  logHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  logMethod: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  logStatus: { fontSize: 12, fontWeight: '900', marginHorizontal: 8 },
  logTime: { fontSize: 10, color: COLORS.textDim, marginLeft: 'auto', fontWeight: '500' },
  logUrl: { color: COLORS.text, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  logMetaBox: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  metaBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: COLORS.highlight, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border + '20' },
  logMeta: { fontSize: 10, color: COLORS.secondary, fontWeight: 'bold' },
  emptyContainer: { padding: 80, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 15, opacity: 0.5 },
  emptyText: { textAlign: 'center', color: COLORS.textDim, fontSize: 14, fontWeight: '500' },
  settingsContainer: { flex: 1, padding: 20 },
  section: { marginBottom: 12 },
  sectionHeaderBox: { marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  card: { backgroundColor: COLORS.surface, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border },
  inputLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: 'bold', marginBottom: 12, letterSpacing: 0.5 },
  textInput: { borderBottomWidth: 1.5, borderBottomColor: COLORS.primary + '30', paddingVertical: 12, color: COLORS.text, fontSize: 16, marginBottom: 24, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: COLORS.primary, shadowRadius: 10, shadowOpacity: 0.35, elevation: 5 },
  saveBtnText: { color: COLORS.background, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  toolBtn: { borderWidth: 1.5, borderColor: COLORS.border, padding: 18, borderRadius: 16, alignItems: 'center' },
  toolBtnText: { color: COLORS.text, fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },
  urlOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, backgroundColor: COLORS.background, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  urlOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  urlOptionInfo: { flex: 1 },
  urlOptionTitle: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  urlOptionTitleActive: { color: COLORS.primary },
  urlOptionUrl: { color: COLORS.textDim, fontSize: 11.5 },
  optionActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.error + '15', justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: COLORS.error, fontSize: 14, fontWeight: 'bold' },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, shadowColor: COLORS.success, shadowRadius: 6, shadowOpacity: 0.6 },

  // Details Modal
  detailsModal: { flex: 1, backgroundColor: COLORS.background },
  detailsHeader: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22 },
  detailsPerfText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  backBtnText: { color: COLORS.primary, fontSize: 26, fontWeight: '300' },
  backBtn: { padding: 5, paddingRight: 15 },
  menuBtn: { padding: 5 },
  menuBtnText: { color: COLORS.primary, fontSize: 26, fontWeight: 'bold' },
  dropdownMenu: { position: 'absolute', top: 60, right: 20, backgroundColor: COLORS.surface, borderRadius: 16, width: 170, zIndex: 1000, elevation: 10, shadowColor: '#000', shadowRadius: 15, shadowOpacity: 0.6 },
  menuItem: { padding: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuItemText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  detailsTabs: { flexDirection: 'row', paddingHorizontal: 22 },
  detailTab: { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  detailTabActive: { borderBottomColor: COLORS.primary },
  detailTabText: { color: COLORS.textDim, fontSize: 13, fontWeight: 'bold' },
  detailTabTextActive: { color: COLORS.primary },
  detailsContent: { flex: 1, padding: 22 },
  sectionBox: { marginBottom: 35 },
  sectionLabel: { color: COLORS.secondary, fontSize: 12, fontWeight: '900', marginBottom: 14, letterSpacing: 1.2 },
  sectionValue: { color: COLORS.text, fontSize: 15, lineHeight: 24, fontWeight: '400' },
  jsonBox: { backgroundColor: COLORS.surface, padding: 18, borderRadius: 20 },
  jsonText: { color: COLORS.success, fontSize: 12.5, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', lineHeight: 20 },
});
