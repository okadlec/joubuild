import { View, Text, StyleSheet } from 'react-native';

export default function TasksTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Úkoly</Text>
      <Text style={styles.subtitle}>Správa stavebních úkolů</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
});
