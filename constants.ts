// constants.ts
import { Student, StudentStatus, Guardian, TripHistoryItem, VerificationHistoryItem, IssueType, DataUsageItem, Route, GateLocation, Vehicle, CountryCode, StaffMember } from './types';

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'KE', dialCode: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', dialCode: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: 'TZ', dialCode: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'RW', dialCode: '+250', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧' },
];

export const MOCK_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Collins Muriuki',
    role: 'minder',
    phone: '+254 712 345 678',
    email: 'collins.muriuki@terra.go',
    isPhoneVerified: true,
    isEmailVerified: true,
    partnerName: 'Global International School',
    imgUrl: null,
  },
  {
    id: 'staff-2',
    name: 'John Mwangi',
    role: 'driver',
    phone: '+254 711 223 344',
    email: 'driver@terra.go',
    password: 'password123',
    isPhoneVerified: true,
    isEmailVerified: true,
    partnerName: 'Global International School',
    imgUrl: null,
  },
  {
    id: 'staff-3',
    name: 'Sarah Kamau',
    role: 'minder',
    phone: '+254 722 987 654',
    email: 'minder.sarah@terra.go',
    isPhoneVerified: true,
    isEmailVerified: true,
    partnerName: 'Global International School',
    imgUrl: null,
  },
  {
    id: 'staff-4',
    name: 'Grace Wanjiku',
    role: 'driver',
    phone: '+254 700 112 233',
    email: 'grace.wanjiku@terra.go',
    password: 'password123',
    isPhoneVerified: true,
    isEmailVerified: true,
    partnerName: 'Global International School',
    imgUrl: null,
  },
];

export const MOCK_DRIVER = {
  name: 'Collins Muriuki',
  phone: '+254 712 345 678',
  partnerName: 'Global International School',
  imgUrl: null as string | null,
};

export const MOCK_ASSIGNED_VEHICLES: Vehicle[] = [
  { id: 'v1', registration: 'KCP 680H', type: 'bus', zone: 'Zone A' },
  { id: 'v2', registration: 'KCQ 123J', type: 'van', zone: 'Zone B' },
  { id: 'v3', registration: 'KCR 456L', type: 'bus', zone: 'Zone C' },
  { id: 'v4', registration: 'KCS 789M', type: 'van', zone: 'Zone D' },
  { id: 'v5', registration: 'KCT 012N', type: 'bus', zone: 'Zone E' },
  { id: 'v6', registration: 'KCU 345P', type: 'van', zone: 'Zone F' },
];

export const MOCK_ROUTES: Route[] = [
    { id: 'r1', name: 'Westlands – Lavington', zone: 'Zone A', studentCount: 10, estimatedDuration: '45 mins' },
    { id: 'r2', name: 'Kilimani – Kileleshwa', zone: 'Zone B', studentCount: 0, estimatedDuration: '30 mins' },
    { id: 'r3', name: 'Karen – Langata', zone: 'Zone C', studentCount: 15, estimatedDuration: '60 mins' },
    { id: 'r4', name: 'Parklands – Muthaiga', zone: 'Zone D', studentCount: 10, estimatedDuration: '40 mins' },
];

