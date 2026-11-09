import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, StudentStatus, StaffMember, Vehicle, Route, ToastType } from '../types';
import { MOCK_STUDENTS, MOCK_ASSIGNED_VEHICLES, MOCK_ROUTES } from '../constants';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface MinderFlowProps {
  staff: StaffMember;
  onLogout: () => void;
  showToast: (msg: string, type?: ToastType) => void;
  onSwitchRole?: (role: 'driver' | 'minder') => void;
}

type MinderStage = 'home' | 'boarding' | 'missing' | 'alighting' | 'bus_empty' | 'summary';

export interface MinderScanSuccess {
  student: Student;
  action: 'boarded' | 'alighted';
}

export interface MinderScanError {
  title: string;
  message: string;
  subtext?: string;
  code?: string;
}

const NfcIcon: React.FC<{ className?: string; color?: string }> = ({ 
  className = "w-16 h-16",
  color = "#E70D8D"
}) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M35 45C42 38 50 35 60 35C70 35 78 38 85 45" stroke={color} strokeWidth="6" strokeLinecap="round" />
    <path d="M25 35C35 25 47 20 60 20C73 20 85 25 95 35" stroke={color} strokeWidth="6" strokeLinecap="round" />
    <path d="M45 55C49 52 54 50 60 50C66 50 71 52 75 55" stroke={color} strokeWidth="6" strokeLinecap="round" />
    <circle cx="60" cy="85" r="24" stroke={color} strokeWidth="8" />
    <rect x="22" y="78" width="12" height="14" rx="3" stroke={color} strokeWidth="8" />
    <rect x="86" y="78" width="12" height="14" rx="3" stroke={color} strokeWidth="8" />
  </svg>
);

interface MinderIdleCardProps {
  onTapToScan: () => void;
}

const MinderIdleCard: React.FC<MinderIdleCardProps> = ({
  onTapToScan,
}) => (
  <div
    onClick={onTapToScan}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTapToScan(); }}
    className="border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm hover:shadow-md flex flex-col items-center justify-center my-4 text-center relative overflow-hidden cursor-pointer transition-all active:scale-[0.99] select-none animate-fade-in min-h-[240px]"
    title="Ready to scan - tap student band"
  >
    {/* Central Glowing Pink Animated Graphic */}
    <div className="relative w-28 h-28 flex items-center justify-center">
      {/* Outer pulsing ping ring */}
      <div className="absolute w-28 h-28 rounded-full border-2 border-[#E70D8D]/30 dark:border-[#E70D8D]/20 animate-ping [animation-duration:2.8s] pointer-events-none" />
      {/* Intermediate breathing pulse ring */}
      <div className="absolute w-24 h-24 rounded-full border border-[#E70D8D]/40 dark:border-[#E70D8D]/30 animate-pulse pointer-events-none" />
      {/* Pink inner glow circle */}
      <div className="w-20 h-20 rounded-full bg-pink-50 dark:bg-pink-950/50 border-2 border-[#E70D8D]/40 dark:border-[#E70D8D]/40 flex items-center justify-center shadow-[0_0_25px_rgba(231,13,141,0.25)] hover:scale-105 transition-transform duration-300">
        <NfcIcon className="w-13 h-13 text-[#E70D8D]" />
      </div>
    </div>
  </div>
);

