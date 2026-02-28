import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function MoreTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Více</Text>
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Formuláře</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Dokumenty</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Reporty</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Nastavení</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', paddingHorizontal: 16, marginBottom: 16 },
  menu: { paddingHorizontal: 16 },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuText: { fontSize: 16, color: '#0f172a' },
});
