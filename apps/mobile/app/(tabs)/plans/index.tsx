import { View, Text, StyleSheet } from 'react-native';

export default function PlansTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Výkresy</Text>
      <Text style={styles.subtitle}>Správa stavebních výkresů</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
});