export const MinderFlow: React.FC<MinderFlowProps> = ({
  staff,
  onLogout,
  showToast,
  onSwitchRole,
}) => {
  const [stage, setStage] = useState<MinderStage>('home');
  const [vehicle] = useState<Vehicle>(MOCK_ASSIGNED_VEHICLES[0]); // KCP 680H
  const [route] = useState<Route>(MOCK_ROUTES[0]); // Westlands – Lavington

  // Initialize students for the minder trip
  const [students, setStudents] = useState<Student[]>(() => {
    // Start with 3 already boarded to match the screenshot "3 / 10", with Amani Mwangi as last boarded
    return MOCK_STUDENTS.map((s, idx) => {
      if (idx === 0) {
        // Amani Mwangi - Boarded
        return { ...s, status: StudentStatus.Boarded };
      }
      if (idx === 4 || idx === 5) {
        // Faith Wambui & Ian Kimani - Boarded
        return { ...s, status: StudentStatus.Boarded };
      }
      return { ...s, status: StudentStatus.NotBoarded };
    });
  });

  // Track boarding history stack for accurate UNDO
  const [lastBoardedStudentId, setLastBoardedStudentId] = useState<string | null>('1'); // Initialized to Amani Mwangi (id: 1)
  const [boardingHistory, setBoardingHistory] = useState<string[]>(['5', '6', '1']);

  // Transient scan feedback states (Success 3s auto-dismiss, Error dismiss only on X tap)
  const [scanSuccess, setScanSuccess] = useState<MinderScanSuccess | null>(null);
  const [scanError, setScanError] = useState<MinderScanError | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Simulation test error menu toggles
  const [showBoardingErrorMenu, setShowBoardingErrorMenu] = useState(false);
  const [showAlightingErrorMenu, setShowAlightingErrorMenu] = useState(false);

  // Modals state
  const [isFindChildOpen, setIsFindChildOpen] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [isConfirmAllAbsentOpen, setIsConfirmAllAbsentOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMoreTripsOpen, setIsMoreTripsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Intermediary transition modal sheets
  const [isBoardingTransitionOpen, setIsBoardingTransitionOpen] = useState(false);
  const [isAlightingTransitionOpen, setIsAlightingTransitionOpen] = useState(false);

  // Alighting state
  const [lastAlightedStudentId, setLastAlightedStudentId] = useState<string | null>(null);
  const [alightingHistory, setAlightingHistory] = useState<string[]>([]);

  // Calculations
  const boardedCount = useMemo(() => {
    return students.filter(s => s.status === StudentStatus.Boarded || s.status === StudentStatus.Alighted).length;
  }, [students]);

  const alightedCount = useMemo(() => {
    return students.filter(s => s.status === StudentStatus.Alighted).length;
  }, [students]);

  const absentCount = useMemo(() => {
    return students.filter(s => s.status === StudentStatus.Absent).length;
  }, [students]);

  const totalStudents = students.length;

  const missingStudents = useMemo(() => {
    return students.filter(s => s.status === StudentStatus.NotBoarded);
  }, [students]);

  // Students who were boarded onto the bus but have not yet alighted
  const studentsStillOnBus = useMemo(() => {
    return students.filter(s => s.status === StudentStatus.Boarded);
  }, [students]);



  // Greeting helper based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = staff.name.split(' ')[0] || 'Collins';

  // Helper to extract 2-letter initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Transition stage and reset active transient state
  const goToStage = (nextStage: MinderStage) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setScanSuccess(null);
    setScanError(null);
    setShowBoardingErrorMenu(false);
    setShowAlightingErrorMenu(false);
    setStage(nextStage);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // Show success for 3 seconds, then return to scanning state
  const triggerScanSuccess = (student: Student, action: 'boarded' | 'alighted') => {
    setScanError(null);

    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }

    setScanSuccess({ student, action });

    successTimerRef.current = setTimeout(() => {
      setScanSuccess(null);
      successTimerRef.current = null;
    }, 3000);
  };

  // Populate the exact same area with error state; ONLY dismisses when X is tapped
  const triggerScanError = (error: MinderScanError) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setScanSuccess(null);
    setScanError(error);
  };

  const handleDismissError = () => {
    setScanError(null);
  };

  // Simulate scanning next student (3-second success state)
  const handleSimulateScan = () => {
    const nextUnboarded = students.find(s => s.status === StudentStatus.NotBoarded);
    if (!nextUnboarded) {
      triggerScanError({
        title: 'All Children Boarded',
        message: 'All 10 children assigned to this route have already been boarded.',
        subtext: 'No more unboarded students remaining. Tap FINISHED BOARDING to proceed.',
        code: 'ALL_BOARDED',
      });
      return;
    }

    setStudents(prev => prev.map(s => s.id === nextUnboarded.id ? { ...s, status: StudentStatus.Boarded } : s));
    setLastBoardedStudentId(nextUnboarded.id);
    setBoardingHistory(prev => [...prev, nextUnboarded.id]);
    triggerScanSuccess(nextUnboarded, 'boarded');
    showToast(`${nextUnboarded.name} scanned & boarded!`, 'success');
  };

  // Undo boarding
  const handleUndoBoarding = () => {
    const targetId = scanSuccess?.action === 'boarded' ? scanSuccess.student.id : (boardingHistory.length > 0 ? boardingHistory[boardingHistory.length - 1] : lastBoardedStudentId);
    if (!targetId) {
      showToast('No recent boarding to undo.', 'info');
      return;
    }

    const undoneStudent = students.find(s => s.id === targetId);
    if (!undoneStudent) return;

    setStudents(prev => prev.map(s => s.id === targetId ? { ...s, status: StudentStatus.NotBoarded } : s));

    const nextHistory = boardingHistory.filter(id => id !== targetId);
    setBoardingHistory(nextHistory);
    const newLastId = nextHistory.length > 0 ? nextHistory[nextHistory.length - 1] : null;
    setLastBoardedStudentId(newLastId);

    // If this student was currently showing as success, clear it immediately
    if (scanSuccess?.student.id === targetId) {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
      setScanSuccess(null);
    }

    showToast(`Boarding undone for ${undoneStudent.name}`, 'info');
  };

  // Manual board from search
  const handleManualBoard = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: StudentStatus.Boarded } : s));
    setLastBoardedStudentId(studentId);
    setBoardingHistory(prev => [...prev, studentId]);
    setIsFindChildOpen(false);
    triggerScanSuccess(student, 'boarded');
    showToast(`${student.name} marked as boarded.`, 'success');
  };

  // Handle Finish Boarding action
  const handleFinishBoarding = () => {
    if (missingStudents.length > 0) {
      // Prompt with Screen 3 ("Whos missing")
      goToStage('missing');
    } else {
      // Show intermediary transition modal sheet to review stats before alighting
      setIsBoardingTransitionOpen(true);
    }
  };

  // Mark single child as "Is on bus" from missing screen
  const handleMarkIsOnBus = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: StudentStatus.Boarded } : s));
    setLastBoardedStudentId(studentId);
    setBoardingHistory(prev => [...prev, studentId]);
    showToast(`${student?.name} confirmed on bus`, 'success');
  };

  // Mark single child as "Absent" from missing screen
  const handleMarkAbsent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: StudentStatus.Absent } : s));
    showToast(`${student?.name} marked absent`, 'info');
  };

  // Confirm Mark All Absent
  const handleConfirmAllAbsent = () => {
    setStudents(prev => prev.map(s => s.status === StudentStatus.NotBoarded ? { ...s, status: StudentStatus.Absent } : s));
    setIsConfirmAllAbsentOpen(false);
    showToast(`${missingStudents.length} children marked absent.`, 'info');
    setIsBoardingTransitionOpen(true);
  };

  // Simulate scanning for alighting (3-second success state)
  const handleSimulateAlight = () => {
    const nextOnBus = students.find(s => s.status === StudentStatus.Boarded);
    if (!nextOnBus) {
      triggerScanError({
        title: 'No Children on Bus',
        message: 'All boarded children have already alighted safely from the vehicle.',
        subtext: 'Bus is clear. Tap END TRIP below to complete the trip.',
        code: 'BUS_EMPTY',
      });
      return;
    }

    setStudents(prev => prev.map(s => s.id === nextOnBus.id ? { ...s, status: StudentStatus.Alighted } : s));
    setLastAlightedStudentId(nextOnBus.id);
    setAlightingHistory(prev => [...prev, nextOnBus.id]);
    triggerScanSuccess(nextOnBus, 'alighted');
    showToast(`${nextOnBus.name} alighted safely!`, 'success');
  };

  // Undo alighting
  const handleUndoAlighting = () => {
    const targetId = scanSuccess?.action === 'alighted' ? scanSuccess.student.id : (alightingHistory.length > 0 ? alightingHistory[alightingHistory.length - 1] : lastAlightedStudentId);
    if (!targetId) {
      showToast('No recent alighting to undo.', 'info');
      return;
    }

    const undoneStudent = students.find(s => s.id === targetId);
    if (!undoneStudent) return;

    setStudents(prev => prev.map(s => s.id === targetId ? { ...s, status: StudentStatus.Boarded } : s));

    const nextHistory = alightingHistory.filter(id => id !== targetId);
    setAlightingHistory(nextHistory);
    const newLastId = nextHistory.length > 0 ? nextHistory[nextHistory.length - 1] : null;
    setLastAlightedStudentId(newLastId);

    // If this student was currently showing as success, clear it immediately
    if (scanSuccess?.student.id === targetId) {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
      setScanSuccess(null);
    }

    showToast(`Alighting undone for ${undoneStudent.name}`, 'info');
  };

  // Manual alight from search
  const handleManualAlight = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: StudentStatus.Alighted } : s));
    setLastAlightedStudentId(studentId);
    setAlightingHistory(prev => [...prev, studentId]);
    setIsFindChildOpen(false);
    triggerScanSuccess(student, 'alighted');
    showToast(`${student.name} marked as alighted.`, 'success');
  };

  // Filtered students for manual find modal
  const filteredStudents = useMemo(() => {
    if (!manualSearchQuery.trim()) return students;
    const query = manualSearchQuery.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.admissionNumber.toLowerCase().includes(query) ||
      s.grade.toLowerCase().includes(query)
    );
  }, [students, manualSearchQuery]);

  // Eligible students for bulk actions based on current stage
  const eligibleBulkStudents = useMemo(() => {
    if (stage === 'alighting') {
      return filteredStudents.filter(s => s.status === StudentStatus.Boarded);
    }
    return filteredStudents.filter(s => s.status === StudentStatus.NotBoarded);
  }, [filteredStudents, stage]);

  const isAllBulkSelected = useMemo(() => {
    if (eligibleBulkStudents.length === 0) return false;
    return eligibleBulkStudents.every(s => selectedBulkIds.includes(s.id));
  }, [eligibleBulkStudents, selectedBulkIds]);

  const handleToggleSelectAll = () => {
    if (isAllBulkSelected) {
      setSelectedBulkIds([]);
    } else {
      setSelectedBulkIds(eligibleBulkStudents.map(s => s.id));
    }
  };

  const handleToggleStudentSelection = (id: string) => {
    setSelectedBulkIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkBoard = () => {
    if (selectedBulkIds.length === 0) return;
    const count = selectedBulkIds.length;
    setStudents(prev => prev.map(s => selectedBulkIds.includes(s.id) ? { ...s, status: StudentStatus.Boarded } : s));
    const lastId = selectedBulkIds[selectedBulkIds.length - 1];
    setLastBoardedStudentId(lastId);
    setBoardingHistory(prev => [...prev, ...selectedBulkIds]);
    setSelectedBulkIds([]);
    setIsFindChildOpen(false);
    showToast(`${count} ${count === 1 ? 'child' : 'children'} boarded in bulk!`, 'success');
  };

  const handleBulkAlight = () => {
    if (selectedBulkIds.length === 0) return;
    const count = selectedBulkIds.length;
    setStudents(prev => prev.map(s => selectedBulkIds.includes(s.id) ? { ...s, status: StudentStatus.Alighted } : s));
    const lastId = selectedBulkIds[selectedBulkIds.length - 1];
    setLastAlightedStudentId(lastId);
    setAlightingHistory(prev => [...prev, ...selectedBulkIds]);
    setSelectedBulkIds([]);
    setIsFindChildOpen(false);
    showToast(`${count} ${count === 1 ? 'child' : 'children'} alighted in bulk!`, 'success');
  };

  return (
    <div className="h-full w-full bg-[#FAFAFC] dark:bg-slate-950 font-sans flex flex-col justify-between text-gray-900 dark:text-slate-100 select-none overflow-hidden relative">

      {/* Top App Header / Role Badge for Easy Switching */}
      <div className="px-5 pt-3 pb-1 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider bg-pink-100 dark:bg-pink-950/40 text-[#E70D8D] px-2.5 py-0.5 rounded-full">
            Minder Mode
          </span>
          {stage === 'boarding' && (
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Boarding
            </span>
          )}
          {stage === 'alighting' && (
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Alighting
            </span>
          )}
          {onSwitchRole && (
            <button
              onClick={() => onSwitchRole('driver')}
              className="text-[11px] font-bold text-gray-500 hover:text-[#303690] dark:text-slate-400 hover:underline cursor-pointer"
              title="Switch to Driver flow"
            >
              Switch to Driver
            </button>
          )}
        </div>
        <button
          onClick={() => setIsProfileOpen(true)}
          className="w-8 h-8 rounded-full bg-[#1D2258] text-white flex items-center justify-center font-bold text-xs shadow-sm hover:opacity-90"
          title="Account / Logout"
        >
          {getInitials(staff.name)}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN 1: MINDER HOME SCREEN (Matches Image Screen 1)                     */}
      {/* ========================================================================= */}
      {stage === 'home' && (
        <div className="flex-1 flex flex-col justify-between px-6 pt-4 pb-6 overflow-y-auto animate-fade-in">
          <div>
            {/* Header Greeting */}
            <h1 className="text-2xl sm:text-3xl font-black text-[#1D2258] dark:text-white tracking-tight mb-1">
              {greeting}, {firstName}
            </h1>
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-8">
              {vehicle.registration} &bull; {vehicle.zone}
            </p>

            {/* Next Trip Card */}
            <div className="bg-[#1D2258] dark:bg-[#161a46] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
              {/* Subtle ambient blur */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-indigo-200 mb-3">
                YOUR NEXT TRIP
              </span>

              <h2 className="text-3xl font-black tracking-tight mb-2">
                Morning Trip
              </h2>

              <p className="text-sm font-semibold text-indigo-100/90 mb-1">
                06:45 &bull; {route.name}
              </p>

              <p className="text-xs font-medium text-indigo-200/80 mb-8">
                {totalStudents} children
              </p>

              <button
                type="button"
                onClick={() => goToStage('boarding')}
                className="w-full bg-[#E70D8D] hover:bg-[#d0097d] text-white font-black text-base py-4 rounded-2xl shadow-lg shadow-pink-900/30 active:scale-[0.98] transition-all uppercase tracking-wider cursor-pointer"
              >
                START TRIP
              </button>
            </div>
          </div>

          {/* Bottom Bar: More trips & Help */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-slate-800 text-sm font-bold text-[#1D2258] dark:text-indigo-300">
            <button
              onClick={() => setIsMoreTripsOpen(true)}
              className="hover:text-[#E70D8D] transition-colors cursor-pointer"
            >
              More trips
            </button>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="hover:text-[#E70D8D] transition-colors cursor-pointer"
            >
              Help
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: GETTING ON / MINDER BOARDING (Matches Image Screen 2)           */}
      {/* ========================================================================= */}
      {stage === 'boarding' && (
        <div className="flex-1 flex flex-col justify-between px-6 pt-3 pb-6 overflow-y-auto animate-fade-in">
          <div>
            {/* Top Activity Badge */}
            <div className="flex justify-center mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Icon name="logIn" className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                Boarding Activity
              </span>
            </div>

            {/* Breadcrumb Header */}
            <p className="text-center text-xs font-semibold text-gray-400 dark:text-slate-500 tracking-wide mb-3">
              Morning Trip &bull; Getting on &bull; {vehicle.registration}
            </p>

            {/* Huge Fraction Counter */}
            <div className="text-center mb-4">
              <h1 className="text-5xl font-black text-[#1D2258] dark:text-white tracking-tight leading-none mb-1">
                {boardedCount} / {totalStudents}
              </h1>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
                children on the bus
              </p>
            </div>

            {/* Central Card Area: Populated with Error (dismissible on X), 3s Success, or Pink Animated Glowing Idle State */}
            {scanError ? (
              <div className="border-2 border-[#8B1A1A] bg-red-50/80 dark:bg-red-950/30 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center my-4 relative text-center animate-fade-in">
                {/* Close Button X: Only dismisses when X is tapped */}
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-[#8B1A1A] dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center transition-all shadow-xs border border-red-200 dark:border-red-900/40 cursor-pointer"
                  aria-label="Dismiss error"
                  title="Dismiss error and return to scanning"
                >
                  <Icon name="x" className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* Red Error Icon */}
                <div className="w-16 h-16 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center font-black mb-3 shadow-inner">
                  <Icon name="alertTriangle" className="w-8 h-8 text-white" />
                </div>

                {/* Error Title */}
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                  {scanError.title}
                </h3>

                {/* Error Message */}
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 max-w-[270px] mb-2 leading-relaxed">
                  {scanError.message}
                </p>

                {scanError.subtext && (
                  <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-2">
                    {scanError.subtext}
                  </p>
                )}

                {/* Status Pill */}
                <span className="inline-block bg-[#8B1A1A] text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs mb-3">
                  {scanError.code || 'Scan Error'}
                </span>

                {/* Clear dismiss instruction */}
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="text-xs font-extrabold text-[#8B1A1A] dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Tap ✕ to return to scanning</span>
                </button>
              </div>
            ) : scanSuccess && scanSuccess.action === 'boarded' ? (
              <div className="border-2 border-[#0E7A4A] bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center my-4 relative animate-fade-in overflow-hidden">
                {/* 3s Visual Countdown Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-100 dark:bg-emerald-950/60 overflow-hidden">
                  <div className="h-full bg-[#0E7A4A] animate-shrink-width" />
                </div>

                {/* Initials Avatar */}
                <div className="w-16 h-16 rounded-full bg-[#0E7A4A] text-white flex items-center justify-center font-black text-xl mb-3 shadow-inner">
                  {getInitials(scanSuccess.student.name)}
                </div>

                {/* Name */}
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-0.5 text-center">
                  {scanSuccess.student.name}
                </h3>

                {/* Grade */}
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 mb-3">
                  {scanSuccess.student.grade} &bull; {scanSuccess.student.admissionNumber}
                </p>

                {/* Green Status Pill */}
                <span className="inline-flex items-center gap-1.5 bg-[#0E7A4A] text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-xs">
                  <Icon name="check" className="w-3.5 h-3.5 text-white" />
                  On the bus
                </span>

                {/* Temporary Notice */}
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-2">
                  Returning to scanning in 3s...
                </p>
              </div>
            ) : (
              /* Idle State with Glowing Icon */
              <MinderIdleCard onTapToScan={handleSimulateScan} />
            )}

            {/* Tap Prompt, Sensor Simulator & Test Error Menu */}
            <div className="text-center mt-3">
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-2">
                Tap the next band on the back of the phone
              </p>

              <div className="flex flex-col items-center gap-2 mb-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateScan}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-[#1D2258] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <Icon name="zap" className="w-3.5 h-3.5 text-[#E70D8D]" />
                    Simulate Band Tap
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBoardingErrorMenu(prev => !prev)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors cursor-pointer"
                    title="Test error states in the card area"
                  >
                    <Icon name="alertTriangle" className="w-3.5 h-3.5 text-red-600" />
                    Test Error ▾
                  </button>
                </div>

                {/* Test error options */}
                {showBoardingErrorMenu && (
                  <div className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/40 rounded-2xl p-2.5 shadow-md flex flex-wrap justify-center gap-1.5 max-w-xs animate-fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBoardingErrorMenu(false);
                        triggerScanError({
                          title: 'Unrecognized Band',
                          message: 'Wristband UID #8F9A-4011 is not assigned to any student in the school registry.',
                          subtext: 'Check the band number or use "Find child" below to check in manually.',
                          code: 'INVALID_NFC',
                        });
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      Unrecognized Band
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBoardingErrorMenu(false);
                        triggerScanError({
                          title: 'Wrong Bus / Route',
                          message: 'Student Zawadi Kariuki is assigned to Route 3 (Kilimani) on Bus KCA 102B.',
                          subtext: 'Do not allow student on board without authorization.',
                          code: 'ROUTE_MISMATCH',
                        });
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      Wrong Bus
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBoardingErrorMenu(false);
                        const alreadyBoarded = students.find(s => s.status === StudentStatus.Boarded);
                        triggerScanError({
                          title: 'Already Boarded',
                          message: `${alreadyBoarded?.name || 'Amani Mwangi'} has already been scanned and boarded onto this bus.`,
                          subtext: 'Duplicate tap ignored.',
                          code: 'DUPLICATE_SCAN',
                        });
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      Duplicate Tap
                    </button>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-medium text-gray-600 dark:text-slate-400">
                  Wrong child?{' '}
                </span>
                <button
                  type="button"
                  onClick={handleUndoBoarding}
                  className="text-xs font-extrabold text-[#B91C1C] hover:underline cursor-pointer"
                >
                  UNDO
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Actions: Find child link & Finished Boarding button */}
          <div className="pt-4 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setManualSearchQuery('');
                setSelectedBulkIds([]);
                setIsFindChildOpen(true);
              }}
              className="text-xs font-bold text-[#1D2258] dark:text-indigo-300 hover:text-[#E70D8D] cursor-pointer"
            >
              Band not working? Find child
            </button>

            <button
              type="button"
              onClick={handleFinishBoarding}
              className="w-full border-2 border-[#1D2258] dark:border-indigo-400 text-[#1D2258] dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 font-black text-sm py-4 rounded-2xl tracking-wider uppercase transition-all shadow-sm active:scale-[0.98] cursor-pointer"
            >
              FINISHED BOARDING
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: WHOS MISSING (Matches Image Screen 3)                           */}
      {/* ========================================================================= */}
      {stage === 'missing' && (
        <div className="flex-1 flex flex-col justify-between px-6 pt-3 pb-6 overflow-y-auto animate-fade-in">
          <div>
            {/* Header Title & Subtitle */}
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
              {missingStudents.length === 0 ? 'All children are on the bus' : `${missingStudents.length} children are not on the bus`}
            </h1>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-5">
              {missingStudents.length === 0 ? 'You are ready to proceed.' : 'Look at the bus. If a child is on it, tap Board.'}
            </p>

            {/* Missing Children Cards List */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {missingStudents.map((child) => (
                <div
                  key={child.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between gap-3 animate-fade-in"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Initials Circle */}
                    <div className="w-11 h-11 rounded-full bg-[#1D2258] text-white font-black text-xs flex items-center justify-center shrink-0">
                      {getInitials(child.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 dark:text-slate-100 truncate">
                        {child.name}
                      </p>
                      <p className="text-xs font-semibold text-gray-400 dark:text-slate-400">
                        {child.grade}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Board / Absent */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMarkIsOnBus(child.id)}
                      className="bg-[#303690] hover:bg-[#252a72] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Board
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAbsent(child.id)}
                      className="bg-[#8B1A1A] hover:bg-[#721515] text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))}

              {missingStudents.length === 0 && (
                <div className="p-6 text-center bg-green-50 dark:bg-green-950/30 rounded-2xl border border-green-200 dark:border-green-900/40">
                  <Icon name="checkCircle" className="w-10 h-10 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-black text-green-800 dark:text-green-300">
                    All students accounted for!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                    {boardedCount} on bus &bull; {absentCount} absent
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action: Mark All Absent or Proceed */}
          <div className="pt-4 flex flex-col items-center">
            {missingStudents.length > 0 ? (
              <div className="w-full flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setIsConfirmAllAbsentOpen(true)}
                  className="w-full border-2 border-[#8B1A1A] text-[#8B1A1A] bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/20 font-black text-xs py-4 rounded-2xl uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  MARK ALL {missingStudents.length} ABSENT
                </button>
                <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 mt-2 text-center">
                  You will see their photos to confirm first.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsBoardingTransitionOpen(true)}
                className="w-full bg-[#E70D8D] hover:bg-[#d0097d] text-white font-black text-sm py-4 rounded-2xl uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                PROCEED TO ALIGHTING &rarr;
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 4: GETTING OFF / MINDER ALIGHTING (Symmetrical simple flow)        */}
      {/* ========================================================================= */}
      {stage === 'alighting' && (
        <div className="flex-1 flex flex-col justify-between px-6 pt-3 pb-6 overflow-y-auto animate-fade-in">
          <div>
            {/* Top Activity Badge */}
            <div className="flex justify-center mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <Icon name="logOut" className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                Alighting Activity
              </span>
            </div>

            {/* Breadcrumb Header */}
            <p className="text-center text-xs font-semibold text-gray-400 dark:text-slate-500 tracking-wide mb-3">
              Morning Trip &bull; Getting off &bull; {vehicle.registration}
            </p>

            {/* Fraction Counter */}
            <div className="text-center mb-4">
              <h1 className="text-5xl font-black text-[#1D2258] dark:text-white tracking-tight leading-none mb-1">
                {alightedCount} / {boardedCount}
              </h1>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
                children alighted
              </p>
            </div>

            {/* Central Card Area: Populated with Error (dismissible on X), 3s Success, or Pink Animated Glowing Idle State */}
            {scanError ? (
              <div className="border-2 border-[#8B1A1A] bg-red-50/80 dark:bg-red-950/30 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center my-4 relative text-center animate-fade-in">
                {/* Close Button X: Only dismisses when X is tapped */}
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-[#8B1A1A] dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center transition-all shadow-xs border border-red-200 dark:border-red-900/40 cursor-pointer"
                  aria-label="Dismiss error"
                  title="Dismiss error and return to scanning"
                >
                  <Icon name="x" className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* Red Error Icon */}
                <div className="w-16 h-16 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center font-black mb-3 shadow-inner">
                  <Icon name="alertTriangle" className="w-8 h-8 text-white" />
                </div>

                {/* Error Title */}
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                  {scanError.title}
                </h3>

                {/* Error Message */}
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 max-w-[270px] mb-2 leading-relaxed">
                  {scanError.message}
                </p>

                {scanError.subtext && (
                  <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-2">
                    {scanError.subtext}
                  </p>
                )}

                {/* Status Pill */}
                <span className="inline-block bg-[#8B1A1A] text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs mb-3">
                  {scanError.code || 'Alight Error'}
                </span>

                {/* Clear dismiss instruction */}
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="text-xs font-extrabold text-[#8B1A1A] dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Tap ✕ to return to scanning</span>
                </button>
              </div>
            ) : scanSuccess && scanSuccess.action === 'alighted' ? (
              <div className="border-2 border-[#0E7A4A] bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center my-4 relative animate-fade-in overflow-hidden">
                {/* 3s Visual Countdown Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-100 dark:bg-emerald-950/60 overflow-hidden">
                  <div className="h-full bg-[#0E7A4A] animate-shrink-width" />
                </div>

                {/* Initials Avatar */}
                <div className="w-16 h-16 rounded-full bg-[#0E7A4A] text-white flex items-center justify-center font-black text-xl mb-3 shadow-inner">
                  {getInitials(scanSuccess.student.name)}
                </div>

                {/* Name */}
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-0.5 text-center">
                  {scanSuccess.student.name}
                </h3>

                {/* Grade */}
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 mb-3">
                  {scanSuccess.student.grade} &bull; {scanSuccess.student.admissionNumber}
                </p>

                {/* Green Status Pill */}
                <span className="inline-flex items-center gap-1.5 bg-[#0E7A4A] text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-xs">
                  <Icon name="check" className="w-3.5 h-3.5 text-white" />
                  Alighted safely
                </span>

                {/* Temporary Notice */}
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-2">
                  Returning to scanning in 3s...
                </p>
              </div>
            ) : (
              /* Idle State with Glowing Icon */
              <MinderIdleCard onTapToScan={handleSimulateAlight} />
            )}

            {/* Tap Prompt, Sensor Simulator & Test Error Menu */}
            <div className="text-center mt-3">
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-2">
                Tap the next band on the back of the phone
              </p>

              <div className="flex flex-col items-center gap-2 mb-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateAlight}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-[#1D2258] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors mb-0 cursor-pointer"
                  >
                    <Icon name="zap" className="w-3.5 h-3.5 text-[#E70D8D]" />
                    Simulate Band Tap
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAlightingErrorMenu(prev => !prev)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors cursor-pointer"
                    title="Test error states in the card area"
                  >
                    <Icon name="alertTriangle" className="w-3.5 h-3.5 text-red-600" />
                    Test Error ▾
                  </button>
                </div>

                {/* Test error options */}
                {showAlightingErrorMenu && (
                  <div className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/40 rounded-2xl p-2.5 shadow-md flex flex-wrap justify-center gap-1.5 max-w-xs animate-fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAlightingErrorMenu(false);
                        triggerScanError({
                          title: 'Not On Bus',
                          message: 'This student was not marked as boarded on this morning trip.',
                          subtext: 'Verify student presence before alighting.',
                          code: 'NOT_ON_BUS',
                        });
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      Not On Bus
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAlightingErrorMenu(false);
                        triggerScanError({
                          title: 'Already Alighted',
                          message: 'Student has already stepped off and been logged as safely alighted.',
                          subtext: 'Duplicate tap ignored.',
                          code: 'ALREADY_ALIGHTED',
                        });
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      Already Alighted
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAlightingErrorMenu(false);
                        triggerScanError({
                          title: 'Unrecognized Band',
                          message: 'Wristband UID #9B31-0174 is not registered in the school fleet system.',
                          subtext: 'Please check band number or use manual search.',
                          code: 'INVALID_TAG',
                        });
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      Unrecognized Band
                    </button>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-medium text-gray-600 dark:text-slate-400">
                  Wrong child?{' '}
                </span>
                <button
                  type="button"
                  onClick={handleUndoAlighting}
                  className="text-xs font-extrabold text-[#B91C1C] hover:underline cursor-pointer"
                >
                  UNDO
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setManualSearchQuery('');
                setSelectedBulkIds([]);
                setIsFindChildOpen(true);
              }}
              className="text-xs font-bold text-[#1D2258] dark:text-indigo-300 hover:text-[#E70D8D] cursor-pointer"
            >
              Band not working? Find child
            </button>

            <button
              type="button"
              onClick={() => {
                if (studentsStillOnBus.length > 0) {
                  goToStage('bus_empty');
                  showToast('There are still children on board. Please check before ending trip.', 'info');
                } else {
                  setIsAlightingTransitionOpen(true);
                }
              }}
              className="w-full bg-[#1D2258] hover:bg-[#161a46] text-white font-black text-sm py-4 rounded-2xl uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              END TRIP
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN: BUS EMPTY / STUDENTS STILL ON BOARD (Matches Image Left)          */}
      {/* ========================================================================= */}
      {stage === 'bus_empty' && (
        <div className="flex-1 flex flex-col justify-between px-6 pt-3 pb-6 overflow-y-auto animate-fade-in">
          <div>
            {/* Top link to return to alighting scanner if desired */}
            <button
              type="button"
              onClick={() => goToStage('alighting')}
              className="text-xs font-bold text-[#1D2258] dark:text-indigo-300 hover:text-[#E70D8D] flex items-center gap-1 mb-2 cursor-pointer"
            >
              &larr; Back to scanning
            </button>

            {/* Page Header */}
            <h1 className="text-2xl font-black text-[#1D2258] dark:text-white tracking-tight mb-0.5">
              You are at school
            </h1>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-5">
              {boardedCount} children should get off here.
            </p>

            {/* Warning Alert Card (Amber/gold) */}
            {studentsStillOnBus.length > 0 ? (
              <div className="border-2 border-[#C07E00] bg-[#FFF9ED] dark:bg-amber-950/20 rounded-3xl p-5 shadow-xs">
                <h3 className="text-base font-black text-[#8E5200] dark:text-amber-300 mb-0.5">
                  {studentsStillOnBus.length} {studentsStillOnBus.length === 1 ? 'child is' : 'children are'} still on the bus
                </h3>
                <p className="text-xs font-semibold text-[#8E5200]/80 dark:text-amber-400/80 mb-3">
                  Check every seat.
                </p>

                {/* List of unalighted children */}
                <div className="space-y-3">
                  {studentsStillOnBus.map((child) => (
                    <div
                      key={child.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-amber-200/60 dark:border-amber-900/40 animate-fade-in"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#1D2258] text-white font-black text-xs flex items-center justify-center shrink-0">
                          {getInitials(child.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 dark:text-slate-100 truncate">
                            {child.name}
                          </p>
                          <p className="text-xs font-semibold text-gray-400 dark:text-slate-400">
                            {child.grade}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons: Got off / Still on bus */}
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStudents(prev => prev.map(s => s.id === child.id ? { ...s, status: StudentStatus.Alighted } : s));
                            setLastAlightedStudentId(child.id);
                            setAlightingHistory(prev => [...prev, child.id]);
                            showToast(`${child.name} marked as got off!`, 'success');
                          }}
                          className="flex-1 bg-[#0E7A4A] hover:bg-[#0B653D] text-white font-black text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs text-center cursor-pointer active:scale-[0.98]"
                        >
                          Got off
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            showToast(`Please check ${child.name}'s seat! They must get off before ending the trip.`, 'error');
                          }}
                          className="flex-1 bg-[#8B1A1A] hover:bg-[#721515] text-white font-black text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs text-center cursor-pointer active:scale-[0.98]"
                        >
                          Still on bus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20 rounded-3xl p-6 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center mx-auto mb-2">
                  <Icon name="check" className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-green-900 dark:text-green-300">
                  Bus is now empty!
                </h3>
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mt-1">
                  All {boardedCount} children have safely gotten off. You may now complete the trip.
                </p>
              </div>
            )}
          </div>

          {/* Bottom END TRIP Action */}
          <div className="pt-4 flex flex-col items-center">
            {studentsStillOnBus.length > 0 ? (
              <div className="w-full">
                <button
                  type="button"
                  disabled
                  className="w-full bg-[#C5CAD8] dark:bg-slate-800 text-[#8089A0] dark:text-slate-500 font-black text-sm py-4 rounded-2xl uppercase tracking-wider cursor-not-allowed"
                >
                  END TRIP
                </button>
                <p className="text-xs font-medium text-gray-400 dark:text-slate-500 mt-2 text-center">
                  END TRIP opens when the bus is empty.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAlightingTransitionOpen(true)}
                className="w-full bg-[#1D2258] hover:bg-[#161a46] text-white font-black text-sm py-4 rounded-2xl uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                END TRIP
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN: TRIP DONE / MINDER TRIP COMPLETE (Matches Image Right)            */}
      {/* ========================================================================= */}
      {stage === 'summary' && (
        <div className="flex-1 flex flex-col justify-between px-6 pt-10 pb-6 overflow-y-auto bg-[#EFF8F2] dark:bg-slate-950 animate-fade-in">
          <div className="flex flex-col items-center text-center">
            {/* Green Circular OK Badge */}
            <div className="w-24 h-24 rounded-full bg-[#0E7A4A] text-white flex items-center justify-center font-black text-3xl mb-5 shadow-sm">
              OK
            </div>

            {/* Trip Complete Header */}
            <h1 className="text-2xl sm:text-3xl font-black text-[#0E7A4A] tracking-tight mb-1">
              Trip complete
            </h1>

            {/* Well done, Collins */}
            <h2 className="text-base font-bold text-gray-800 dark:text-slate-200 mb-1">
              Well done, {firstName}
            </h2>

            {/* All 10 children accounted for */}
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-8">
              All {totalStudents} children accounted for
            </p>

            {/* 3 Stat Cards in a row: on bus, dropped, absent */}
            <div className="grid grid-cols-3 gap-3 w-full mb-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-center shadow-xs border border-gray-100 dark:border-slate-800">
                <p className="text-2xl font-black text-[#1D2258] dark:text-indigo-300">
                  {boardedCount}
                </p>
                <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-400 mt-1">
                  on bus
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-center shadow-xs border border-gray-100 dark:border-slate-800">
                <p className="text-2xl font-black text-[#1D2258] dark:text-indigo-300">
                  {alightedCount}
                </p>
                <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-400 mt-1">
                  dropped
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-center shadow-xs border border-gray-100 dark:border-slate-800">
                <p className="text-2xl font-black text-[#1D2258] dark:text-indigo-300">
                  {absentCount}
                </p>
                <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-400 mt-1">
                  absent
                </p>
              </div>
            </div>
          </div>

          {/* BACK TO HOME Button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={() => {
                // Reset trip and return to home
                setStudents(MOCK_STUDENTS.map((s, idx) => {
                  if (idx === 0 || idx === 4 || idx === 5) return { ...s, status: StudentStatus.Boarded };
                  return { ...s, status: StudentStatus.NotBoarded };
                }));
                setLastBoardedStudentId('1');
                setBoardingHistory(['5', '6', '1']);
                setLastAlightedStudentId(null);
                setAlightingHistory([]);
                setScanSuccess(null);
                setScanError(null);
                goToStage('home');
              }}
              className="w-full bg-[#1D2258] hover:bg-[#161a46] text-white font-black text-sm py-4 rounded-2xl uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all cursor-pointer"
            >
              BACK TO HOME
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Band Not Working / Find Child Manual Boarding & Alighting          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isFindChildOpen}
        onClose={() => {
          setIsFindChildOpen(false);
          setSelectedBulkIds([]);
        }}
        title={stage === 'alighting' ? 'Manual Alighting' : 'Manual Boarding'}
      >
        <div className="p-2 space-y-3.5">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {stage === 'alighting'
              ? 'Select children individually or choose Select All to alight them in bulk.'
              : 'Select children individually or choose Select All to board them in bulk.'}
          </p>

          {/* Search bar */}
          <div className="relative">
            <Icon name="search" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or admission number..."
              value={manualSearchQuery}
              onChange={(e) => setManualSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E70D8D]"
            />
          </div>

          {/* Bulk Selection Header Bar */}
          {eligibleBulkStudents.length > 0 && (
            <div className="bg-gray-50 dark:bg-slate-850 p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2.5 text-xs font-bold text-gray-800 dark:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllBulkSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-[#0E7A4A] focus:ring-[#0E7A4A] accent-[#0E7A4A] cursor-pointer"
                />
                <span>
                  Select All ({eligibleBulkStudents.length})
                </span>
              </label>

              {selectedBulkIds.length > 0 ? (
                <button
                  type="button"
                  onClick={stage === 'alighting' ? handleBulkAlight : handleBulkBoard}
                  className="bg-[#0E7A4A] hover:bg-[#0B653D] text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="check" className="w-3.5 h-3.5 text-white" />
                  <span>
                    {stage === 'alighting' ? 'Alight' : 'Board'} ({selectedBulkIds.length})
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBulkIds(eligibleBulkStudents.map(s => s.id));
                  }}
                  className="text-xs font-bold text-[#1D2258] dark:text-indigo-300 hover:text-[#E70D8D] cursor-pointer"
                >
                  Pick All
                </button>
              )}
            </div>
          )}

          {/* Student List with Checkboxes */}
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">No students found matching &quot;{manualSearchQuery}&quot;</p>
            ) : (
              filteredStudents.map((child) => {
                const isCurrentlyBoarded = child.status === StudentStatus.Boarded;
                const isCurrentlyAlighted = child.status === StudentStatus.Alighted;
                const isAbsent = child.status === StudentStatus.Absent;
                const isEligible = stage === 'alighting' ? isCurrentlyBoarded : child.status === StudentStatus.NotBoarded;
                const isChecked = selectedBulkIds.includes(child.id);

                return (
                  <div
                    key={child.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isChecked
                        ? 'border-green-400 bg-green-50/50 dark:bg-green-950/20 shadow-xs'
                        : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                    } ${isEligible ? 'hover:border-gray-300' : 'opacity-70'}`}
                  >
                    <label
                      htmlFor={`student-bulk-${child.id}`}
                      className={`flex items-center gap-3 min-w-0 flex-1 ${isEligible ? 'cursor-pointer select-none' : ''}`}
                    >
                      {isEligible ? (
                        <input
                          id={`student-bulk-${child.id}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStudentSelection(child.id)}
                          className="w-4 h-4 rounded text-[#0E7A4A] focus:ring-[#0E7A4A] accent-[#0E7A4A] cursor-pointer shrink-0"
                        />
                      ) : (
                        <div className="w-4 h-4 shrink-0" />
                      )}

                      <div className="w-9 h-9 rounded-full bg-[#1D2258] text-white font-black text-xs flex items-center justify-center shrink-0">
                        {getInitials(child.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-slate-100 leading-tight truncate">
                          {child.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {child.grade} &bull; {child.admissionNumber}
                        </p>
                      </div>
                    </label>

                    <div className="shrink-0 pl-2">
                      {stage === 'boarding' ? (
                        isCurrentlyBoarded ? (
                          <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                            On Bus
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleManualBoard(child.id);
                            }}
                            className="bg-[#0E7A4A] hover:bg-[#0B653D] text-white font-extrabold text-xs py-1.5 px-3 rounded-xl cursor-pointer"
                          >
                            Board
                          </button>
                        )
                      ) : (
                        isCurrentlyAlighted ? (
                          <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            Alighted
                          </span>
                        ) : isAbsent ? (
                          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                            Absent
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleManualAlight(child.id);
                            }}
                            className="bg-[#0E7A4A] hover:bg-[#0B653D] text-white font-extrabold text-xs py-1.5 px-3 rounded-xl cursor-pointer"
                          >
                            Alight
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom sticky action bar when items are selected */}
          {selectedBulkIds.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedBulkIds([])}
                className="py-2.5 px-3.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={stage === 'alighting' ? handleBulkAlight : handleBulkBoard}
                className="flex-1 py-2.5 bg-[#0E7A4A] hover:bg-[#0B653D] text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                {stage === 'alighting' ? 'Alight' : 'Board'} All ({selectedBulkIds.length}) Selected
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Photo Confirmation for "MARK ALL ABSENT"                           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isConfirmAllAbsentOpen}
        onClose={() => setIsConfirmAllAbsentOpen(false)}
        title="Confirm Student Absences"
      >
        <div className="p-2 space-y-4 text-center">
          <p className="text-xs text-gray-600 dark:text-slate-400">
            Please confirm that the following {missingStudents.length} children did not board the bus today:
          </p>

          <div className="grid grid-cols-2 gap-3 max-h-[260px] overflow-y-auto p-1">
            {missingStudents.map((child) => (
              <div
                key={child.id}
                className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden mb-2 border border-red-200">
                  <img
                    src={child.imgUrl}
                    alt={child.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials avatar if image fails
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-xs font-black text-gray-900 dark:text-slate-100 leading-tight">
                  {child.name}
                </p>
                <p className="text-[10px] text-gray-500 font-semibold">
                  {child.grade}
                </p>
                <span className="mt-1 text-[9px] font-bold text-red-700 uppercase tracking-wider">
                  Mark Absent
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsConfirmAllAbsentOpen(false)}
              className="py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAllAbsent}
              className="py-3 rounded-xl bg-[#8B1A1A] text-white font-bold text-xs hover:bg-[#721515]"
            >
              Confirm All Absent
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: More Trips                                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isMoreTripsOpen}
        onClose={() => setIsMoreTripsOpen(false)}
        title="Scheduled Trips"
      >
        <div className="p-2 space-y-3">
          <p className="text-xs text-gray-500">Upcoming routes assigned to {vehicle.registration}:</p>
          {MOCK_ROUTES.map((r, i) => (
            <div
              key={r.id}
              className={`p-3.5 rounded-2xl border ${i === 0 ? 'border-[#E70D8D] bg-pink-50/40' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase text-gray-400">{r.zone}</p>
                  <p className="text-sm font-black text-gray-900">{r.name}</p>
                </div>
                <span className="text-xs font-bold text-[#1D2258]">
                  {r.estimatedDuration}
                </span>
              </div>
            </div>
          ))}
          <button
            onClick={() => setIsMoreTripsOpen(false)}
            className="w-full mt-2 py-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Help / Support                                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Minder Help & Support"
      >
        <div className="p-2 space-y-3 text-sm">
          <p className="text-xs text-gray-600 leading-relaxed">
            Terra GO Minder Mode is designed for rapid student check-in:
          </p>
          <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-xs">
            <p><strong>1. NFC Tap:</strong> Hold the child&apos;s wristband against the back of your phone to check them in.</p>
            <p><strong>2. Undo:</strong> If a wrong band was tapped, tap &quot;Wrong child? UNDO&quot; immediately.</p>
            <p><strong>3. Manual Check-in:</strong> Tap &quot;Band not working? Find child&quot; to search students by name.</p>
            <p><strong>4. Missing List:</strong> When finished, review unaccounted children and verify absences.</p>
          </div>
          <button
            onClick={() => setIsHelpOpen(false)}
            className="w-full mt-3 py-3 bg-[#1D2258] text-white font-bold text-xs rounded-xl"
          >
            Got It
          </button>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Profile & Role Switcher                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title="Minder Profile"
      >
        <div className="p-3 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#1D2258] text-white font-black text-xl flex items-center justify-center mx-auto">
            {getInitials(staff.name)}
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900">{staff.name}</h3>
            <p className="text-xs font-semibold text-gray-500">{staff.role.toUpperCase()} &bull; {staff.phone}</p>
            <p className="text-xs text-gray-400 mt-0.5">{staff.partnerName}</p>
          </div>

          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            {onSwitchRole && (
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  onSwitchRole(staff.role === 'minder' ? 'driver' : 'minder');
                }}
                className="w-full py-3 bg-indigo-50 text-[#1D2258] font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors"
              >
                Switch Role to {staff.role === 'minder' ? 'Driver' : 'Minder'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(false);
                onLogout();
              }}
              className="w-full py-3 bg-red-50 text-red-600 font-bold text-xs rounded-xl hover:bg-red-100 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </Modal>
      {/* ========================================================================= */}
      {/* INTERMEDIARY MODAL SHEET: Transitioning from Boarding to Alighting       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isBoardingTransitionOpen}
        onClose={() => setIsBoardingTransitionOpen(false)}
        title="Switch to Alighting"
      >
        <div className="p-2 space-y-4">
          {/* Boarding Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-[#0E7A4A] dark:text-emerald-400">
                {boardedCount}
              </p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                On Bus
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-[#8B1A1A] dark:text-red-400">
                {absentCount}
              </p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                Absent
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-[#1D2258] dark:text-slate-200">
                {totalStudents}
              </p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                Total
              </p>
            </div>
          </div>

          {/* Wide CTA for Proceed to Alighting */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsBoardingTransitionOpen(false);
                goToStage('alighting');
              }}
              className="w-full bg-[#E70D8D] hover:bg-[#d0097d] text-white font-extrabold text-sm py-3.5 rounded-xl uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Proceed to Alighting</span>
              <Icon name="arrowRight" className="w-4 h-4 text-white" />
            </button>

            <button
              type="button"
              onClick={() => setIsBoardingTransitionOpen(false)}
              className="w-full py-2.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* INTERMEDIARY MODAL SHEET: Transitioning from Alighting to Trip Summary   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAlightingTransitionOpen}
        onClose={() => setIsAlightingTransitionOpen(false)}
        title="Trip Summary"
      >
        <div className="p-2 space-y-4">
          {/* Alighting Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-[#0E7A4A] dark:text-emerald-400">
                {alightedCount}
              </p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                Alighted
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {studentsStillOnBus.length}
              </p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                On Bus
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-[#1D2258] dark:text-slate-200">
                {absentCount}
              </p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                Absent
              </p>
            </div>
          </div>

          {studentsStillOnBus.length > 0 && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs font-semibold text-amber-800 dark:text-amber-300 text-center">
              {studentsStillOnBus.length} child still on bus.
            </div>
          )}

          {/* Wide CTA for Proceed to Trip Summary */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsAlightingTransitionOpen(false);
                goToStage('summary');
              }}
              className="w-full bg-[#1D2258] hover:bg-[#161a46] text-white font-extrabold text-sm py-3.5 rounded-xl uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Proceed to Trip Summary</span>
              <Icon name="arrowRight" className="w-4 h-4 text-white" />
            </button>

            <button
              type="button"
              onClick={() => setIsAlightingTransitionOpen(false)}
              className="w-full py-2.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
