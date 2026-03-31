import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { DebugTrigger } from 'react-native-debug-logger';

function App(): React.JSX.Element {
  const [lastResponse, setLastResponse] = useState<string>('');

  const testFetch = async () => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();
      setLastResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(error);
    }
  };

  const testAxios = async () => {
    try {
      const response = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
      setLastResponse(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error(error);
    }
  };

  const testError = async () => {
    try {
      await fetch('https://non-existent-api-test.com/404');
    } catch (error: any) {
      console.error('Fetch error:', error.message);
    }
  };

  return (
    <DebugTrigger 
      password="1234" 
      clicksNeeded={5}
      prodUrl="https://api.localhost:200.az" 
  testUrl="https://test-api.localhost:300.az"
      baseUrls={[
        { title: 'Production (JSONPlaceholder)', url: 'https://jsonplaceholder.typicode.com' },
        { title: 'Test Environment', url: 'https://test-api.example.com' },
        { title: 'Staging API', url: 'https://staging.example.com' }
      ]}
      onBaseUrlChange={(url) => console.log('Base URL changed to:', url)}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.title}>Debug Logger Test</Text>
          <Text style={styles.subtitle}>Tap 5 times anywhere to open debug menu (Pass: 1234)</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.button} onPress={testFetch}>
            <Text style={styles.buttonText}>Test Fetch Request</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testAxios}>
            <Text style={styles.buttonText}>Test Axios Request</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { backgroundColor: '#ef4444' }]} onPress={testError}>
            <Text style={styles.buttonText}>Test Error Request</Text>
          </TouchableOpacity>

          <View style={styles.responseBox}>
            <Text style={styles.responseTitle}>Last Response:</Text>
            <Text style={styles.responseText}>{lastResponse || 'No request made yet'}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </DebugTrigger>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  responseBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 12,
    color: '#1e293b',
    fontFamily: 'monospace',
  },
});

export default App;