export const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'Amani Mwangi', admissionNumber: 'S001', grade: 'Grade 1', status: StudentStatus.NotBoarded, imgUrl: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=120&h=120&fit=crop', parentName: 'Jane Mwangi', parentPhone: '+254 722 123 456' },
  { id: '2', name: 'Junior Otieno', admissionNumber: 'S002', grade: 'Grade 4', status: StudentStatus.NotBoarded, imgUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop', parentName: 'David Otieno', parentPhone: '+254 711 234 567' },
  { id: '3', name: 'Zawadi Achieng', admissionNumber: 'S003', grade: 'Grade 3', status: StudentStatus.NotBoarded, imgUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop', parentName: 'Sarah Achieng', parentPhone: '+254 723 345 678' },
  { id: '4', name: 'Brian Kiprop', admissionNumber: 'S004', grade: 'Grade 5', status: StudentStatus.NotBoarded, imgUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop', parentName: 'Mark Kiprop', parentPhone: '+254 700 987 654' },
  { id: '5', name: 'Faith Wambui', admissionNumber: 'S005', grade: 'Grade 2', status: StudentStatus.NotBoarded, imgUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop', parentName: 'Mary Wambui', parentPhone: '+254 733 456 789' },
  { id: '6', name: 'Ian Kimani', admissionNumber: 'S006', grade: 'Grade 1', status: StudentStatus.NotBoarded, imgUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop', parentName: 'Carlos Kimani', parentPhone: '+254 745 567 890' },
  { id: '7', name: 'Mercy Chebet', admissionNumber: 'S007', grade: 'Grade 3', status: StudentStatus.NotBoarded, imgUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop', parentName: 'Grace Chebet', parentPhone: '+254 712 678 901' },
  { id: '8', name: 'Victor Omondi', admissionNumber: 'S008', grade: 'Grade 2', status: StudentStatus.NotBoarded, imgUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop', parentName: 'Robert Omondi', parentPhone: '+254 728 789 012' },
  { id: '9', name: 'Joy Mutua', admissionNumber: 'S009', grade: 'Grade 4', status: StudentStatus.NotBoarded, imgUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop', parentName: 'Elena Mutua', parentPhone: '+254 734 890 123' },
  { id: '10', name: 'David Barasa', admissionNumber: 'S010', grade: 'Grade 5', status: StudentStatus.NotBoarded, imgUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop', parentName: 'Daniel Barasa', parentPhone: '+254 740 901 234' },
];

export const GATE_MOCK_STUDENTS: Student[] = MOCK_STUDENTS.map(s => ({...s, status: StudentStatus.NotArrived}));

export const MOCK_GUARDIAN: Guardian = {
  id: 'g1',
  name: 'Jane Smith',
  phone: '+254 722 123 456',
  idNumber: 'ID12345678',
  relationship: 'Mother',
  imgUrl: 'https://i.pravatar.cc/150?u=jane',
  authorizedStudentId: '1',
};

const generateWithTimes = (students: Student[], baseTime: Date, offsetMinutes: number) => {
    return students.map((s, i) => ({
        ...s,
        status: StudentStatus.Alighted,
        lastUpdateTime: new Date(new Date(baseTime).setMinutes(baseTime.getMinutes() + offsetMinutes + (i * 2)))
    }));
};

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(7, 30, 0, 0);

const dayBefore = new Date();
dayBefore.setDate(dayBefore.getDate() - 2);
dayBefore.setHours(16, 0, 0, 0);

export const MOCK_TRIP_HISTORY: TripHistoryItem[] = [
    {
        id: 'trip1',
        type: 'Morning',
        route: MOCK_ROUTES[0],
        startTime: yesterday,
        endTime: new Date(new Date(yesterday).setHours(yesterday.getHours() + 1)),
        students: generateWithTimes(MOCK_STUDENTS, yesterday, 15),
        issues: [],
    },
    {
        id: 'trip2',
        // Fix: Changed 'Afternoon' to 'Mid Afternoon' to match TripType union in types.ts
        type: 'Mid Afternoon',
        route: MOCK_ROUTES[1],
        startTime: dayBefore,
        endTime: new Date(new Date(dayBefore).setHours(dayBefore.getHours() + 1)),
        students: generateWithTimes(MOCK_STUDENTS, dayBefore, 10),
        issues: [{ type: IssueType.Traffic, note: 'Heavy traffic on main road', timestamp: new Date() }],
    },
    {
        id: 'trip3',
        type: 'Morning',
        route: MOCK_ROUTES[2],
        startTime: new Date(new Date().setDate(new Date().getDate() - 8)),
        endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 8)).setHours(new Date().getHours() + 1)),
        students: MOCK_STUDENTS.map(s => ({...s, status: StudentStatus.Alighted})),
        issues: [],
    },
];

export const MOCK_VERIFICATION_HISTORY: VerificationHistoryItem[] = [
    {
        id: 'v1',
        guardianName: 'Jane Smith',
        studentName: 'Liam Smith',
        timestamp: new Date(new Date().setHours(new Date().getHours() - 3)),
        verifiedBy: 'Security Guard A',
        guardianImgUrl: 'https://i.pravatar.cc/150?u=jane',
        studentImgUrl: 'https://picsum.photos/seed/liam/100/100',
        studentGrade: 'Grade 1',
        guardianPhone: '+254 722 123 456',
        guardianIdNumber: 'ID12345678',
        guardianRelationship: 'Mother',
    },
    {
        id: 'v2',
        guardianName: 'Mark Brown',
        studentName: 'Emma Brown',
        timestamp: new Date(new Date().setHours(new Date().getHours() - 26)),
        verifiedBy: 'Security Guard B',
        guardianImgUrl: 'https://i.pravatar.cc/150?u=mark',
        studentImgUrl: 'https://picsum.photos/seed/emma/100/100',
        studentGrade: 'Grade 3',
        guardianPhone: '+254 700 987 654',
        guardianIdNumber: 'ID87654321',
        guardianRelationship: 'Father',
    },
];

export const MOCK_DATA_USAGE_HISTORY: DataUsageItem[] = Array.from({ length: 7 }).map((_, i) => ({
    date: new Date(new Date().setDate(new Date().getDate() - i)).toISOString().split('T')[0],
    usage: parseFloat((Math.random() * (5 - 1.5) + 1.5).toFixed(2)),
})).reverse();

export const MOCK_GATE_LOCATIONS: GateLocation[] = [
    { id: 'gate1', name: 'Main Gate', description: 'Primary entrance/exit for all students.', studentCount: 25, icon: 'mapPin' },
    { id: 'gate2', name: 'Side Gate (Staff & Visitors)', description: 'Used by staff and pre-authorized visitors.', studentCount: 5, icon: 'mapPin' },
    { id: 'gate3', name: 'Sports Complex Entrance', description: 'Access point for students attending sports activities.', studentCount: 10, icon: 'mapPin' },
];