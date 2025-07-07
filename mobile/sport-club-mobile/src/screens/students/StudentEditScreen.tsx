import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, updateDoc, getDocs, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { NavigationProp, useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { StudentsStackParamList } from '../../types';

type StudentEditRouteProp = RouteProp<StudentsStackParamList, 'StudentEdit'>;

interface Branch {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  time: string;
}

const StudentEditScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<StudentsStackParamList>>();
  const route = useRoute<StudentEditRouteProp>();
  const { student } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  
  const [formData, setFormData] = useState({
    fullName: student.fullName,
    birthDate: student.birthDate,
    phone: student.phone,
    email: student.email,
    address: student.address,
    tcNo: student.tcNo,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    emergencyContact: student.emergencyContact,
    emergencyPhone: student.emergencyPhone,
    notes: student.notes,
    branchId: student.branchId,
    groupId: student.groupId
  });

  useEffect(() => {
    fetchBranches();
    fetchGroups();
  }, []);

  useEffect(() => {
    // Filter groups when branch changes
    if (formData.branchId) {
      const filtered = groups.filter(group => group.branchId === formData.branchId);
      setFilteredGroups(filtered);
      // Reset group selection if current group doesn't belong to selected branch
      if (formData.groupId && !filtered.find(g => g.id === formData.groupId)) {
        setFormData(prev => ({ ...prev, groupId: '' }));
      }
    } else {
      setFilteredGroups([]);
      setFormData(prev => ({ ...prev, groupId: '' }));
    }
  }, [formData.branchId, groups]);

  const fetchBranches = async () => {
    try {
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branchesData: Branch[] = [];
      branchesSnapshot.forEach((doc) => {
        branchesData.push({
          id: doc.id,
          name: doc.data().name
        });
      });
      setBranches(branchesData);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      const groupsData: Group[] = [];
      groupsSnapshot.forEach((doc) => {
        const data = doc.data();
        groupsData.push({
          id: doc.id,
          name: data.name,
          branchId: data.branchId,
          branchName: data.branchName || '',
          time: data.time || ''
        });
      });
      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Hata', 'Öğrenci adı soyadı zorunludur');
      return false;
    }
    if (!formData.birthDate.trim()) {
      Alert.alert('Hata', 'Doğum tarihi zorunludur');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Hata', 'Telefon numarası zorunludur');
      return false;
    }
    if (!formData.parentName.trim()) {
      Alert.alert('Hata', 'Veli adı soyadı zorunludur');
      return false;
    }
    if (!formData.parentPhone.trim()) {
      Alert.alert('Hata', 'Veli telefon numarası zorunludur');
      return false;
    }
    if (!formData.branchId) {
      Alert.alert('Hata', 'Lütfen bir branş seçin');
      return false;
    }
    if (!formData.groupId) {
      Alert.alert('Hata', 'Lütfen bir grup seçin');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const selectedBranch = branches.find(b => b.id === formData.branchId);
      const selectedGroup = groups.find(g => g.id === formData.groupId);

      const updatedData = {
        ...formData,
        branchName: selectedBranch?.name || '',
        groupName: selectedGroup?.name || '',
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'students', student.id), updatedData);

      Alert.alert('Başarılı', 'Öğrenci bilgileri güncellendi', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating student:', error);
      Alert.alert('Hata', 'Öğrenci güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const FormInput = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    keyboardType = 'default',
    multiline = false 
  }: { 
    label: string; 
    value: string; 
    onChangeText: (text: string) => void; 
    placeholder?: string;
    keyboardType?: any;
    multiline?: boolean;
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray[400]}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );

  const SelectInput = ({ 
    label, 
    value, 
    options, 
    onSelect,
    placeholder = 'Seçiniz'
  }: { 
    label: string; 
    value: string; 
    options: { id: string; name: string }[];
    onSelect: (id: string) => void;
    placeholder?: string;
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
        <TouchableOpacity
          style={[styles.optionButton, !value && styles.optionButtonActive]}
          onPress={() => onSelect('')}
        >
          <Text style={[styles.optionText, !value && styles.optionTextActive]}>{placeholder}</Text>
        </TouchableOpacity>
        {options.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[styles.optionButton, value === option.id && styles.optionButtonActive]}
            onPress={() => onSelect(option.id)}
          >
            <Text style={[styles.optionText, value === option.id && styles.optionTextActive]}>
              {option.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Öğrenci Düzenle</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
            <FormInput
              label="Ad Soyad *"
              value={formData.fullName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              placeholder="Örn: Ahmet Yılmaz"
            />
            <FormInput
              label="Doğum Tarihi *"
              value={formData.birthDate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, birthDate: text }))}
              placeholder="GG/AA/YYYY"
            />
            <FormInput
              label="TC Kimlik No"
              value={formData.tcNo}
              onChangeText={(text) => setFormData(prev => ({ ...prev, tcNo: text }))}
              placeholder="11111111111"
              keyboardType="numeric"
            />
            <FormInput
              label="Telefon *"
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              placeholder="05XX XXX XX XX"
              keyboardType="phone-pad"
            />
            <FormInput
              label="E-posta"
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholder="ornek@email.com"
              keyboardType="email-address"
            />
            <FormInput
              label="Adres"
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              placeholder="Ev adresi"
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Veli Bilgileri</Text>
            <FormInput
              label="Veli Adı Soyadı *"
              value={formData.parentName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, parentName: text }))}
              placeholder="Örn: Mehmet Yılmaz"
            />
            <FormInput
              label="Veli Telefon *"
              value={formData.parentPhone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, parentPhone: text }))}
              placeholder="05XX XXX XX XX"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acil Durum</Text>
            <FormInput
              label="Acil Durum İletişim"
              value={formData.emergencyContact}
              onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContact: text }))}
              placeholder="Acil durumda aranacak kişi"
            />
            <FormInput
              label="Acil Durum Telefon"
              value={formData.emergencyPhone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyPhone: text }))}
              placeholder="05XX XXX XX XX"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Branş ve Grup</Text>
            <SelectInput
              label="Branş *"
              value={formData.branchId}
              options={branches}
              onSelect={(id) => setFormData(prev => ({ ...prev, branchId: id }))}
            />
            {formData.branchId && (
              <SelectInput
                label="Grup *"
                value={formData.groupId}
                options={filteredGroups}
                onSelect={(id) => setFormData(prev => ({ ...prev, groupId: id }))}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <FormInput
              label="Özel Notlar"
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              placeholder="Öğrenci hakkında özel notlar (isteğe bağlı)"
              multiline
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Değişiklikleri Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray?.[50] || '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SPACING.md,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray[700],
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.gray[900],
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  optionButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[700],
  },
  optionTextActive: {
    color: COLORS.white,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});

export default StudentEditScreen;