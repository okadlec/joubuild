import { View, Text, StyleSheet } from 'react-native';

export default function PhotosTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fotky</Text>
      <Text style={styles.subtitle}>Fotodokumentace ze stavby</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
});
