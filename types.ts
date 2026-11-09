// types.ts

export enum Screen {
  Login,
  DriverConfirmation,
  Home,
  TripSelection,
  RouteSelection,
  ActiveTrip,
  TripSummary,
  GateAttendance,
  SelectGateLocation,
  Profile,
  History,
  TripReport,
  Settings,
  Support,
  BandIdentification,
}

export type GpsStatus = 'active' | 'inactive' | 'error';
export type Coordinates = { lat: number; lon: number };

export enum StudentStatus {
  NotBoarded = 'Not Boarded',
  Boarded = 'Boarded',
  Absent = 'Absent',
  Alighted = 'Alighted',
  InSchool = 'In School',
  NotArrived = 'Not Arrived',
  LeftSchool = 'Left School',
}

export interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  grade: string;
  status: StudentStatus;
  imgUrl: string;
  alert?: string; // For highlighting students with issues
  lastUpdateTime?: Date;
  parentName?: string;
  parentPhone?: string;
}

export interface Guardian {
  id: string;
  name: string;
  phone: string;
  idNumber: string;
  relationship: string;
  imgUrl: string;
  authorizedStudentId: string;
}

export type TripType = 'Morning' | 'Mid Day' | 'Mid Afternoon' | 'Evening' | 'Special Event';

export interface Route {
    id: string;
    name: string;
    zone: string;
    studentCount: number;
    estimatedDuration: string;
}

export interface ScheduledTrip {
  id: string;
  type: TripType;
  title: string;
  scheduledTime: string; // HH:mm format
  scheduledDate: string; // YYYY-MM-DD format
  category: 'regular' | 'one-off';
  icon: string;
}

export interface Trip {
  type: TripType;
  title?: string;
  route: Route;
  startTime: Date;
  endTime?: Date;
  students: Student[];
  issues: Issue[];
}

export enum IssueType {
    Delay = 'Delay',
    Traffic = 'Traffic delay',
    Vehicle = 'Vehicle issue',
    Weather = 'Weather issue',
    Safety = 'Safety incident',
}

export type IssueRecipient = 'parent' | 'school';

export interface Issue {
    type: IssueType;
    note: string;
    timestamp: Date;
    recipientType?: IssueRecipient;
    recipientCount?: number;
    selectedStudentIds?: string[];
    recipientSummary?: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface VerificationHistoryItem {
  id: string;
  guardianName: string;
  studentName: string;
  timestamp: Date;
  verifiedBy: string;
  guardianImgUrl: string;
  studentImgUrl: string;
  studentGrade: string;
  guardianPhone: string;
  guardianIdNumber: string;
  guardianRelationship: string;
}

export interface TripHistoryItem extends Trip {
  id: string;
}

export interface DataUsageItem {
  date: string;
  usage: number; // in MB
}

export type VehicleType = 'bus' | 'van';

export interface Vehicle {
  id: string;
  registration: string;
  type: VehicleType;
  zone: string;
}

export type IconName = 'bus' | 'van' | 'user' | 'mapPin' | 'checkCircle' | 'circleCheck' | 'check' | 'x' | 'xCircle' | 'alertTriangle' | 'clock' | 'logIn' | 'logOut' | 'arrowRight' | 'sun' | 'moon' | 'map' | 'userCheck' | 'search' | 'users' | 'shield' | 'fileText' | 'send' | 'wifiOff' | 'info' | 'smartphone' | 'settings' | 'bell' | 'database' | 'helpCircle' | 'wifi' | 'barChart2' | 'crosshair' | 'zap' | 'loader' | 'copy' | 'chevronRight' | 'refreshCw' | 'logo' | 'camera' | 'maximize' | 'rotateCcw' | 'phone' | 'messageCircle' | 'chevronLeft' | 'edit' | 'star' | 'lock' | 'unlock' | 'mail' | 'eye' | 'eyeOff' | 'key';

export interface GateLocation {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  icon: IconName;
}

export interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

export type StaffRole = 'driver' | 'minder';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  email: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  password?: string;
  partnerName: string;
  imgUrl?: string | null;
}