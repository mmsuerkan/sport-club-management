# 🏗️ PHASE 3: Mimari Refactoring (1-2 Ay)

**Durum:** 🔵 ORTA ÖNCELİK  
**Tahmini Süre:** 1-2 ay  
**Ön koşul:** PHASE 1 ve PHASE 2 tamamlanmış olmalı  
**Sorumlu:** Senior developer + Architect  

---

## 🎯 Fazın Amacı

Bu faz, sistemin **uzun vadeli sürdürülebilirliğini** sağlamak için **temiz mimari** prensiplerini uygular. Tutarsız patterns'ları standardize eder, maintainability'yi artırır ve gelecekteki feature development'ı hızlandırır.

## 🏗️ Hedef Mimari

### Mevcut Durum (Sorunlu):
```
Pages → Direct Firebase Calls → Database
  ↓
Scattered Business Logic + Duplicate Code
```

### Hedef Durum (Clean Architecture):
```
┌─────────────────────────────────────┐
│           Presentation Layer        │ React Components + Pages
├─────────────────────────────────────┤
│           Application Layer         │ Custom Hooks + Use Cases
├─────────────────────────────────────┤
│           Domain Layer             │ Business Logic + Entities
├─────────────────────────────────────┤
│           Infrastructure Layer      │ Firebase Services + External APIs
└─────────────────────────────────────┘
```

---

## 📋 Task Listesi

### 🗂️ 1. Service Layer Standardization (KRİTİK)

#### 1.1 Base Service Architecture
- **Problem:** Sadece AttendanceService var, diğerleri direkt Firebase calls
- **Çözüm:** Generic base service pattern

