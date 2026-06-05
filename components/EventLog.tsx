import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { clearLog, useEventLog } from '../lib/testLog'

/**
 * Scrollable, timestamped log of auth-state transitions and test actions.
 * Newest line is at the top. `t=` is ms since app load.
 */
export function EventLog() {
  const entries = useEventLog()

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Event log (newest first)</Text>
        <TouchableOpacity onPress={clearLog}>
          <Text style={styles.clear}>clear</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll}>
        {entries.length === 0 ? (
          <Text style={styles.empty}>no events yet</Text>
        ) : (
          entries.map(e => (
            <Text key={e.id} style={styles.line}>
              <Text style={styles.t}>t={(e.t / 1000).toFixed(2)}s </Text>
              {e.msg}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#0b0b0b',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1c1c1c',
  },
  header: { color: '#9ad', fontSize: 12, fontWeight: '600' },
  clear: { color: '#f88', fontSize: 12 },
  scroll: { flex: 1, paddingHorizontal: 10, paddingVertical: 6 },
  empty: { color: '#666', fontSize: 12, fontStyle: 'italic' },
  line: { color: '#ddd', fontSize: 12, fontFamily: 'Courier', marginBottom: 3 },
  t: { color: '#6c8' },
})
