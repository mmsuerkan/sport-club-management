import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';

interface Branch {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  branchId: string;
}

export default function TrainerAddScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    specialization: '',
    experience: '',
    certification: '',
    salary: '',
    branchId: '',
    branchName: '',
    groupId: '',
    groupName: '',
    notes: '',
  });

  useEffect(() => {
    loadBranchesAndGroups();
  }, []);

  useEffect(() => {
    // Seçilen şubeye göre grupları filtrele
    if (formData.branchId) {
      const filtered = groups.filter(group => group.branchId === formData.branchId);
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups([]);
    }
  }, [formData.branchId, groups]);

  const loadBranchesAndGroups = async () => {
    try {
      // Şubeleri yükle
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branchesData: Branch[] = [];
      branchesSnapshot.forEach((doc) => {
        branchesData.push({
          id: doc.id,
          name: doc.data().name,
        });
      });
      setBranches(branchesData);

      // Grupları yükle
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      const groupsData: Group[] = [];
      groupsSnapshot.forEach((doc) => {
        groupsData.push({
          id: doc.id,
          name: doc.data().name,
          branchId: doc.data().branchId,
        });
      });
      setGroups(groupsData);
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBranchChange = (branchId: string) => {
    const selectedBranch = branches.find(b => b.id === branchId);
    setFormData(prev => ({
      ...prev,
      branchId,
      branchName: selectedBranch?.name || '',
      groupId: '',
      groupName: '',
    }));
  };

  const handleGroupChange = (groupId: string) => {
    const selectedGroup = groups.find(g => g.id === groupId);
    setFormData(prev => ({
      ...prev,
      groupId,
      groupName: selectedGroup?.name || '',
    }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Hata', 'Ad Soyad zorunludur.');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Hata', 'Telefon numarası zorunludur.');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Hata', 'E-posta adresi zorunludur.');
      return false;
    }
    if (!formData.email.includes('@')) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi giriniz.');
      return false;
    }
    if (!formData.branchId) {
      Alert.alert('Hata', 'Şube seçimi zorunludur.');
      return false;
    }
    if (!formData.groupId) {
      Alert.alert('Hata', 'Grup seçimi zorunludur.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'trainers'), {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      Alert.alert('Başarılı', 'Antrenör başarıyla eklendi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Antrenör eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={COLORS.gray[800]} />
          </TouchableOpacity>
          <Text style={styles.title}>Yeni Antrenör</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
              Kaydet
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ad Soyad *</Text>
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) => handleInputChange('fullName', text)}
                placeholder="Örn: Ahmet Yılmaz"
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefon *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                placeholder="0555 555 55 55"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-posta *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="ornek@email.com"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Çalışma Bilgileri</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Şube *</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity style={styles.picker}>
                  <Text style={formData.branchId ? styles.pickerText : styles.pickerPlaceholder}>
                    {formData.branchName || 'Şube seçiniz'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.gray[400]} />
                </TouchableOpacity>
              </View>
              <View style={styles.pickerOptions}>
                {branches.map((branch) => (
                  <TouchableOpacity
                    key={branch.id}
                    style={[
                      styles.pickerOption,
                      formData.branchId === branch.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleBranchChange(branch.id)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.branchId === branch.id && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {branch.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Grup *</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity 
                  style={[styles.picker, !formData.branchId && styles.pickerDisabled]}
                  disabled={!formData.branchId}
                >
                  <Text style={formData.groupId ? styles.pickerText : styles.pickerPlaceholder}>
                    {formData.groupName || (formData.branchId ? 'Grup seçiniz' : 'Önce şube seçiniz')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.gray[400]} />
                </TouchableOpacity>
              </View>
              {formData.branchId && (
                <View style={styles.pickerOptions}>
                  {filteredGroups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={[
                        styles.pickerOption,
                        formData.groupId === group.id && styles.pickerOptionSelected,
                      ]}
                      onPress={() => handleGroupChange(group.id)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.groupId === group.id && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {group.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Uzmanlık</Text>
              <TextInput
                style={styles.input}
                value={formData.specialization}
                onChangeText={(text) => handleInputChange('specialization', text)}
                placeholder="Örn: Basketbol, Fitness"
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Deneyim</Text>
              <TextInput
                style={styles.input}
                value={formData.experience}
                onChangeText={(text) => handleInputChange('experience', text)}
                placeholder="Örn: 5 yıl"
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sertifika</Text>
              <TextInput
                style={styles.input}
                value={formData.certification}
                onChangeText={(text) => handleInputChange('certification', text)}
                placeholder="Sertifika bilgileri"
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Maaş</Text>
              <TextInput
                style={styles.input}
                value={formData.salary}
                onChangeText={(text) => handleInputChange('salary', text)}
                placeholder="Örn: 15000"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notlar</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => handleInputChange('notes', text)}
                placeholder="Ek notlar..."
                placeholderTextColor={COLORS.gray[400]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  saveButton: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: COLORS.gray[400],
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray[700],
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[800],
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.sm,
  },
  pickerContainer: {
    marginBottom: SPACING.xs,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  pickerDisabled: {
    backgroundColor: COLORS.gray[50],
  },
  pickerText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[800],
  },
  pickerPlaceholder: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[400],
  },
  pickerOptions: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.white,
  },
  pickerOption: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  pickerOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[700],
  },
  pickerOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});