```typescript
// lib/services/base/BaseService.ts
export abstract class BaseService<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  protected abstract collectionName: string;
  protected db: Firestore;
  protected cache: Map<string, { data: T; timestamp: number }> = new Map();
  
  constructor() {
    this.db = getFirestore();
  }
  
  // Core CRUD operations
  async findAll(filters?: Record<string, any>): Promise<T[]> {
    const cacheKey = `${this.collectionName}_all_${JSON.stringify(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    let query = collection(this.db, this.collectionName);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = where(query, key, '==', value);
        }
      });
    }
    
    const snapshot = await getDocs(query);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as T[];
    
    this.setCache(cacheKey, data);
    return data;
  }
  
  async findById(id: string): Promise<T | null> {
    const cacheKey = `${this.collectionName}_${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const docRef = doc(this.db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const data = {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate(),
      updatedAt: docSnap.data().updatedAt?.toDate()
    } as T;
    
    this.setCache(cacheKey, data);
    return data;
  }
  
  async create(data: CreateDTO): Promise<T> {
    const docRef = await addDoc(collection(this.db, this.collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    this.invalidateCache();
    return await this.findById(docRef.id) as T;
  }
  
  async update(id: string, data: UpdateDTO): Promise<void> {
    const docRef = doc(this.db, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    this.invalidateCache();
  }
  
  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, this.collectionName, id);
    await deleteDoc(docRef);
    this.invalidateCache();
  }
  
  // Pagination support
  async findPaginated(options: PaginationOptions): Promise<PaginatedResult<T>> {
    // Implementation details...
  }
  
  // Real-time subscriptions
  subscribeToCollection(
    callback: (data: T[]) => void,
    filters?: Record<string, any>
  ): () => void {
    let query = collection(this.db, this.collectionName);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          query = where(query, key, '==', value);
        }
      });
    }
    
    return onSnapshot(query, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as T[];
      
      callback(data);
    });
  }
  
  // Cache management
  private getFromCache(key: string): T[] | T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000; // 5 minutes
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private setCache(key: string, data: T[] | T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  private invalidateCache(): void {
    this.cache.clear();
  }
}
```

**Tahmini Süre:** 12 saat  

#### 1.2 Specific Service Implementations
- **Problem:** Her feature için ayrı service class'ı yok
- **Çözüm:** Domain-specific services

```typescript
// lib/services/StudentService.ts
export interface Student {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  branchId: string;
  groupId?: string;
  status: 'active' | 'inactive' | 'graduated';
  enrollmentDate: Date;
  birthDate: Date;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  medicalInfo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentDTO {
  fullName: string;
  email: string;
  phone: string;
  branchId: string;
  groupId?: string;
  birthDate: Date;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  medicalInfo?: string;
}

export interface UpdateStudentDTO extends Partial<CreateStudentDTO> {
  status?: 'active' | 'inactive' | 'graduated';
}

export interface StudentFilters {
  branchId?: string;
  groupId?: string;
  status?: 'active' | 'inactive' | 'graduated';
  enrollmentMonth?: string;
}

export class StudentService extends BaseService<Student, CreateStudentDTO, UpdateStudentDTO> {
  protected collectionName = 'students';
  
  // Business-specific methods
  async getActiveStudents(): Promise<Student[]> {
    return this.findAll({ status: 'active' });
  }
  
  async getStudentsByBranch(branchId: string): Promise<Student[]> {
    return this.findAll({ branchId });
  }
  
  async getStudentsByGroup(groupId: string): Promise<Student[]> {
    return this.findAll({ groupId });
  }
  
  async searchStudents(searchTerm: string): Promise<Student[]> {
    // Implementation for text search
    const allStudents = await this.findAll();
    return allStudents.filter(student => 
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone.includes(searchTerm)
    );
  }
  
  async getStudentStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    graduated: number;
    byBranch: Record<string, number>;
    byMonth: Record<string, number>;
  }> {
    const students = await this.findAll();
    
    return {
      total: students.length,
      active: students.filter(s => s.status === 'active').length,
      inactive: students.filter(s => s.status === 'inactive').length,
      graduated: students.filter(s => s.status === 'graduated').length,
      byBranch: this.groupByField(students, 'branchId'),
      byMonth: this.groupByMonth(students, 'enrollmentDate')
    };
  }
  
  async transferStudent(studentId: string, newBranchId: string, newGroupId?: string): Promise<void> {
    const updateData: UpdateStudentDTO = { branchId: newBranchId };
    if (newGroupId) updateData.groupId = newGroupId;
    
    await this.update(studentId, updateData);
    
    // Log the transfer activity
    await this.logActivity(studentId, 'transfer', { 
      from: { branchId: 'old', groupId: 'old' }, 
      to: { branchId: newBranchId, groupId: newGroupId }
    });
  }
  
  private groupByField(items: Student[], field: keyof Student): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = String(item[field]);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private groupByMonth(items: Student[], field: keyof Student): Record<string, number> {
    return items.reduce((acc, item) => {
      const date = item[field] as Date;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private async logActivity(studentId: string, action: string, details: any): Promise<void> {
    // Implementation for activity logging
    await addDoc(collection(this.db, 'activityLogs'), {
      entityType: 'student',
      entityId: studentId,
      action,
      details,
      timestamp: serverTimestamp(),
      userId: auth.currentUser?.uid
    });
  }
}

// lib/services/TrainerService.ts
export class TrainerService extends BaseService<Trainer, CreateTrainerDTO, UpdateTrainerDTO> {
  protected collectionName = 'trainers';
  
  async getTrainersBySpecialization(specialization: string): Promise<Trainer[]> {
    return this.findAll({ specialization });
  }
  
  async getTrainerSchedule(trainerId: string, date: Date): Promise<TrainingSession[]> {
    // Implementation for trainer schedule
  }
  
  async assignTrainerToGroup(trainerId: string, groupId: string): Promise<void> {
    // Implementation for trainer assignment
  }
}

// lib/services/GroupService.ts
export class GroupService extends BaseService<Group, CreateGroupDTO, UpdateGroupDTO> {
  protected collectionName = 'groups';
  
  async getGroupsByBranch(branchId: string): Promise<Group[]> {
    return this.findAll({ branchId });
  }
  
  async getGroupSchedule(groupId: string): Promise<Schedule[]> {
    // Implementation for group schedule
  }
}

// lib/services/FinanceService.ts
export class FinanceService extends BaseService<FinanceRecord, CreateFinanceDTO, UpdateFinanceDTO> {
  protected collectionName = 'finance';
  
  async getIncomeByPeriod(startDate: Date, endDate: Date): Promise<FinanceRecord[]> {
    // Implementation for income reports
  }
  
  async getExpensesByCategory(): Promise<Record<string, number>> {
    // Implementation for expense categorization
  }
  
  async generateMonthlyReport(month: string, year: number): Promise<MonthlyReport> {
    // Implementation for monthly financial reports
  }
}
```

**Oluşturulacak service'ler:**
- StudentService ✅
- TrainerService  
- GroupService
- BranchService
- FinanceService
- DocumentService
- EventService
- MatchService

**Tahmini Süre:** 24 saat  

### 🔗 2. Custom Hooks Implementation (YÜKSEK)

#### 2.1 Data Fetching Hooks
- **Problem:** Her component'te aynı data fetching logic
- **Çözüm:** Reusable custom hooks

```typescript
// hooks/data/useStudents.ts
export const useStudents = (filters?: StudentFilters) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const studentService = useMemo(() => new StudentService(), []);
  
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await studentService.findAll(filters);
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [studentService, filters]);
  
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);
  
  const createStudent = useCallback(async (data: CreateStudentDTO) => {
    try {
      const newStudent = await studentService.create(data);
      setStudents(prev => [...prev, newStudent]);
      return newStudent;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create student');
      throw error;
    }
  }, [studentService]);
  
  const updateStudent = useCallback(async (id: string, data: UpdateStudentDTO) => {
    try {
      await studentService.update(id, data);
      setStudents(prev => prev.map(student => 
        student.id === id ? { ...student, ...data } : student
      ));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update student');
      throw error;
    }
  }, [studentService]);
  
  const deleteStudent = useCallback(async (id: string) => {
    try {
      await studentService.delete(id);
      setStudents(prev => prev.filter(student => student.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete student');
      throw error;
    }
  }, [studentService]);
  
  return {
    students,
    loading,
    error,
    createStudent,
    updateStudent,
    deleteStudent,
    refetch: fetchStudents
  };
};

// Real-time version
export const useStudentsRealtime = (filters?: StudentFilters) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const studentService = new StudentService();
    
    const unsubscribe = studentService.subscribeToCollection(
      (data) => {
        setStudents(data);
        setLoading(false);
      },
      filters
    );
    
    return unsubscribe;
  }, [filters]);
  
  return { students, loading };
};

// hooks/data/useTrainers.ts
export const useTrainers = () => {
  // Similar implementation for trainers
};

// hooks/data/useGroups.ts  
export const useGroups = (branchId?: string) => {
  // Similar implementation for groups
};
```

**Oluşturulacak hooks:**
- useStudents / useStudentsRealtime
- useTrainers / useTrainersRealtime
- useGroups / useGroupsRealtime
- useBranches / useBranchesRealtime
- useFinance / useFinanceRealtime
- useDashboardStats

**Tahmini Süre:** 16 saat  

#### 2.2 Business Logic Hooks
- **Problem:** Business logic component'lerde dağınık
- **Çözüm:** Domain-specific hooks

```typescript
// hooks/business/useStudentManagement.ts
export const useStudentManagement = () => {
  const { students, createStudent, updateStudent, deleteStudent } = useStudents();
  const { groups } = useGroups();
  const { branches } = useBranches();
  
  const studentOptions = useMemo(() => {
    return students.map(student => ({
      value: student.id,
      label: student.fullName,
      email: student.email
    }));
  }, [students]);
  
  const getStudentsByGroup = useCallback((groupId: string) => {
    return students.filter(student => student.groupId === groupId);
  }, [students]);
  
  const getStudentsByBranch = useCallback((branchId: string) => {
    return students.filter(student => student.branchId === branchId);
  }, [students]);
  
  const getStudentStatistics = useCallback(() => {
    const total = students.length;
    const active = students.filter(s => s.status === 'active').length;
    const inactive = students.filter(s => s.status === 'inactive').length;
    const graduated = students.filter(s => s.status === 'graduated').length;
    
    const byBranch = students.reduce((acc, student) => {
      const branchName = branches.find(b => b.id === student.branchId)?.name || 'Unknown';
      acc[branchName] = (acc[branchName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total,
      active,
      inactive,
      graduated,
      byBranch,
      activePercentage: total > 0 ? (active / total) * 100 : 0
    };
  }, [students, branches]);
  
  const transferStudent = useCallback(async (
    studentId: string, 
    newBranchId: string, 
    newGroupId?: string
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student) throw new Error('Student not found');
    
    await updateStudent(studentId, {
      branchId: newBranchId,
      groupId: newGroupId
    });
    
    // Log activity
    console.log(`Student ${student.fullName} transferred to new branch/group`);
  }, [students, updateStudent]);
  
  return {
    students,
    studentOptions,
    getStudentsByGroup,
    getStudentsByBranch,
    getStudentStatistics,
    transferStudent,
    createStudent,
    updateStudent,
    deleteStudent
  };
};

// hooks/business/useAttendanceManagement.ts
export const useAttendanceManagement = () => {
  const attendanceService = useMemo(() => new AttendanceService(), []);
  
  const markAttendance = useCallback(async (
    studentId: string,
    sessionId: string,
    status: 'present' | 'absent' | 'late'
  ) => {
    await attendanceService.markAttendance(studentId, sessionId, status);
  }, [attendanceService]);
  
  const getAttendanceReport = useCallback(async (
    studentId: string,
    startDate: Date,
    endDate: Date
  ) => {
    return attendanceService.getStudentAttendanceReport(studentId, startDate, endDate);
  }, [attendanceService]);
  
  const getClassAttendance = useCallback(async (
    sessionId: string
  ) => {
    return attendanceService.getSessionAttendance(sessionId);
  }, [attendanceService]);
  
  return {
    markAttendance,
    getAttendanceReport,
    getClassAttendance
  };
};

// hooks/business/useFinanceManagement.ts
export const useFinanceManagement = () => {
  const { finance } = useFinance();
  
  const calculateMonthlyRevenue = useCallback((month: string, year: number) => {
    return finance
      .filter(record => {
        const date = new Date(record.date);
        return date.getMonth() === parseInt(month) - 1 && date.getFullYear() === year;
      })
      .filter(record => record.type === 'income')
      .reduce((sum, record) => sum + record.amount, 0);
  }, [finance]);
  
  const getExpensesByCategory = useCallback(() => {
    const expenses = finance.filter(record => record.type === 'expense');
    
    return expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
  }, [finance]);
  
  return {
    calculateMonthlyRevenue,
    getExpensesByCategory,
    finance
  };
};
```

**Tahmini Süre:** 12 saat  

### 📦 3. Shared Components Library (ORTA)

#### 3.1 Form Components
- **Problem:** Form kod'u her sayfada duplicate
- **Çözüm:** Reusable form components

```typescript
// components/forms/FormField.tsx
interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'password' | 'number' | 'date';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  validation?: RegisterOptions;
  description?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  disabled,
  validation,
  description
}) => {
  const { register, formState: { errors } } = useFormContext();
  
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name, { required, ...validation })}
        className={cn(
          errors[name] && "border-red-500 focus-visible:ring-red-500"
        )}
      />
      
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      
      {errors[name] && (
        <p className="text-sm text-red-500">
          {errors[name]?.message || `${label} field is required`}
        </p>
      )}
    </div>
  );
};

// components/forms/SelectField.tsx
interface SelectFieldProps {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  options,
  placeholder = "Select option...",
  required,
  disabled
}) => {
  const { control, formState: { errors } } = useFormContext();
  
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <Controller
        name={name}
        control={control}
        rules={{ required }}
        render={({ field }) => (
          <Select 
            value={field.value} 
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger 
              className={cn(
                errors[name] && "border-red-500 focus:ring-red-500"
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      
      {errors[name] && (
        <p className="text-sm text-red-500">
          {label} field is required
        </p>
      )}
    </div>
  );
};

// components/forms/FormModal.tsx
interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: (data: any) => Promise<void>;
  submitText?: string;
  isLoading?: boolean;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = "Save",
  isLoading = false
}) => {
  const methods = useForm();
  
  const handleSubmit = async (data: any) => {
    try {
      await onSubmit(data);
      methods.reset();
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-4">
            {children}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  submitText
                )}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
```

**Tahmini Süre:** 8 saat  

#### 3.2 Data Display Components
- **Problem:** Table ve list kod'u duplicate
- **Çözüm:** Generic data display components

```typescript
// components/data/DataTable.tsx
export interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (record: T, index: number) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  selection?: {
    selectedKeys: string[];
    onChange: (selectedKeys: string[]) => void;
    getRowKey: (record: T) => string;
  };
  actions?: {
    title: string;
    render: (record: T, index: number) => React.ReactNode;
  };
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  onRowClick,
  pagination,
  selection,
  actions
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aValue = get(a, sortColumn);
      const bValue = get(b, sortColumn);
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);
  
  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    
    const columnKey = String(column.key);
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (!selection) return;
    
    if (checked) {
      const allKeys = data.map(selection.getRowKey);
      selection.onChange(allKeys);
    } else {
      selection.onChange([]);
    }
  };
  
  const handleSelectRow = (record: T, checked: boolean) => {
    if (!selection) return;
    
    const rowKey = selection.getRowKey(record);
    const currentSelected = selection.selectedKeys;
    
    if (checked) {
      selection.onChange([...currentSelected, rowKey]);
    } else {
      selection.onChange(currentSelected.filter(key => key !== rowKey));
    }
  };
  
  if (loading) {
    return <DataTableSkeleton />;
  }
  
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {selection && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selection.selectedKeys.length === data.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            
            {columns.map((column, index) => (
              <TableHead
                key={index}
                className={cn(
                  column.sortable && "cursor-pointer hover:bg-gray-50",
                  column.align === 'center' && "text-center",
                  column.align === 'right' && "text-right"
                )}
                style={{ width: column.width }}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center gap-2">
                  {column.title}
                  {column.sortable && sortColumn === String(column.key) && (
                    <ChevronUp
                      className={cn(
                        "h-4 w-4 transition-transform",
                        sortDirection === 'desc' && "rotate-180"
                      )}
                    />
                  )}
                </div>
              </TableHead>
            ))}
            
            {actions && (
              <TableHead className="text-center">{actions.title}</TableHead>
            )}
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {sortedData.map((record, index) => {
            const rowKey = selection?.getRowKey(record);
            const isSelected = selection?.selectedKeys.includes(rowKey || '');
            
            return (
              <TableRow
                key={index}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-gray-50",
                  isSelected && "bg-blue-50"
                )}
                onClick={() => onRowClick?.(record, index)}
              >
                {selection && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectRow(record, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}
                
                {columns.map((column, columnIndex) => (
                  <TableCell
                    key={columnIndex}
                    className={cn(
                      column.align === 'center' && "text-center",
                      column.align === 'right' && "text-right"
                    )}
                  >
                    {column.render
                      ? column.render(get(record, column.key), record, index)
                      : String(get(record, column.key) || '')
                    }
                  </TableCell>
                ))}
                
                {actions && (
                  <TableCell className="text-center">
                    <div onClick={(e) => e.stopPropagation()}>
                      {actions.render(record, index)}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {pagination && (
        <DataTablePagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={pagination.onChange}
        />
      )}
    </div>
  );
}
```

**Tahmini Süre:** 12 saat  

### 🔧 4. Type Definitions Centralization (ORTA)

#### 4.1 Domain Types
- **Problem:** Type'lar her dosyada ayrı tanımlanmış
- **Çözüm:** Central type definitions

```typescript
// lib/types/entities.ts
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Student extends BaseEntity {
  fullName: string;
  email: string;
  phone: string;
  branchId: string;
  groupId?: string;
  status: StudentStatus;
  enrollmentDate: Date;
  birthDate: Date;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  medicalInfo?: string;
}

export interface Trainer extends BaseEntity {
  fullName: string;
  email: string;
  phone: string;
  specialization: string[];
  branchIds: string[];
  employmentDate: Date;
  salary?: number;
  certifications?: string[];
  bio?: string;
}

export interface Group extends BaseEntity {
  name: string;
  branchId: string;
  trainerId: string;
  capacity: number;
  currentStudents: number;
  ageGroup: AgeGroup;
  level: SkillLevel;
  schedule: WeeklySchedule[];
}

export interface Branch extends BaseEntity {
  name: string;
  address: string;
  phone: string;
  managerName: string;
  capacity: number;
  facilities: string[];
}

// lib/types/enums.ts
export enum StudentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  GRADUATED = 'graduated',
  SUSPENDED = 'suspended'
}

export enum AgeGroup {
  KIDS = 'kids',
  TEENS = 'teens',
  ADULTS = 'adults',
  SENIORS = 'seniors'
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  PROFESSIONAL = 'professional'
}

// lib/types/dtos.ts
export interface CreateStudentDTO {
  fullName: string;
  email: string;
  phone: string;
  branchId: string;
  groupId?: string;
  birthDate: Date;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  medicalInfo?: string;
}

export interface UpdateStudentDTO extends Partial<CreateStudentDTO> {
  status?: StudentStatus;
}

export interface StudentFilters {
  branchId?: string;
  groupId?: string;
  status?: StudentStatus;
  ageGroup?: AgeGroup;
  enrollmentYear?: number;
}

// lib/types/api.ts
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

**Tahmini Süre:** 6 saat  

---

## 📊 Task Detay Tablosu

| Task Category | Task | Süre | Öncelik | Beklenen İyileştirme |
|---------------|------|------|---------|---------------------|
| **Service Layer** | Base Service Architecture | 12h | 🚨 Kritik | Code reusability %80 |
| **Service Layer** | Specific Services (8 services) | 24h | 🚨 Kritik | API consistency |
| **Custom Hooks** | Data Fetching Hooks | 16h | 🟡 Yüksek | State management clarity |
| **Custom Hooks** | Business Logic Hooks | 12h | 🟡 Yüksek | Logic reusability |
| **Components** | Form Components | 8h | 🟡 Orta | Development speed |
| **Components** | Data Display Components | 12h | 🟡 Orta | UI consistency |
| **Types** | Central Type Definitions | 6h | 🟡 Orta | Type safety |
| **Testing** | Service Unit Tests | 16h | 🟡 Orta | Code reliability |
| **Documentation** | Architecture Documentation | 8h | 🔵 Düşük | Team knowledge |

**Toplam Tahmini Süre:** 114 saat (14-15 iş günü)

---

## 🎯 Phase Milestones

### Month 1, Week 1-2: Service Layer Foundation
**Günler 1-10:**
- [ ] Base Service architecture
- [ ] StudentService implementation
- [ ] TrainerService implementation
- [ ] GroupService implementation
- [ ] Service unit tests

**Hedef:** Consistent data access pattern

### Month 1, Week 3-4: Custom Hooks & Components
**Günler 11-20:**
- [ ] Data fetching hooks
- [ ] Business logic hooks
- [ ] Form components library
- [ ] Data display components

**Hedef:** Reusable component library

### Month 2, Week 1-2: Integration & Testing
**Günler 21-30:**
- [ ] Type definitions centralization
- [ ] Service integration testing
- [ ] Component testing
- [ ] Documentation

**Hedef:** Production-ready architecture

---

## ✅ Definition of Done

### Service Layer:
- [ ] 8 service classes implemented
- [ ] Base service with CRUD operations
- [ ] Real-time subscription support
- [ ] Caching mechanism implemented
- [ ] Unit tests with 80%+ coverage

### Custom Hooks:
- [ ] Data fetching hooks for all entities
- [ ] Business logic hooks implemented
- [ ] Loading and error states handled
- [ ] Optimistic updates working

### Component Library:
- [ ] Form components reusable
- [ ] Data table component functional
- [ ] Type-safe component props
- [ ] Storybook documentation

### Type Safety:
- [ ] Central type definitions
- [ ] DTO interfaces defined
- [ ] Enum types implemented
- [ ] No `any` types in codebase

---

## 📈 Success Metrics

**Phase 3 sonunda başarı kriterleri:**

| Metrik | Baseline | Target | Measure Method |
|--------|----------|--------|----------------|
| **Code Reusability** | %30 | %80 | Code analysis |
| **Development Speed** | Yavaş | %50 hızlanma | Feature delivery time |
| **Type Coverage** | %60 | %95 | TypeScript compiler |
| **Test Coverage** | 0% | 80% | Jest/Vitest |
| **Component Reuse** | %20 | %70 | Component usage analysis |
| **API Consistency** | Düşük | Yüksek | Service pattern adherence |

### Architecture Quality Goals:
- **Single Responsibility:** Her service tek domain sorumluluğu
- **DRY Principle:** Code duplication %90 azalma
- **Type Safety:** Runtime error %80 azalma
- **Testability:** Unit test yazma süresi %60 azalma
- **Maintainability:** Bug fix süresi %50 azalma

**Bu Phase tamamlandığında sistem sürdürülebilir, ölçeklenebilir ve maintainable olacak!**