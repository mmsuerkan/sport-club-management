import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONT_SIZES } from '../../constants';
import { UserRole } from '../../lib/firebase/auth';
import AdminDashboard from '../../components/dashboards/AdminDashboard';
import TrainerDashboard from '../../components/dashboards/TrainerDashboard';
import ParentDashboard from '../../components/dashboards/ParentDashboard';
import StudentDashboard from '../../components/dashboards/StudentDashboard';

const DashboardScreen: React.FC = () => {
  const { userData } = useAuth();

  // Rol bazlı dashboard render
  const renderRoleDashboard = () => {
    if (!userData) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Kullanıcı bilgileri yükleniyor...</Text>
        </View>
      );
    }

    switch (userData.role) {
      case UserRole.ADMIN:
        return <AdminDashboard userData={userData} />;
      case UserRole.TRAINER:
        return <TrainerDashboard userData={userData} />;
      case UserRole.PARENT:
        return <ParentDashboard userData={userData} />;
      case UserRole.STUDENT:
        return <StudentDashboard userData={userData} />;
      default:
        return <StudentDashboard userData={userData} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {renderRoleDashboard()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[600] || '#6b7280',
  },
});

export default DashboardScreen;