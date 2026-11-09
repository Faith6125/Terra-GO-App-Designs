

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Student, Trip, TripType, StudentStatus, Issue, IssueType, Guardian, ToastType, TripHistoryItem, VerificationHistoryItem, GpsStatus, DataUsageItem, Coordinates, Route, ScheduledTrip, GateLocation, IconName, StaffMember } from './types';
import { MOCK_STUDENTS, GATE_MOCK_STUDENTS, MOCK_DRIVER, MOCK_GUARDIAN, MOCK_TRIP_HISTORY, MOCK_VERIFICATION_HISTORY, MOCK_DATA_USAGE_HISTORY, MOCK_ROUTES, MOCK_GATE_LOCATIONS, MOCK_ASSIGNED_VEHICLES, MOCK_STAFF_MEMBERS } from './constants';
import { Icon } from './components/Icon';
import { Modal } from './components/Modal';
import { MapModal } from './components/MapModal';
import { Toast } from './components/Toast';
import { Spinner } from './components/Spinner';
import { Skeleton } from './components/Skeleton';
import { useVehicle } from './components/VehicleContext';
import { LoginScreen } from './components/LoginScreen';
import { MinderFlow } from './components/MinderFlow';




const APP_VERSION = '1.2.4';
const DEVICE_SIGNATURE = 'TG-DRV-8829-XPL';
const STORAGE_KEY_ACTIVE_TRIP = 'terra_go_active_trip_v1';
const STORAGE_KEY_LOGGED_OUT = 'terra_go_logged_out_v1';
const STORAGE_KEY_CURRENT_STAFF = 'terra_go_current_staff_v1';

const SystemStatusBanner: React.FC<{ message: string; icon: IconName; className: string; }> = ({ message, icon, className }) => (
    <div className={`absolute top-8 left-0 right-0 z-[60] p-2 text-white text-xs font-bold text-center ${className} animate-fade-in`}>
        <div className="flex items-center justify-center gap-2">
            <Icon name={icon} className="w-4 h-4" />
            <span>{message}</span>
        </div>
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(-100%); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in { animation: fade-in 0.3s ease-out; }
        `}</style>
    </div>
);


const StudentAlert: React.FC<{ alertText: string }> = ({ alertText }) => (
    <div className="mt-2 flex items-center gap-1.5 bg-pink-50 dark:bg-pink-950/20 border-l-4 border-[#E70D8D] px-2 py-1">
        <Icon name="alertTriangle" className="w-4 h-4 text-[#E70D8D] dark:text-pink-400 flex-shrink-0" />
        <p className="text-xs font-semibold text-[#E70D8D] dark:text-pink-300">{alertText}</p>
    </div>
);

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

const ProfileAvatar: React.FC<{ name: string; imgUrl?: string | null; className?: string; sizeClassName?: string; textSizeClassName?: string }> = ({ 
    name, 
    imgUrl, 
    className = "", 
    sizeClassName = "w-12 h-12",
    textSizeClassName = "text-sm"
}) => {
    if (imgUrl) {
        return <img src={imgUrl} alt={name} className={`${sizeClassName} rounded-full border-2 border-[#E70D8D] p-0.5 object-cover ${className}`} referrerPolicy="no-referrer" />;
    }
    
    return (
        <div className={`${sizeClassName} rounded-full border-2 border-[#E70D8D] bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center ${className}`}>
            <span className={`text-[#E70D8D] dark:text-pink-450 font-black tracking-tight ${textSizeClassName}`}>{getInitials(name)}</span>
        </div>
    );
};

// Helper component for status badges
const StatusBadge: React.FC<{ status: StudentStatus }> = ({ status }) => {
    const statusStyles: Record<StudentStatus, string> = {
        [StudentStatus.NotBoarded]: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-350',
        [StudentStatus.Boarded]: 'bg-blue-50 dark:bg-blue-950/40 text-[#303690] dark:text-indigo-300',
        [StudentStatus.Alighted]: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300',
        [StudentStatus.Absent]: 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300',
        [StudentStatus.InSchool]: 'bg-blue-50 dark:bg-blue-950/40 text-[#303690] dark:text-indigo-300',
        [StudentStatus.NotArrived]: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-355',
        [StudentStatus.LeftSchool]: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300',
    };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>;
};

const EmptyState: React.FC<{ message: string; icon?: IconName; onRefresh?: () => void; isRefreshing?: boolean }> = ({ message, icon = 'fileText', onRefresh, isRefreshing }) => (
    <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-slate-500 mt-8">
        <div className="bg-gray-50 dark:bg-slate-900 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <Icon name={icon} className="w-10 h-10 text-gray-300 dark:text-slate-600"/>
        </div>
        <p className="font-semibold text-gray-500 dark:text-slate-400 mb-6">{message}</p>
        {onRefresh && (
            <button 
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 bg-[#E70D8D] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 text-sm"
            >
                {isRefreshing ? <Spinner className="w-4 h-4 text-white" /> : <Icon name="refreshCw" className="w-4 h-4" />}
                {isRefreshing ? 'Pulling Data...' : 'Refresh Data'}
            </button>
        )}
    </div>
);

const SplashScreen: React.FC = () => (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url("https://terrago-web.ams3.cdn.digitaloceanspaces.com/mobile/Backgrounds%20OFF%20PINK-01.png")' }}>
        <div className="w-24 h-24">
            <Icon name="logo" className="w-full h-full" />
        </div>
    </div>
);

const GateLocationSelectionScreen: React.FC<{ onSelectLocation: (location: GateLocation) => void; onBack: () => void; }> = ({ onSelectLocation, onBack }) => {
    const [hasData, setHasData] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setHasData(true);
            setIsRefreshing(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
            <Header title="Select Location" onBack={onBack} />
            <div className="flex-grow overflow-y-auto min-h-0 p-4 space-y-4">
                {!hasData ? (
                    <EmptyState 
                        message="No fixed locations available. Tap refresh to pull location data." 
                        icon="mapPin" 
                        onRefresh={handleRefresh}
                        isRefreshing={isRefreshing}
                    />
                ) : (
                    MOCK_GATE_LOCATIONS.map(location => (
                        <button
                            key={location.id}
                            className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 flex items-center justify-between text-left transition-all hover:shadow-md hover:border-[#E70D8D] dark:hover:border-pink-500"
                            onClick={() => onSelectLocation(location)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center flex-shrink-0">
                                    <Icon name={location.icon} className="w-8 h-8 text-[#E70D8D] dark:text-pink-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">{location.name}</h2>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">{location.description}</p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{location.studentCount} students assigned</p>
                                </div>
                            </div>
                            <Icon name="chevronRight" className="w-5 h-5 text-gray-400 dark:text-slate-650" />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

// Main App Component
const App: React.FC = () => {
    const [isSplashVisible, setIsSplashVisible] = useState(false);
    const [screen, setScreen] = useState<Screen>(() => {
        const isExplicitlyLoggedOut = localStorage.getItem(STORAGE_KEY_LOGGED_OUT) === 'true';
        if (isExplicitlyLoggedOut) {
            return Screen.Login;
        }
        return Screen.Home;
    });
    const [isLoadingScreen, setIsLoadingScreen] = useState(false);
    const [isDeviceRegistered, setIsDeviceRegistered] = useState(true);
    const [currentStaff, setCurrentStaff] = useState<StaffMember>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CURRENT_STAFF);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error(e);
        }
        return MOCK_STAFF_MEMBERS[0];
    });
    const [activeTrip, setActiveTrip] = useState<Trip | null>(() => {
        const savedTrip = localStorage.getItem(STORAGE_KEY_ACTIVE_TRIP);
        if (savedTrip) {
            try {
                const parsed = JSON.parse(savedTrip) as Trip;
                // Hydrate Date objects
                parsed.startTime = new Date(parsed.startTime);
                parsed.endTime = parsed.endTime ? new Date(parsed.endTime) : new Date();
                parsed.students = parsed.students.map((s: Student) => ({
                    ...s,
                    lastUpdateTime: s.lastUpdateTime ? new Date(s.lastUpdateTime) : undefined
                }));
                parsed.issues = parsed.issues.map((i: Issue) => ({
                    ...i,
                    timestamp: new Date(i.timestamp)
                }));
                return parsed;
            } catch (e) {
                console.error("Failed to load persisted trip:", e);
                localStorage.removeItem(STORAGE_KEY_ACTIVE_TRIP);
            }
        }
        // Completed trip for Trip Summary view
        const startTime = new Date(Date.now() - 42 * 60 * 1000);
        const endTime = new Date();
        const students = MOCK_STUDENTS.map((s, index) => {
            if (index === 0) return { ...s, status: StudentStatus.Absent, lastUpdateTime: startTime };
            return { ...s, status: StudentStatus.Alighted, lastUpdateTime: new Date(startTime.getTime() + (index + 2) * 2 * 60 * 1000) };
        });
        return {
            type: 'Morning',
            title: 'Morning Trip',
            route: MOCK_ROUTES[0],
            startTime,
            endTime,
            students,
            issues: [],
        };
    });
    const [selectedTripType, setSelectedTripType] = useState<TripType | null>(null);
    const [selectedTripTitle, setSelectedTripTitle] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [modal, setModal] = useState<'delay' | 'otp' | 'version' | 'logout' | 'dateRange' | 'verificationDetails' | 'dataHistory' | 'map' | 'registerDevice' | 'otaUpdate' | 'resumeTrip' | null>(null);
    const [historyType, setHistoryType] = useState<'trip' | 'verification'>('trip');
    const [selectedTripReport, setSelectedTripReport] = useState<TripHistoryItem | null>(null);
    const [selectedVerification, setSelectedVerification] = useState<VerificationHistoryItem | null>(null);
    const [customDateRange, setCustomDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
    const [gpsStatus, setGpsStatus] = useState<GpsStatus>('inactive');
    const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
    const [dataUsage, setDataUsage] = useState(12.4); // Simulated data usage in MB
    const [dataUsageHistory, setDataUsageHistory] = useState(MOCK_DATA_USAGE_HISTORY);
    const [otaStatus, setOtaStatus] = useState<'available' | 'downloading' | 'installing' | 'up-to-date'>('available');
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('terra_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    notifications: parsed.notifications !== undefined ? parsed.notifications : true,
                    offlineMode: parsed.offlineMode !== undefined ? parsed.offlineMode : false,
                    darkMode: parsed.darkMode !== undefined ? parsed.darkMode : false,
                };
            }
        } catch (e) {
            console.error(e);
        }
        return {
            notifications: true,
            offlineMode: false,
            darkMode: false,
        };
    });

    useEffect(() => {
        const rootElement = document.documentElement;
        const phoneScreen = document.querySelector('.phone-screen');
        if (settings.darkMode) {
            rootElement.classList.add('dark');
            phoneScreen?.classList.add('dark');
        } else {
            rootElement.classList.remove('dark');
            phoneScreen?.classList.remove('dark');
        }
    }, [settings.darkMode]);

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [batteryStatus, setBatteryStatus] = useState<{ level: number, charging: boolean } | null>(null);
    const [selectedGateLocation, setSelectedGateLocation] = useState<GateLocation | null>(null);

    // Update Nag Logic
    const [updateDismissalCount, setUpdateDismissalCount] = useState(0);
    const [showFloatingUpdateAlert, setShowFloatingUpdateAlert] = useState(false);
    
    // Scanned student popup control
    const [scannedStudent, setScannedStudent] = useState<{student: Student, status: StudentStatus} | null>(null);
    const scannedStudentTimeoutRef = useRef<number | null>(null);

    // Splash screen timer
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsSplashVisible(false);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    // Load persisted trip on mount - handled in useState initializer
    
    // Persist trip changes
    useEffect(() => {
        if (activeTrip) {
            localStorage.setItem(STORAGE_KEY_ACTIVE_TRIP, JSON.stringify(activeTrip));
        } else {
            localStorage.removeItem(STORAGE_KEY_ACTIVE_TRIP);
        }
    }, [activeTrip]);

    // Check for device registration on load
    useEffect(() => {
        if (!isDeviceRegistered && screen === Screen.Login) {
            const timer = setTimeout(() => {
                setModal('registerDevice');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isDeviceRegistered, screen]);

    // Update nag interval effect
    useEffect(() => {
        let intervalId: number;
        if (isDeviceRegistered && otaStatus === 'available' && updateDismissalCount < 3) {
            intervalId = window.setInterval(() => {
                setShowFloatingUpdateAlert(true);
            }, 15000); // 15 seconds
        }
        return () => {
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [isDeviceRegistered, otaStatus, updateDismissalCount]);

    // Simulating GPS tracking with robust iframe/permission fallback
    useEffect(() => {
        let watchId: number;
        let fallbackIntervalId: number;
        
        if (screen === Screen.ActiveTrip) {
            // Set GPS status asynchronously to avoid cascading renders linter warning
            setTimeout(() => {
                setGpsStatus('active');
            }, 0);
            
            const startSimulation = () => {
                console.log('Starting simulated GPS track.');
                let index = 0;
                const path = [
                    { lat: -1.2642, lon: 36.8041 },
                    { lat: -1.2685, lon: 36.7924 },
                    { lat: -1.2721, lon: 36.7831 },
                    { lat: -1.2651, lon: 36.7930 },
                    { lat: -1.2789, lon: 36.7728 },
                    { lat: -1.2845, lon: 36.7625 },
                    { lat: -1.2825, lon: 36.8115 },
                    { lat: -1.2798, lon: 36.7952 },
                    { lat: -1.2882, lon: 36.7915 },
                    { lat: -1.2942, lon: 36.7865 },
                    { lat: -1.2985, lon: 36.7825 },
                ];
                setCurrentLocation(path[0]);
                
                fallbackIntervalId = window.setInterval(() => {
                    index = (index + 1) % path.length;
                    setCurrentLocation(path[index]);
                }, 4000);
            };

            if (navigator.geolocation) {
                try {
                    watchId = navigator.geolocation.watchPosition(
                        (position) => {
                            setCurrentLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
                        },
                        (error) => {
                            console.log('Geolocation unavailable, using simulated track.', error?.message || '');
                            startSimulation();
                        },
                        { enableHighAccuracy: true, timeout: 5000 }
                    );
                } catch (e) {
                    console.log('Error starting geolocation watch, using simulated track.', e);
                    startSimulation();
                }
            } else {
                startSimulation();
            }
        }
        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
            if (fallbackIntervalId) {
                window.clearInterval(fallbackIntervalId);
            }
            setGpsStatus('inactive');
            setCurrentLocation(null);
        };
    }, [screen]);

    // Simulate data usage accumulation
    useEffect(() => {
        const interval = setInterval(() => {
            setDataUsage(prev => +(prev + 0.01).toFixed(2));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ message, type });
    };
    
    // Effect for internet connectivity
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            showToast('Internet connection restored.', 'success');
        };
        const handleOffline = () => {
            setIsOnline(false);
            showToast('Internet connection lost.', 'error');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Effect for battery status
    useEffect(() => {
        interface BatteryManager extends EventTarget {
            level: number;
            charging: boolean;
        }
        
        let batteryManager: BatteryManager | null = null;
        
        const updateBatteryStatus = () => {
            if (batteryManager) {
                setBatteryStatus({
                    level: batteryManager.level,
                    charging: batteryManager.charging
                });
            }
        };

        if ('getBattery' in navigator) {
            (navigator as unknown as { getBattery: () => Promise<BatteryManager> }).getBattery().then((bm: BatteryManager) => {
                batteryManager = bm;
                updateBatteryStatus();

                batteryManager.addEventListener('levelchange', updateBatteryStatus);
                batteryManager.addEventListener('chargingchange', updateBatteryStatus);
            });
        }

        return () => {
            if (batteryManager) {
                batteryManager.removeEventListener('levelchange', updateBatteryStatus);
                batteryManager.removeEventListener('chargingchange', updateBatteryStatus);
            }
        };
    }, []);

    const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            localStorage.setItem('terra_settings', JSON.stringify(next));
            return next;
        });
        showToast(`${String(key).charAt(0).toUpperCase() + String(key).slice(1)} updated.`, 'info');
    };

    const handleResetDataUsage = () => {
        setDataUsage(0);
        setDataUsageHistory([]);
        showToast('Data usage history has been reset.', 'info');
    };

    const navigate = (newScreen: Screen) => {
        const screensWithLoaders = [
            Screen.Home, 
            Screen.ActiveTrip, 
            Screen.GateAttendance, 
            Screen.Profile, 
            Screen.History, 
            Screen.TripReport, 
            Screen.Settings, 
            Screen.TripSelection, 
            Screen.RouteSelection,
            Screen.TripSummary,
            Screen.SelectGateLocation
        ];
        if (newScreen === Screen.ActiveTrip) setGpsStatus('active');
        if (screensWithLoaders.includes(newScreen)) {
            setScreen(newScreen);
            setIsLoadingScreen(true);
            setTimeout(() => {
                setIsLoadingScreen(false);
            }, 1000); // Simulate loading
        } else {
            setScreen(newScreen);
        }
    };
    
    const handleLogin = (success: boolean, staff?: StaffMember) => {
        if (staff) {
            setCurrentStaff(staff);
            try {
                localStorage.setItem(STORAGE_KEY_CURRENT_STAFF, JSON.stringify(staff));
            } catch (e) {
                console.error(e);
            }
        }
        if (!isDeviceRegistered) {
            setModal('registerDevice');
            return;
        }
        if (success) {
            localStorage.removeItem(STORAGE_KEY_LOGGED_OUT);
            const userRole = staff?.role || currentStaff.role;
            if (userRole === 'minder') {
                navigate(Screen.Home);
            } else {
                navigate(Screen.DriverConfirmation);
            }
        }
    };

    const handleTripTypeSelection = (type: TripType, title?: string) => {
        setSelectedTripType(type);
        setSelectedTripTitle(title || null);
        navigate(Screen.RouteSelection);
    };

    const startTrip = (route: Route) => {
        // Validation: If there's an active trip, we check if it's the same one
        if (activeTrip) {
            if (activeTrip.route.id === route.id && activeTrip.type === selectedTripType) {
                setModal('resumeTrip');
                return;
            } else {
                showToast(`Complete your ongoing trip on ${activeTrip.route.name} (${activeTrip.title || `${activeTrip.type} Trip`}) first.`, "error");
                return;
            }
        }
        
        if (route.studentCount === 0) {
            showToast(`Cannot start trip. No students assigned to the ${route.name} route.`, 'error');
            return;
        }

        if (!selectedTripType) return;
        const students = MOCK_STUDENTS.map(s => ({...s, status: StudentStatus.NotBoarded}));
        setActiveTrip({
            type: selectedTripType,
            title: selectedTripTitle || `${selectedTripType} Trip`,
            route: route,
            startTime: new Date(),
            students,
            issues: [],
        });
        navigate(Screen.ActiveTrip);
    };

    const updateStudentStatus = (studentId: string, newStatus: StudentStatus) => {
        if (activeTrip) {
            setActiveTrip(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    students: prev.students.map(s => s.id === studentId ? { ...s, status: newStatus, lastUpdateTime: new Date() } : s),
                };
            });
        }
    };
    
    const endTrip = () => {
        setActiveTrip(prev => prev ? { ...prev, endTime: new Date() } : null);
        // Persistence is cleared when user hits "Submit Report" or "Done" in summary screen
        navigate(Screen.TripSummary);
    };
    
    const reportIssue = (issue: Issue) => {
        setActiveTrip(prev => prev ? { ...prev, issues: [...prev.issues, issue] } : null);
        setModal(null);
        if (issue.recipientType === 'parent') {
            const count = issue.selectedStudentIds?.length || issue.recipientCount || 0;
            showToast(`Notification sent directly to ${count} parent${count === 1 ? '' : 's'}: ${issue.type}`, 'success');
        } else {
            showToast(`Report submitted to school: ${issue.type}`, 'success');
        }
    };

    const handleSetScannedStudent = (data: {student: Student, status: StudentStatus} | null, silent: boolean = false) => {
        if (scannedStudentTimeoutRef.current) {
            window.clearTimeout(scannedStudentTimeoutRef.current);
            scannedStudentTimeoutRef.current = null;
        }
        
        if (silent) {
            setScannedStudent(null);
            return;
        }

        setScannedStudent(data);

        if (data) {
            scannedStudentTimeoutRef.current = window.setTimeout(() => {
                setScannedStudent(null);
            }, 3000);
        }
    };

    const renderScreen = () => {
        if (isLoadingScreen) {
           switch (screen) {
                case Screen.Home: return <HomeScreenSkeleton />;
                case Screen.TripSelection: return <TripSelectionSkeleton />;
                case Screen.ActiveTrip:
                case Screen.GateAttendance: return <StudentListSkeleton />;
                case Screen.SelectGateLocation: return <LocationSelectionSkeleton />;
                case Screen.Profile: return <ProfileScreenSkeleton />;
                case Screen.History: return <HistoryScreenSkeleton />;
                case Screen.TripSummary:
                case Screen.TripReport: return <TripSummarySkeleton />;
                case Screen.Settings: return <SettingsScreenSkeleton />;
                case Screen.RouteSelection: return <RouteSelectionSkeleton />;
                default: return <div className="h-full w-full flex items-center justify-center"><Spinner className="w-10 h-10 text-[#303690]"/></div>;
            }
        }

        if (screen === Screen.Login) {
            return <LoginScreen onLogin={handleLogin} version={APP_VERSION} onVersionClick={() => setModal('version')} deviceSignature={DEVICE_SIGNATURE} />;
        }

        // Dedicated Minder Experience for Minder Role
        if (currentStaff.role === 'minder') {
            return (
                <MinderFlow
                    staff={currentStaff}
                    onLogout={() => {
                        setModal(null);
                        setActiveTrip(null);
                        localStorage.setItem(STORAGE_KEY_LOGGED_OUT, 'true');
                        setScreen(Screen.Login);
                    }}
                    showToast={showToast}
                    onSwitchRole={(newRole) => {
                        const updated = { ...currentStaff, role: newRole };
                        setCurrentStaff(updated);
                        try {
                            localStorage.setItem(STORAGE_KEY_CURRENT_STAFF, JSON.stringify(updated));
                        } catch (e) {
                            console.error(e);
                        }
                        showToast(`Switched role to ${newRole === 'minder' ? 'Minder' : 'Driver'}`, 'info');
                    }}
                />
            );
        }

        switch (screen) {
            case Screen.DriverConfirmation: return <DriverConfirmationScreen onConfirm={() => navigate(Screen.Home)} version={APP_VERSION} onVersionClick={() => setModal('version')} staff={currentStaff} />;
            case Screen.Home: return <HomeScreen navigate={navigate} setHistoryType={setHistoryType} onVersionClick={() => setModal('version')} activeTrip={activeTrip} staff={currentStaff} onSwitchRole={(newRole) => {
                const updated = { ...currentStaff, role: newRole };
                setCurrentStaff(updated);
                try {
                    localStorage.setItem(STORAGE_KEY_CURRENT_STAFF, JSON.stringify(updated));
                } catch (e) {
                    console.error(e);
                }
                showToast(`Switched to ${newRole === 'minder' ? 'Minder' : 'Driver'} mode`, 'info');
            }} />;
            case Screen.TripSelection: return <TripSelectionScreen onSelectTripType={handleTripTypeSelection} onBack={() => navigate(Screen.Home)} showToast={showToast} />;
            case Screen.RouteSelection: return <RouteSelectionScreen onSelectRoute={startTrip} onBack={() => navigate(Screen.TripSelection)} activeTrip={activeTrip} selectedTripType={selectedTripType} />;
            case Screen.ActiveTrip: 
                return activeTrip && <ActiveTripScreen 
                    trip={activeTrip} 
                    onEndTrip={endTrip} 
                    onUpdateStudent={updateStudentStatus} 
                    onReportIssue={() => setModal('delay')} 
                    showToast={showToast}
                    gpsStatus={gpsStatus}
                    onGpsClick={() => setModal('map')}
                    setActiveTrip={setActiveTrip}
                    onScanned={handleSetScannedStudent}
                    onBack={() => navigate(Screen.RouteSelection)}
                    onOpenSupport={() => navigate(Screen.Support)}
                />;
            case Screen.TripSummary:
                return activeTrip && <TripSummaryScreen trip={activeTrip} onDone={() => { setActiveTrip(null); navigate(Screen.Home);}} onBack={() => navigate(Screen.ActiveTrip)} showToast={showToast} />;
            case Screen.SelectGateLocation:
                return <GateLocationSelectionScreen onBack={() => navigate(Screen.Home)} onSelectLocation={(location) => { setSelectedGateLocation(location); navigate(Screen.GateAttendance); }} />;
            case Screen.GateAttendance:
                return <GateAttendanceScreen onBack={() => navigate(Screen.SelectGateLocation)} onGuardianVerify={() => setModal('otp')} showToast={showToast} onScanned={handleSetScannedStudent} selectedGateLocation={selectedGateLocation} />;
            case Screen.Profile:
                return <ProfileScreen onBack={() => navigate(Screen.Home)} onLogoutClick={() => setModal('logout')} onSettingsClick={() => navigate(Screen.Settings)} staff={currentStaff} />;
            case Screen.Settings:
                 return <SettingsScreen 
                    onBack={() => navigate(Screen.Profile)}
                    settings={settings}
                    onSettingChange={handleSettingChange}
                    dataUsage={dataUsage}
                    onOpenDataHistory={() => setModal('dataHistory')}
                    otaStatus={otaStatus}
                    onOpenOTA={() => setModal('otaUpdate')}
                    onOpenSupport={() => navigate(Screen.Support)}
                />;
            case Screen.Support:
                return <SupportScreen onBack={() => navigate(Screen.Settings)} />;
            case Screen.BandIdentification:
                return <BandIdentificationScreen onBack={() => navigate(Screen.Home)} showToast={showToast} />;
            case Screen.History:
                return <HistoryScreen 
                    onBack={() => navigate(Screen.Home)} 
                    initialTab={historyType} 
                    onSelectTrip={(trip) => {
                        setSelectedTripReport(trip);
                        navigate(Screen.TripReport);
                    }}
                    onSelectVerification={(verification) => {
                        setSelectedVerification(verification);
                        setModal('verificationDetails');
                    }}
                    customDateRange={customDateRange}
                    onOpenDateRangePicker={() => setModal('dateRange')}
                    setCustomDateRange={setCustomDateRange}
                />;
            case Screen.TripReport:
                return selectedTripReport && <TripReportScreen trip={selectedTripReport} onClose={() => navigate(Screen.History)} />;
            default: return <LoginScreen onLogin={handleLogin} version={APP_VERSION} onVersionClick={() => setModal('version')} deviceSignature={DEVICE_SIGNATURE} />;
        }
    };

    const showLowBatteryWarning = batteryStatus && batteryStatus.level <= 0.20 && !batteryStatus.charging;

    return (
        <div className="h-full w-full bg-gray-50 dark:bg-slate-950 font-sans flex flex-col relative pt-8 text-gray-800 dark:text-slate-100 transition-colors duration-200">
            {isSplashVisible && <SplashScreen />}
            {!isOnline && (
                <SystemStatusBanner 
                    message="No Internet Connection" 
                    icon="wifiOff" 
                    className="bg-red-600"
                />
            )}
            {showLowBatteryWarning && (
                <SystemStatusBanner
                    message={`Low Battery: ${(batteryStatus.level * 100).toFixed(0)}% remaining`}
                    icon="alertTriangle"
                    className="bg-yellow-500"
                />
            )}
            {renderScreen()}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <DeviceRegistrationModal 
                isOpen={modal === 'registerDevice'} 
                onClose={() => setModal(null)} 
                onRegister={() => {
                    setIsDeviceRegistered(true);
                    setModal(null);
                    showToast('Device successfully registered on Terra GO.');
                }}
            />
            {modal === 'delay' && (
                <DelayReportModal 
                    isOpen={true} 
                    onClose={() => setModal(null)} 
                    onReport={reportIssue} 
                    students={activeTrip?.students || MOCK_STUDENTS}
                />
            )}
            <GuardianOtpModal 
                isOpen={modal === 'otp'} 
                onClose={() => setModal(null)} 
                onSuccess={() => {
                    // Success is now handled within the modal UI
                }}
            />
            <VersionInfoModal isOpen={modal === 'version'} onClose={() => setModal(null)} />
            <LogoutConfirmationModal 
                isOpen={modal === 'logout'}
                onClose={() => setModal(null)}
                onConfirm={() => {
                    setModal(null);
                    setActiveTrip(null);
                    localStorage.setItem(STORAGE_KEY_LOGGED_OUT, 'true');
                    setScreen(Screen.Login); 
                }}
            />
             <DateRangePickerModal
                key={modal === 'dateRange' ? 'open' : 'closed'}
                isOpen={modal === 'dateRange'}
                onClose={() => setModal(null)}
                onApply={(start, end) => {
                    setCustomDateRange({ start, end });
                    setModal(null);
                }}
                initialRange={customDateRange}
            />
            <VerificationDetailsModal
                isOpen={modal === 'verificationDetails'}
                onClose={() => setModal(null)}
                verification={selectedVerification}
            />
            <DataUsageHistoryModal
                isOpen={modal === 'dataHistory'}
                onClose={() => setModal(null)}
                history={dataUsageHistory}
                onReset={handleResetDataUsage}
            />
            <MapModal 
                isOpen={modal === 'map'}
                onClose={() => setModal(null)}
                location={currentLocation}
                trip={activeTrip}
                gpsStatus={gpsStatus}
                isDarkMode={settings.darkMode}
                onGpsStatusChange={setGpsStatus}
                onUpdateStudentStatus={updateStudentStatus}
            />
            <OTAUpdateModal 
                isOpen={modal === 'otaUpdate'} 
                onClose={() => setModal(null)} 
                onSuccess={() => {
                    setOtaStatus('up-to-date');
                    setModal(null);
                    setShowFloatingUpdateAlert(false);
                    showToast('App updated successfully!', 'success');
                }}
            />
            <ResumeTripModal 
                isOpen={modal === 'resumeTrip'} 
                onClose={() => setModal(null)} 
                activeTrip={activeTrip}
                onResume={() => {
                    setModal(null);
                    navigate(Screen.ActiveTrip);
                }}
            />

            {/* Global Update Alert Nag */}
            <FloatingUpdateAlert 
                isVisible={showFloatingUpdateAlert} 
                onUpdate={() => {
                    setShowFloatingUpdateAlert(false);
                    setModal('otaUpdate');
                }}
                onDismiss={() => {
                    setShowFloatingUpdateAlert(false);
                    setUpdateDismissalCount(prev => prev + 1);
                }}
            />

            {/* Scanned Student Success Notification Popup */}
            {scannedStudent && (
                <NfcSuccessModal 
                    key={`${scannedStudent.student.id}-${scannedStudent.status}`}
                    student={scannedStudent.student} 
                    status={scannedStudent.status} 
                    onDismiss={() => setScannedStudent(null)} 
                />
            )}
        </div>
    );
};

const ResumeTripModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    activeTrip: Trip | null;
    onResume: () => void;
}> = ({ isOpen, onClose, activeTrip, onResume }) => {
    if (!activeTrip) return null;
    
    const tripDisplayName = activeTrip.title || `${activeTrip.type} Trip`;
    const progress = activeTrip.students.filter(s => [StudentStatus.Boarded, StudentStatus.Alighted].includes(s.status)).length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Resume Trip?">
            <div className="flex flex-col items-center py-2 text-center">
                <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Icon name="bus" className="w-8 h-8 text-[#303690] dark:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Trip in Progress Detected</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm mb-6 px-4">
                    You have an ongoing <span className="font-bold text-[#E70D8D]">{tripDisplayName}</span> on the <span className="font-bold text-[#303690] dark:text-indigo-400">{activeTrip.route.name}</span> route.
                </p>
                <div className="bg-gray-50 dark:bg-slate-800 w-full p-4 rounded-2xl border border-gray-100 dark:border-slate-700 mb-8 text-left space-y-2.5">
                     <div className="flex justify-between items-center text-xs">
                         <span className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Trip Name</span>
                         <span className="font-bold text-[#E70D8D] bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded-md border border-pink-100 dark:border-pink-900/30">{tripDisplayName}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                         <span className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Route</span>
                         <span className="font-bold text-gray-800 dark:text-slate-200">{activeTrip.route.name}</span>
                     </div>
                     <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                         <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Current Progress</p>
                         <p className="text-2xl font-black text-[#303690] dark:text-white">{progress} <span className="text-sm font-medium text-gray-400 dark:text-slate-400">/ {activeTrip.students.length} students processed</span></p>
                     </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                    <button onClick={onClose} className="py-4 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold text-sm uppercase tracking-wide">
                        Not Now
                    </button>
                    <button onClick={onResume} className="py-4 rounded-2xl bg-[#E70D8D] text-white font-bold shadow-lg shadow-pink-200 dark:shadow-none text-sm uppercase tracking-wide">
                        Resume Trip
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const FloatingUpdateAlert: React.FC<{ isVisible: boolean; onUpdate: () => void; onDismiss: () => void; }> = ({ isVisible, onUpdate, onDismiss }) => {
    if (!isVisible) return null;
    return (
        <div className="absolute bottom-6 left-4 right-4 z-[90] animate-slide-up-alert">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_10px_30px_rgba(48,54,144,0.15)] border border-pink-50 dark:border-slate-800 p-4 flex items-center gap-4">
                <div className="bg-pink-100 dark:bg-pink-950/40 p-3 rounded-xl text-[#E70D8D] dark:text-pink-400">
                    <Icon name="zap" className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex-grow">
                    <p className="text-sm font-bold text-[#303690] dark:text-white">New Update Ready!</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Get the latest features now.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onDismiss} className="px-3 py-2 text-xs font-bold text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-350 transition-colors uppercase tracking-tight">Later</button>
                    <button onClick={onUpdate} className="bg-[#E70D8D] text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-pink-100 dark:shadow-none hover:opacity-90 transition-all uppercase tracking-tight">Update</button>
                </div>
            </div>
            <style>{`
                @keyframes slide-up-alert {
                    from { transform: translateY(120%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up-alert { animation: slide-up-alert 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            `}</style>
        </div>
    );
};
const Header: React.FC<{ title: string; onBack?: () => void; showProfile?: boolean; navigate?: (screen: Screen) => void; pinkAccent?: boolean; onHelp?: () => void; }> = ({ title, onBack, showProfile, navigate, pinkAccent, onHelp }) => (
    <div className={`p-4 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b pb-4 ${pinkAccent ? 'bg-white dark:bg-slate-900 border-pink-100 dark:border-pink-950/40' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'}`}>
        <div className="w-20">
            {onBack && <button onClick={onBack} className={`font-medium flex items-center gap-1 transition-colors text-sm ${pinkAccent ? 'text-[#E70D8D] dark:text-pink-400' : 'text-[#303690] dark:text-white hover:text-[#E70D8D] dark:hover:text-pink-400'}`}>&larr; Back</button>}
        </div>
        <h1 className={`text-lg font-bold text-center tracking-tight flex-grow truncate px-2 ${pinkAccent ? 'text-[#E70D8D] dark:text-pink-400' : 'text-[#303690] dark:text-white'}`}>{title}</h1>
        <div className="w-20 flex justify-end items-center gap-3">
            {onHelp && (
                <button onClick={onHelp} className="w-8 h-8 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-[#303690] dark:text-white hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors">
                    <Icon name="helpCircle" className="w-5 h-5" />
                </button>
            )}
            {showProfile && navigate && (
                <button onClick={() => navigate(Screen.Profile)} className="text-gray-500 dark:text-gray-400 hover:text-[#E70D8D] dark:hover:text-pink-400 transition-colors">
                    <Icon name="user" className="w-6 h-6"/>
                </button>
            )}
            {!onHelp && (!showProfile || !navigate) && <div className="w-6" />}
        </div>
    </div>
);

const DriverConfirmationScreen: React.FC<{ onConfirm: () => void; version: string; onVersionClick: () => void; staff?: StaffMember; }> = ({ onConfirm, version, onVersionClick, staff }) => {
    const [isConfirming, setIsConfirming] = useState(false);
    const { selectedVehicle, setSelectedVehicle } = useVehicle();
    const staffName = staff?.name || MOCK_DRIVER.name;
    const staffRole = staff?.role === 'minder' ? 'Minder' : 'Driver';
    
    const handleConfirm = () => {
        setIsConfirming(true);
        setTimeout(() => {
            onConfirm();
        }, 1000);
    };

    return (
        <div className="relative flex flex-col h-full bg-gray-50 dark:bg-slate-950 overflow-hidden text-center">
            {/* Scrollable Contents Area */}
            <div className="flex-grow overflow-y-auto p-8 pt-16 pb-20 flex flex-col items-center justify-start">
                <div className="bg-blue-100 dark:bg-blue-950/40 p-6 rounded-full mb-6 shrink-0">
                    <Icon name="circleCheck" className="w-12 h-12 text-[#303690] dark:text-white"/>
                </div>
                <h1 className="text-2xl font-bold text-[#303690] dark:text-white mb-2 shrink-0">Confirm Assignment</h1>
                <p className="text-gray-500 dark:text-slate-400 mb-8 shrink-0">Please confirm your details before starting.</p>
                
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 w-full space-y-5 mb-8 text-left shrink-0">
                    <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-slate-550 uppercase tracking-wider mb-1">{staffRole}</p>
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 dark:bg-slate-800 p-2 rounded-full">
                                 <Icon name="user" className="w-4 h-4 text-[#303690] dark:text-white" />
                            </div>
                            <p className="text-lg font-semibold text-gray-800 dark:text-slate-100">{staffName}</p>
                        </div>
                    </div>
                    <div className="h-px bg-gray-100 dark:bg-slate-800 w-full"></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-slate-550 uppercase tracking-wider mb-3">Select Assigned Vehicle</p>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            {MOCK_ASSIGNED_VEHICLES.map((vehicle) => (
                                <button 
                                    key={vehicle.id}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${selectedVehicle.id === vehicle.id ? 'border-[#E70D8D] dark:border-pink-500 bg-pink-50 dark:bg-pink-950/15' : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                                >
                                    <div className={`p-3 rounded-xl ${selectedVehicle.id === vehicle.id ? 'bg-[#E70D8D] text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500'}`}>
                                        <Icon name="bus" className="w-6 h-6" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className={`text-base font-bold ${selectedVehicle.id === vehicle.id ? 'text-[#E70D8D] dark:text-pink-400' : 'text-gray-800 dark:text-slate-200'}`}>{vehicle.registration}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-slate-550 uppercase font-bold tracking-tight">{vehicle.type} &bull; {vehicle.zone}</p>
                                    </div>
                                    {selectedVehicle.id === vehicle.id && (
                                        <div className="bg-[#E70D8D] dark:bg-pink-500 rounded-full p-1">
                                            <Icon name="check" className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleConfirm} 
                    disabled={isConfirming}
                    className="w-full bg-[#E70D8D] text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-90 transition-colors h-14 flex items-center justify-center mt-auto shrink-0"
                >
                    {isConfirming ? <Spinner className="text-white"/> : 'Confirm & Start'}
                </button>
            </div>

            {/* Always Sticky Fixed At Bottom Viewport */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent dark:from-slate-950 dark:via-slate-950/90 dark:to-transparent flex items-center justify-center pointer-events-none z-10">
                <button 
                    onClick={onVersionClick} 
                    className="hover:text-gray-600 dark:hover:text-slate-300 text-gray-400 dark:text-slate-500 text-xs transition-colors focus:outline-none pointer-events-auto font-medium"
                >
                    Version {version}
                </button>
            </div>
        </div>
    );
};

const HomeScreen: React.FC<{ 
    navigate: (screen: Screen) => void; 
    setHistoryType: (type: 'trip' | 'verification') => void; 
    onVersionClick: () => void; 
    activeTrip: Trip | null; 
    staff?: StaffMember; 
    onSwitchRole?: (role: 'driver' | 'minder') => void;
}> = ({ navigate, setHistoryType, onVersionClick, activeTrip, staff, onSwitchRole }) => {
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }, []);
    
    const { selectedVehicle } = useVehicle();
    const staffName = staff?.name || MOCK_DRIVER.name;
    const staffPartner = staff?.partnerName || MOCK_DRIVER.partnerName;
    
    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
             <div className="bg-white dark:bg-slate-900 p-6 shadow-sm border-b border-gray-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                    <div>
                        {onSwitchRole && (
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/40 text-[#303690] dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                    Driver Mode
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onSwitchRole('minder')}
                                    className="text-[10px] font-bold text-gray-500 hover:text-[#E70D8D] hover:underline cursor-pointer"
                                >
                                    Switch to Minder
                                </button>
                            </div>
                        )}
                        <h1 className="text-2xl font-bold text-[#303690] dark:text-white">{greeting},</h1>
                        <h1 className="text-2xl font-light text-gray-600 dark:text-slate-300 mb-1">{staffName.split(' ')[0]}</h1>
                        <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-2 flex-wrap">
                           <span className="bg-blue-50 dark:bg-blue-950/40 text-[#303690] dark:text-white px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                               <Icon name="bus" className="w-3 h-3" />
                               {selectedVehicle.registration}
                           </span>
                           <span className="bg-pink-50 dark:bg-pink-955/40 text-[#E70D8D] dark:text-pink-400 px-2 py-0.5 rounded text-xs font-semibold">{selectedVehicle.zone}</span>
                           <span className="text-gray-300 dark:text-slate-700">|</span> 
                           <span className="text-gray-600 dark:text-slate-350">{staffPartner}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate(Screen.Support)} 
                            className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-[#303690] dark:text-white hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors"
                            title="Help & Support"
                        >
                            <Icon name="helpCircle" className="w-6 h-6" />
                        </button>
                        <button onClick={() => navigate(Screen.Profile)} className="flex-shrink-0">
                            <ProfileAvatar name={staffName} imgUrl={staff?.imgUrl || MOCK_DRIVER.imgUrl} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-grow p-6 flex flex-col items-center gap-4 overflow-y-auto min-h-0 bg-gray-50 dark:bg-slate-950">
                {/* Active Trip Banner */}
                {activeTrip && (
                    <button 
                        onClick={() => navigate(Screen.ActiveTrip)}
                        className="w-full shrink-0 bg-gradient-to-r from-[#2B3595] to-[#404CB8] dark:from-slate-900 dark:to-indigo-950 p-5 rounded-2xl shadow-lg shadow-indigo-950/20 text-left flex items-center gap-4 relative overflow-hidden group border border-white/10 dark:border-slate-800"
                    >
                        <div className="bg-white/15 p-3.5 rounded-2xl text-white shrink-0">
                            <Icon name="bus" className="w-6 h-6"/>
                        </div>
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-bold text-blue-200/90 dark:text-indigo-300 uppercase tracking-widest">
                                    ACTIVE TRIP SESSION
                                </span>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E70D8D] text-white shadow-xs shrink-0">
                                    {activeTrip.title || `${activeTrip.type} Trip`}
                                </span>
                            </div>
                            <h3 className="text-white font-extrabold text-lg truncate leading-tight">
                                {activeTrip.route.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-blue-100 dark:text-indigo-200 mt-0.5">
                                <span className="font-semibold text-pink-300 dark:text-pink-400 truncate">
                                    {activeTrip.title || `${activeTrip.type} Trip`}
                                </span>
                                <span className="text-blue-200/60">&bull;</span>
                                <span className="text-blue-100 dark:text-slate-300 font-medium shrink-0">
                                    {activeTrip.route.zone}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2.5">
                                <div className="h-1.5 flex-grow bg-white/20 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-pink-400 rounded-full transition-all duration-300"
                                        style={{ width: `${(activeTrip.students.filter(s => [StudentStatus.Boarded, StudentStatus.Alighted].includes(s.status)).length / (activeTrip.students.length || 1)) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs font-bold text-white whitespace-nowrap flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                    Resume &rarr;
                                </span>
                            </div>
                        </div>
                    </button>
                )}

                <div className="w-full flex flex-col justify-center items-center gap-4 shrink-0">
                    <HomeButton 
                        icon="bus" 
                        title={`${selectedVehicle.type.charAt(0).toUpperCase() + selectedVehicle.type.slice(1)} Trip Mode`} 
                        description="Manage student transit" 
                        onClick={() => navigate(Screen.TripSelection)} 
                        theme="blue"
                    />
                    <HomeButton 
                        icon="logIn" 
                        title="Attendance" 
                        description="Check in/out at fixed locations" 
                        onClick={() => navigate(Screen.SelectGateLocation)} 
                        theme="pink"
                    />
                    <HomeButton 
                        icon="zap" 
                        title="Identify Band/Bag Tag" 
                        description="Identify or deactivate tags/bands" 
                        onClick={() => navigate(Screen.BandIdentification)} 
                        theme="pink"
                    />
                    <HomeButton 
                        icon="fileText" 
                        title="View History" 
                        description="Review trips & verifications" 
                        onClick={() => { setHistoryType('trip'); navigate(Screen.History); }} 
                        theme="gray"
                    />
                </div>
            </div>
             <div className="py-4 text-center">
                <button onClick={onVersionClick} className="text-gray-400 text-xs hover:text-gray-600 dark:hover:text-slate-300 transition-colors focus:outline-none px-2 py-1 rounded-md">
                    Version {APP_VERSION}
                </button>
            </div>
            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                .animate-bounce-subtle { animation: bounce-subtle 3s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

const HomeButton: React.FC<{ icon: IconName; title: string; description: string; onClick: () => void; theme: 'blue' | 'pink' | 'gray' | 'purple' }> = ({ icon, title, description, onClick, theme }) => {
    const themeStyles = {
        blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-[#303690] dark:text-white', iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
        pink: { bg: 'bg-pink-50 dark:bg-pink-950/40', text: 'text-[#E70D8D] dark:text-pink-400', iconBg: 'bg-pink-100 dark:bg-pink-900/40' },
        gray: { bg: 'bg-white dark:bg-slate-900', text: 'text-gray-600 dark:text-slate-350', iconBg: 'bg-gray-100 dark:bg-slate-800' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-900/40' },
    };
    const style = themeStyles[theme];

    return (
        <button onClick={onClick} className={`bg-white dark:bg-slate-900 rounded-2xl p-6 w-full text-left shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-slate-800 flex items-center gap-5 group`}>
            <div className={`${style.iconBg} ${style.text} p-4 rounded-2xl transition-transform group-hover:scale-105`}>
                <Icon name={icon} className="w-8 h-8"/>
            </div>
            <div className="flex-grow">
                <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 group-hover:text-[#303690] dark:group-hover:text-white transition-colors">{title}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 leading-tight mt-1">{description}</p>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'gray' ? 'bg-gray-50 dark:bg-slate-800' : style.bg}`}>
                 <Icon name="arrowRight" className={`w-4 h-4 ${style.text}`}/>
            </div>
        </button>
    );
}

// Scheduled Trips Mock Data Helper
const getISODateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

const MOCK_SCHEDULED_TRIPS: ScheduledTrip[] = [
    { id: 't1', type: 'Morning', title: 'Morning Route', scheduledTime: '07:30', scheduledDate: getISODateOffset(0), category: 'regular', icon: 'sun' },
    { id: 't2', type: 'Mid Day', title: 'Mid Day Pickup', scheduledTime: '12:30', scheduledDate: getISODateOffset(0), category: 'regular', icon: 'zap' },
    { id: 't3', type: 'Mid Afternoon', title: 'Afternoon Drop-off', scheduledTime: '15:30', scheduledDate: getISODateOffset(0), category: 'regular', icon: 'sun' },
    { id: 't4', type: 'Evening', title: 'Evening Activity', scheduledTime: '17:30', scheduledDate: getISODateOffset(0), category: 'regular', icon: 'moon' },
    // Tomorrow and Friday trips
    { id: 't5', type: 'Morning', title: 'Morning Route', scheduledTime: '07:30', scheduledDate: getISODateOffset(1), category: 'regular', icon: 'sun' },
    { id: 't6', type: 'Special Event', title: 'Museum Field Trip', scheduledTime: '09:00', scheduledDate: getISODateOffset(0), category: 'one-off', icon: 'users' },
    { id: 't7', type: 'Special Event', title: 'Sports Gala Transport', scheduledTime: '14:00', scheduledDate: getISODateOffset(1), category: 'one-off', icon: 'zap' },
    { id: 't8', type: 'Special Event', title: 'Graduation Rehearsal', scheduledTime: '10:00', scheduledDate: getISODateOffset(2), category: 'one-off', icon: 'users' },
];

const TripSelectionScreen: React.FC<{ onSelectTripType: (type: TripType, title?: string) => void; onBack: () => void; showToast: (msg: string) => void; }> = ({ onSelectTripType, onBack, showToast }) => {
    const [hasData, setHasData] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'regular' | 'one-off'>('regular');
    const [currentTime, setCurrentTime] = useState(new Date());
    const { selectedVehicle } = useVehicle();

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setHasData(true);
            setIsRefreshing(false);
        }, 1500);
    };

    const handleTabChange = (tab: 'regular' | 'one-off') => {
        setActiveTab(tab);
    };

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const getRelativeDayString = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const target = new Date(dateStr + 'T00:00:00');
        
        if (target.getTime() === today.getTime()) return 'Today';
        if (target.getTime() === tomorrow.getTime()) return 'Tomorrow';
        
        return target.toLocaleDateString('en-US', { weekday: 'long' });
    };

    const isTripActive = (dateStr: string) => {
        // For demo purposes, all of today's trips are selectable to ensure a smooth user experience.
        const isSameDay = new Date(dateStr + 'T00:00:00').toDateString() === currentTime.toDateString();
        return isSameDay;
    };

    const filteredTrips = MOCK_SCHEDULED_TRIPS.filter(t => t.category === activeTab);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
            <Header title="Available Trips" onBack={onBack}/>
            
            <div className="px-4 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
                    <button 
                        onClick={() => handleTabChange('regular')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'regular' ? 'bg-white dark:bg-slate-700 text-[#E70D8D] dark:text-pink-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
                    >
                        Schedule
                    </button>
                    <button 
                        onClick={() => handleTabChange('one-off')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'one-off' ? 'bg-white dark:bg-slate-700 text-[#E70D8D] dark:text-pink-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
                    >
                        One-Offs
                    </button>
                </div>
            </div>

            <div className="flex-grow p-4 overflow-y-auto min-h-0 space-y-4 bg-gray-50 dark:bg-slate-950">
                {!hasData ? (
                    <EmptyState 
                        message={`No trips available for ${selectedVehicle.registration}. Tap refresh to pull today's schedule.`} 
                        icon="bus" 
                        onRefresh={handleRefresh}
                        isRefreshing={isRefreshing}
                    />
                ) : (
                    <>
                        {filteredTrips.length > 0 ? (
                            filteredTrips.map((trip) => {
                                const active = isTripActive(trip.scheduledDate);
                                const dayLabel = getRelativeDayString(trip.scheduledDate);
                                return (
                                    <ScheduledTripCard 
                                        key={trip.id}
                                        trip={trip}
                                        isActive={active}
                                        statusText={`${dayLabel} @ ${trip.scheduledTime}`}
                                        onClick={() => {
                                            if (active) onSelectTripType(trip.type, trip.title);
                                            else showToast(`This trip is for a future date and cannot be started yet.`);
                                        }}
                                    />
                                );
                            })
                        ) : (
                             <EmptyState 
                                message={`No ${activeTab === 'regular' ? 'scheduled trips' : 'one-off events'} for today.`} 
                                icon={activeTab === 'regular' ? 'bus' : 'zap'} 
                            />
                        )}
                    </>
                )}
            </div>

            <div className="p-4 text-center">
                <p className="text-[8px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                    Current Time: {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} &bull; {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
};

const ScheduledTripCard: React.FC<{ 
    trip: ScheduledTrip; 
    isActive: boolean; 
    statusText: string;
    onClick: () => void;
}> = ({ trip, isActive, statusText, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-4 w-full text-left shadow-sm border transition-all flex items-center gap-4 group ${isActive ? 'border-gray-100 dark:border-slate-800 hover:shadow-md active:scale-[0.98]' : 'border-transparent dark:border-transparent opacity-60 grayscale-[0.5]'}`}
        >
            <div className={`p-4 rounded-xl transition-all ${isActive ? 'bg-pink-50 dark:bg-pink-950/40 text-[#E70D8D] dark:text-pink-400 group-hover:bg-[#E70D8D] group-hover:dark:bg-pink-500 group-hover:text-white group-hover:dark:text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500'}`}>
                <Icon name={trip.icon as IconName} className="w-7 h-7"/>
            </div>
            
            <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-bold text-base ${isActive ? 'text-gray-800 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>{trip.title}</h3>
                    {isActive && (
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 font-bold text-[9px] px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-50 dark:bg-indigo-950/40 text-[#303690] dark:text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-550'}`}>
                        <Icon name="clock" className="w-3 h-3" />
                        {statusText}
                    </div>
                    {isActive && <span className="text-[8px] font-bold text-[#E70D8D] dark:text-pink-400 uppercase tracking-tighter">Ready</span>}
                </div>
            </div>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-pink-50 dark:bg-pink-950/20 group-hover:bg-[#E70D8D] group-hover:dark:bg-pink-500' : 'bg-gray-50 dark:bg-slate-800'}`}>
                <Icon name="arrowRight" className={`w-4 h-4 ${isActive ? 'text-[#E70D8D] dark:text-pink-400 group-hover:text-white' : 'text-gray-300 dark:text-slate-650'}`}/>
            </div>
        </button>
    );
};

const RouteSelectionScreen: React.FC<{ onSelectRoute: (route: Route) => void; onBack: () => void; activeTrip: Trip | null; selectedTripType: TripType | null; }> = ({ onSelectRoute, onBack, activeTrip, selectedTripType }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [hasData, setHasData] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setHasData(true);
            setIsRefreshing(false);
        }, 1500);
    };
    
    const filteredRoutes = useMemo(() => {
        return MOCK_ROUTES.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.zone.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
            <Header title="Select Route" onBack={onBack} />
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 relative overflow-hidden">
                {activeTrip && (
                    <div className="mb-4 bg-blue-50 dark:bg-indigo-950/40 border border-blue-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#303690] text-white flex items-center justify-center shrink-0">
                                <Icon name="bus" className="w-5 h-5 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-wider text-[#E70D8D]">Active Trip Running</p>
                                <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                                    {activeTrip.title || `${activeTrip.type} Trip`}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                    Route: <span className="font-semibold text-gray-700 dark:text-slate-300">{activeTrip.route.name}</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onSelectRoute(activeTrip.route)}
                            className="bg-[#E70D8D] hover:bg-pink-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs shrink-0 shadow-xs"
                        >
                            Resume &rarr;
                        </button>
                    </div>
                )}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-indigo-950/20 rounded-full -translate-y-1/2 translate-x-1/2 opacity-30 -z-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-50 dark:bg-pink-950/10 rounded-full translate-y-1/2 -translate-x-1/2 opacity-20 -z-10"></div>
                
                <div className="relative">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#303690] dark:text-white opacity-40 w-5 h-5"/>
                    <input 
                        type="text" 
                        placeholder="Search for a route..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full bg-gray-50 dark:bg-slate-800 rounded-xl p-3.5 pl-10 border border-gray-100 dark:border-slate-705 focus:outline-none focus:ring-2 focus:ring-[#303690]/20 text-sm shadow-sm placeholder-gray-400 dark:text-slate-100" 
                    />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto min-h-0 p-4 space-y-4 bg-gray-50 dark:bg-slate-950">
                {!hasData ? (
                    <EmptyState 
                        message="No routes available. Tap refresh to pull route data." 
                        icon="map" 
                        onRefresh={handleRefresh}
                        isRefreshing={isRefreshing}
                    />
                ) : (
                    <>
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Available Routes</p>
                            <div className="h-px bg-gray-200 dark:bg-slate-800 flex-grow ml-4"></div>
                        </div>

                        {filteredRoutes.length > 0 ? (
                            filteredRoutes.map(route => {
                                const isCurrentlyActive = activeTrip && activeTrip.route.id === route.id && activeTrip.type === selectedTripType;
                                const isMismatch = activeTrip && !isCurrentlyActive;

                                return (
                                    <button 
                                        key={route.id} 
                                        onClick={() => onSelectRoute(route)}
                                        disabled={isMismatch}
                                        className={`bg-white dark:bg-slate-900 rounded-2xl p-5 w-full text-left shadow-sm border transition-all flex items-center gap-4 group active:scale-[0.98] relative overflow-hidden ${isMismatch ? 'opacity-40 grayscale pointer-events-none' : 'hover:border-[#303690]/30 hover:dark:border-slate-700 hover:shadow-md border-gray-50 dark:border-slate-850'}`}
                                    >
                                        <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${isCurrentlyActive ? 'bg-green-500' : 'bg-[#303690]/10 dark:bg-[#303690]/20 group-hover:bg-[#E70D8D] dark:group-hover:bg-pink-500'}`}></div>
                                        
                                        <div className={`bg-blue-50 dark:bg-slate-800 p-3.5 rounded-2xl transition-all shadow-sm ${isCurrentlyActive ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400' : 'text-[#303690] dark:text-white group-hover:bg-[#303690] group-hover:dark:bg-slate-700 group-hover:text-white dark:group-hover:text-white'}`}>
                                            <Icon name={isCurrentlyActive ? "checkCircle" : "map"} className="w-6 h-6"/>
                                        </div>
                                        
                                        <div className="flex-grow min-w-0">
                                            <h3 className="font-bold text-[#303690] dark:text-white text-base group-hover:text-[#303690] dark:group-hover:text-white transition-colors truncate">{route.name}</h3>
                                            <div className="flex items-center flex-wrap mt-1.5 gap-2">
                                                <span className="flex items-center gap-1.5 text-[9px] font-bold text-[#E70D8D] dark:text-pink-450 bg-pink-50 dark:bg-pink-955/30 px-2 py-0.5 rounded-full border border-pink-100 dark:border-pink-900/30 uppercase tracking-tight">
                                                    <Icon name="mapPin" className="w-3 h-3"/> {route.zone}
                                                </span>
                                                {isCurrentlyActive && (
                                                    <span className="text-[9px] font-extrabold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/50 px-2 py-0.5 rounded-md border border-green-200 dark:border-green-800">
                                                        Trip: {activeTrip.title || `${activeTrip.type} Trip`} (Ongoing)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="text-right flex flex-col items-end">
                                            <div className="bg-gray-50 dark:bg-slate-800 p-2 rounded-xl border border-gray-100 dark:border-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-slate-750 group-hover:border-blue-100 dark:group-hover:border-slate-700 transition-colors">
                                                <p className="text-[7px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tighter leading-none mb-1">Est. Time</p>
                                                <p className="font-black text-[#303690] dark:text-white text-xs">{route.estimatedDuration}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                                 <div className="bg-gray-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Icon name="search" className="w-8 h-8 text-gray-200 dark:text-slate-700"/>
                                 </div>
                                 <p className="text-gray-400 dark:text-slate-500 font-medium text-sm">No routes found matching your search.</p>
                                 <button onClick={() => setSearchTerm('')} className="mt-4 text-[#303690] dark:text-white text-xs font-bold uppercase tracking-widest hover:text-[#E70D8D] dark:hover:text-pink-400 transition-colors">Clear Search</button>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center justify-center gap-3">
                 <div className="w-1 h-1 bg-[#E70D8D] rounded-full"></div>
                 <p className="text-center text-[8px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">Select a route to begin student check-ins</p>
                 <div className="w-1 h-1 bg-[#E70D8D] rounded-full"></div>
            </div>
        </div>
    );
};

const StudentListItem: React.FC<{
    student: Student;
    onSelect: (student: Student) => void;
    bulkMode: boolean;
    isSelected: boolean;
    onToggleSelect: (studentId: string) => void;
    view: 'boarding' | 'alighting' | 'checkin' | 'checkout';
    onUpdateStatus: (student: Student, newStatus: StudentStatus) => void;
}> = ({ student, onSelect, bulkMode, isSelected, onToggleSelect, view, onUpdateStatus }) => {
    return (
        <li className="bg-white dark:bg-slate-900 p-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-4">
            {bulkMode ? (
                <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} role="presentation" className="flex items-center h-full pt-1">
                    <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(student.id)} className="w-6 h-6 rounded text-[#E70D8D] border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-[#E70D8D]" />
                </div>
            ) : (
                <div className="relative shrink-0">
                    <img src={student.imgUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-slate-800"/>
                    {student.status === StudentStatus.Boarded && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white dark:border-slate-900"><Icon name="check" className="w-3 h-3 text-white"/></div>}
                </div>
            )}
            <button type="button" className="flex-grow cursor-pointer text-left focus:outline-none min-w-0" onClick={() => onSelect(student)}>
                <p className="font-bold text-gray-800 dark:text-slate-100 text-base truncate">{student.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium truncate">ID: {student.admissionNumber} &bull; {student.grade}</p>
                <div className="mt-1.5"><StatusBadge status={student.status} /></div>
                {student.alert && <StudentAlert alertText={student.alert} />}
            </button>
            {!bulkMode && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                    {view === 'boarding' && student.status === StudentStatus.NotBoarded && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(student, StudentStatus.Boarded); }} className="px-3 py-1.5 text-xs bg-[#303690] text-white rounded-lg font-bold hover:opacity-90 transition-colors shadow-sm">Board</button>
                            <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(student, StudentStatus.Absent); }} className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition-colors">Absent</button>
                        </>
                    )}
                    {view === 'alighting' && student.status === StudentStatus.Boarded && (
                        <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(student, StudentStatus.Alighted); }} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm">Alight</button>
                    )}
                    {view === 'checkin' && student.status === StudentStatus.NotArrived && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(student, StudentStatus.InSchool); }} className="px-3 py-1.5 text-xs bg-[#303690] text-white rounded-lg font-bold hover:opacity-90 transition-colors shadow-sm">Check In</button>
                            <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(student, StudentStatus.Absent); }} className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition-colors">Absent</button>
                        </>
                    )}
                    {view === 'checkout' && student.status === StudentStatus.InSchool && (
                        <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(student, StudentStatus.LeftSchool); }} className="px-3 py-1.5 text-xs bg-[#303690] text-white rounded-lg font-bold hover:opacity-90 transition-colors shadow-sm">Check Out</button>
                    )}
                </div>
            )}
        </li>
    );
};

const GpsStatusIndicator: React.FC<{ status: GpsStatus; onClick: () => void; }> = ({ status, onClick }) => {
    const config: Record<GpsStatus, { color: string }> = {
        active: { color: 'bg-emerald-500 shadow-emerald-500/50' },
        inactive: { color: 'bg-slate-400' },
        error: { color: 'bg-rose-500 shadow-rose-500/50 animate-pulse' },
    };
    return (
        <button 
            onClick={onClick} 
            className="flex items-center gap-2 text-xs bg-[#E70D8D] hover:bg-[#c90a77] active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-full shadow-md transition-all duration-200 select-none cursor-pointer"
        >
            <Icon name="map" className="w-3.5 h-3.5 animate-pulse" />
            <span>Map View</span>
            <span className={`w-2 h-2 rounded-full ${config[status].color} border border-white shadow-xs`} />
        </button>
    );
};

const ModeToggle: React.FC<{
    label: string;
    icon: IconName;
    checked?: boolean;
    hasSwitch?: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, icon, checked = false, hasSwitch = false, onChange }) => (
    <button 
        type="button"
        role={hasSwitch ? "switch" : "button"}
        aria-checked={hasSwitch ? checked : undefined}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-full border-2 transition-all cursor-pointer select-none font-bold active:scale-[0.98] text-xs shadow-sm ${
            checked 
                ? 'bg-[#E70D8D] border-[#E70D8D] hover:bg-[#d0097d] text-white shadow-pink-500/25' 
                : 'bg-[#303690] hover:bg-[#252b75] border-[#303690] text-white dark:bg-[#1e235e] dark:border-indigo-400 dark:hover:bg-[#282f7c]'
        }`}
    >
        <Icon name={icon} className="w-4 h-4 shrink-0" />
        <span className="font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">{label}</span>
        {hasSwitch && (
            <div className="relative inline-block w-7 h-3.5 align-middle transition duration-200 ease-in ml-1 shrink-0">
                 <div className={`block overflow-hidden h-full rounded-full transition-colors ${
                     checked ? 'bg-pink-950/45' : 'bg-black/35 dark:bg-black/55 border border-white/20'
                 }`}></div>
                 <div className={`absolute block w-2.5 h-2.5 rounded-full bg-white shadow-xs top-0.5 left-0.5 transition-transform duration-200 ${
                     checked ? 'translate-x-3.5' : 'translate-x-0'
                 }`}></div>
            </div>
        )}
    </button>
);

const ActiveTripScreen: React.FC<{
    trip: Trip;
    onEndTrip: () => void;
    onUpdateStudent: (studentId: string, newStatus: StudentStatus) => void;
    onReportIssue: () => void;
    showToast: (message: string, type?: ToastType) => void;
    gpsStatus: GpsStatus;
    onGpsClick: () => void;
    onScanned: (data: {student: Student, status: StudentStatus} | null) => void;
    onBack: () => void;
    onOpenSupport: () => void;
}> = ({ trip, onEndTrip, onUpdateStudent, onReportIssue, showToast, gpsStatus, onGpsClick, onScanned, onBack, onOpenSupport }) => {
    const [view, setView] = useState<'boarding' | 'alighting'>(trip.type === 'Morning' ? 'boarding' : 'alighting');
    const [searchTerm, setSearchTerm] = useState('');
    const [manualMode, setManualMode] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [studentToConfirm, setStudentToConfirm] = useState<Student | null>(null);
    const [isQuickScanModeActive, setIsQuickScanModeActive] = useState(false);
    const [isEndingTrip, setIsEndingTrip] = useState(false);
    const [isEndConfirmationOpen, setIsEndConfirmationOpen] = useState(false);
    const [scanResult, setScanResult] = useState<{status: 'success' | 'failed', student?: Student, message?: string} | null>(null);
    const [scanCount, setScanCount] = useState(0);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    const [activeStudent, setActiveStudent] = useState<Student | null>(null);

    // Trip Rating states
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [tripRating, setTripRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [tripComment, setTripComment] = useState<string>('');
    const [selectedIssueTags, setSelectedIssueTags] = useState<string[]>([]);

    const handleViewChange = (newView: 'boarding' | 'alighting') => {
        setView(newView);
        setSelectedStudentIds([]);
    };

    const handleManualModeToggle = (checked: boolean) => {
        setManualMode(checked);
        setSelectedStudentIds([]);
    };

    const nextStudent = useMemo(() => {
        if (view !== 'alighting') return null;
        // In alighting view, the next student to drop off is the first one who is currently "Boarded"
        return trip.students.find(s => s.status === StudentStatus.Boarded);
    }, [trip.students, view]);

    const studentsToShow = useMemo(() => {
        let list = trip.students;
        if (view === 'boarding') {
            list = trip.students.filter(s => [StudentStatus.NotBoarded, StudentStatus.Absent].includes(s.status));
        } else {
            list = trip.students.filter(s => [StudentStatus.Boarded, StudentStatus.Alighted].includes(s.status));
        }
        
        if (!searchTerm) return list;

        return list.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [view, trip.students, searchTerm]);

    const handleManualScan = () => {
        const isSuccess = scanCount % 2 === 0;
        setScanCount(prev => prev + 1);

        if (isSuccess) {
            const targetStatus = view === 'boarding' ? StudentStatus.NotBoarded : StudentStatus.Boarded;
            const newStatus = view === 'boarding' ? StudentStatus.Boarded : StudentStatus.Alighted;
            const studentToProcess = trip.students.find(s => s.status === targetStatus);

            if (studentToProcess) {
                onUpdateStudent(studentToProcess.id, newStatus);
                // Quick scan is silent (no top notification)
                onScanned({ student: studentToProcess, status: newStatus }, true);
                setScanResult({ status: 'success', student: studentToProcess });
            } else {
                showToast(`All students ${view === 'boarding' ? 'boarded' : 'alighted'}.`, 'info');
            }
        } else {
            setScanResult({ 
                status: 'failed', 
                message: scanCount % 4 === 1 ? "Child is in the wrong route." : "Failed identification of the band." 
            });
        }
    };


    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const allVisibleSelected = studentsToShow.length > 0 && selectedStudentIds.length === studentsToShow.length;
            const someSelected = selectedStudentIds.length > 0 && selectedStudentIds.length < studentsToShow.length;
            selectAllCheckboxRef.current.checked = allVisibleSelected;
            selectAllCheckboxRef.current.indeterminate = someSelected;
        }
    }, [selectedStudentIds, studentsToShow]);

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleEndTrip = () => {
        setIsEndConfirmationOpen(false);
        const studentsOnBoard = trip.students.filter(s => s.status === StudentStatus.Boarded);
        if (studentsOnBoard.length > 0) {
            showToast(`Cannot end trip. ${studentsOnBoard.length} student(s) still on board.`, 'error');
        } else {
            setIsEndingTrip(true);
            setTimeout(() => {
                setIsEndingTrip(false);
                setShowSuccessModal(true);
            }, 1500);
        }
    };
    
    const proceedWithBoarding = (student: Student) => {
        setStudentToConfirm(student);
    };

    const proceedWithAlighting = (student: Student) => {
        setStudentToConfirm(student);
    };

    const handleStudentAction = (student: Student, newStatus: StudentStatus) => {
        if (newStatus === StudentStatus.Boarded) {
            if (student.alert) {
                setStudentToConfirm(student);
                return;
            }
            proceedWithBoarding(student);
        } else if (newStatus === StudentStatus.Alighted) {
            proceedWithAlighting(student);
        } else if (newStatus === StudentStatus.Absent) {
            onUpdateStudent(student.id, newStatus);
            showToast(`${student.name} marked as absent.`, 'info');
        } else {
             // Generic update (e.g. reversals)
             onUpdateStudent(student.id, newStatus);
             showToast(`${student.name} status updated to ${newStatus}.`, 'info');
        }
    };

    const handleToggleSelect = (studentId: string) => {
        setSelectedStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
    };
    
    const handleBulkUpdate = (status: StudentStatus) => {
        selectedStudentIds.forEach(id => onUpdateStudent(id, status));
        setSelectedStudentIds([]);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudentIds(studentsToShow.map(s => s.id));
        } else {
            setSelectedStudentIds([]);
        }
    };

    const { selectedVehicle } = useVehicle();

    const tripDirection = useMemo(() => {
        if (trip.type === 'Morning') return 'Home to School';
        if (['Mid Day', 'Mid Afternoon', 'Evening'].includes(trip.type)) return 'School to Home';
        return 'Special Event';
    }, [trip.type]);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
            <Header title={`${trip.type} Trip`} onBack={onBack} onHelp={onOpenSupport} />
            <div className="bg-white dark:bg-slate-900 px-4 py-3 border-b border-gray-100 dark:border-slate-800 animate-fade-in">
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-slate-400 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[#303690] dark:text-white">{selectedVehicle.zone}</span>
                        <span className="text-gray-300 dark:text-slate-700">|</span>
                        <span className="text-xs">{trip.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-gray-300 dark:text-slate-700">|</span>
                        <span className="bg-blue-50 dark:bg-blue-950/40 text-[#303690] dark:text-white px-2 py-0.5 rounded text-[10px] font-bold">{tripDirection}</span>
                    </div>
                    <GpsStatusIndicator status={gpsStatus} onClick={onGpsClick} />
                </div>
                
                {/* Route Information Section */}
                <div className="bg-blue-50/50 dark:bg-slate-850/50 border border-blue-100/50 dark:border-slate-800 rounded-xl p-3 mb-3 flex items-center gap-3">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg text-[#303690] dark:text-white shadow-sm border dark:border-slate-700">
                        <Icon name="map" className="w-5 h-5"/>
                    </div>
                    <div className="flex-grow">
                        <p className="text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase leading-none mb-1">Current Route</p>
                        <p className="font-bold text-gray-800 dark:text-slate-100 text-sm">{trip.route.name}</p>
                    </div>
                    <div className="text-right">
                         <p className="text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase leading-none mb-1">Zone</p>
                         <p className="font-bold text-gray-700 dark:text-slate-300 text-xs">{trip.route.zone}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">{view === 'boarding' ? 'Boarding Progress' : 'Alighting Progress'}</div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-2xl text-[#E70D8D] dark:text-pink-400">
                                {trip.students.filter(s => view === 'boarding' ? s.status === StudentStatus.Boarded : s.status === StudentStatus.Alighted).length}
                            </span>
                            <span className="text-gray-400 dark:text-slate-500 text-sm">/ {view === 'boarding' ? trip.students.length : trip.students.filter(s => s.status === StudentStatus.Boarded || (trip.type === 'Morning' && s.status !== StudentStatus.Absent)).length}</span>
                        </div>
                        {view === 'alighting' && (
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tighter -mt-1">
                                {trip.students.filter(s => (s.status === StudentStatus.Boarded || (trip.type === 'Morning' && s.status !== StudentStatus.Absent)) && s.status !== StudentStatus.Alighted).length} Remaining
                            </p>
                        )}
                    </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 mt-1">
                    <div 
                        className="bg-[#E70D8D] h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${(trip.students.filter(s => view === 'boarding' ? s.status === StudentStatus.Boarded : s.status === StudentStatus.Alighted).length / trip.students.length) * 100}%` }}
                    ></div>
                </div>
            </div>
            <div className="flex bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                <button 
                    className={`flex-1 p-3 font-semibold text-sm transition-colors relative ${view === 'boarding' ? 'text-[#E70D8D]' : 'text-gray-500 dark:text-slate-400'}`} 
                    onClick={() => handleViewChange('boarding')}
                >
                    Boarding
                    {view === 'boarding' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E70D8D]"></div>}
                </button>
                <button 
                    className={`flex-1 p-3 font-semibold text-sm transition-colors relative ${view === 'alighting' ? 'text-[#E70D8D]' : 'text-gray-500 dark:text-slate-400'}`} 
                    onClick={() => handleViewChange('alighting')}
                >
                    Alighting
                    {view === 'alighting' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E70D8D]"></div>}
                </button>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-50 dark:border-slate-800 sticky top-[230px] z-10 animate-fade-in">
                <div className="flex items-center gap-2.5 mb-4 w-full">
                    <ModeToggle 
                        label="Quick Scan"
                        icon="zap"
                        checked={isQuickScanModeActive}
                        hasSwitch={false}
                        onChange={(checked) => {
                            setIsQuickScanModeActive(checked);
                            if(checked) handleManualModeToggle(false);
                        }}
                    />
                    <ModeToggle 
                        label="Manual Mode"
                        icon="userCheck"
                        checked={manualMode}
                        hasSwitch={true}
                        onChange={handleManualModeToggle}
                    />
                </div>
                <div className="relative">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
                    <input type="text" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900/40 text-sm text-gray-800 dark:text-slate-100 border border-transparent dark:border-slate-700" />
                </div>
                {manualMode && (
                    <div className="flex items-center gap-2 mt-3 pl-1">
                        <input 
                            type="checkbox" 
                            id="select-all" 
                            ref={selectAllCheckboxRef}
                            onChange={handleSelectAll}
                            className="w-5 h-5 rounded text-[#E70D8D] border-gray-300 dark:border-slate-700 focus:ring-[#E70D8D]" 
                        />
                        <label htmlFor="select-all" className="text-xs font-bold uppercase text-gray-500 dark:text-slate-450 select-none">Select All Students</label>
                    </div>
                )}
            </div>
            <div className="flex-grow overflow-y-auto min-h-0 pb-36 bg-white dark:bg-slate-950">
                <AnimatePresence>
                    {nextStudent && !searchTerm && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="px-4 pt-4 mb-2"
                        >
                            <div className="bg-gradient-to-br from-[#303690] to-[#4049b4] dark:from-slate-900 dark:to-indigo-950 rounded-3xl p-5 shadow-xl shadow-blue-100 dark:shadow-none flex items-center gap-4 relative overflow-hidden group border dark:border-slate-800">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                                
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 relative z-10 shadow-lg">
                                        <img src={nextStudent.imgUrl} alt={nextStudent.name} className="w-full h-full object-cover" />
                                    </div>
                                    <motion.div 
                                        animate={{ scale: [1, 1.2, 1] }} 
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute -top-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-[#303690] z-20"
                                    ></motion.div>
                                </div>
                                
                                <div className="flex-grow relative z-10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-white/20 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Next Drop-off</span>
                                        <motion.span 
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                            className="text-blue-200 text-[8px] font-bold"
                                        >
                                            • Approx. 5 mins
                                        </motion.span>
                                    </div>
                                    <h4 className="text-white font-bold text-lg leading-tight">{nextStudent.name}</h4>
                                    <p className="text-blue-100/70 text-xs font-medium">{nextStudent.grade} • {nextStudent.admissionNumber}</p>
                                </div>
                                
                                <button 
                                    onClick={() => handleStudentAction(nextStudent, StudentStatus.Alighted)}
                                    className="bg-white text-[#303690] px-4 py-2 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all relative z-10 hover:bg-blue-50 cursor-pointer"
                                >
                                    Alight
                                </button>
                            </div>
                            
                            <div className="mt-6 flex items-center justify-between px-1">
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Other Students</p>
                                <div className="h-px bg-gray-100 flex-grow ml-4"></div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isQuickScanModeActive && (
                    <NfcScanningOverlay 
                        activeText="Quick Scan Active" 
                        onDone={() => setIsQuickScanModeActive(false)} 
                        onScanTrigger={handleManualScan}
                        status={scanResult?.status}
                        studentName={scanResult?.student?.name}
                        studentImage={scanResult?.student?.imgUrl}
                        studentGrade={scanResult?.student?.grade}
                        errorMsg={scanResult?.message}
                        onRetry={() => setScanResult(null)}
                        onScanAnother={() => setScanResult(null)}
                    />
                )}

                {studentsToShow.length > 0 ? (
                    <ul>{studentsToShow.map(s => <StudentListItem key={s.id} student={s} onSelect={setActiveStudent} bulkMode={manualMode} isSelected={selectedStudentIds.includes(s.id)} onToggleSelect={handleToggleSelect} view={view} onUpdateStatus={handleStudentAction} />)}</ul>
                ) : (
                    <div className="text-center p-8 text-gray-400 dark:text-slate-500 mt-8">
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                             <Icon name="bus" className="w-10 h-10 text-gray-300 dark:text-slate-600"/>
                        </div>
                        <p className="font-semibold text-gray-600 dark:text-slate-400">{view === 'boarding' ? 'All students boarded!' : 'No students to alight.'}</p>
                    </div>
                )}
            </div>
            {manualMode && selectedStudentIds.length > 0 && (
                <div className="absolute bottom-24 left-4 right-4 bg-[#303690] dark:bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex justify-between items-center z-20 border dark:border-slate-800 animate-slide-up-button">
                    <p className="font-bold">{selectedStudentIds.length} selected</p>
                    <div className="flex gap-2">
                         {view === 'boarding' && <>
                            <button onClick={() => handleBulkUpdate(StudentStatus.Boarded)} className="bg-[#E70D8D] hover:bg-pink-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">Board</button>
                            <button onClick={() => handleBulkUpdate(StudentStatus.Absent)} className="bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">Absent</button>
                         </>}
                         {view === 'alighting' && <button onClick={() => handleBulkUpdate(StudentStatus.Alighted)} className="bg-[#E70D8D] hover:bg-pink-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">Alight</button>}
                    </div>
                </div>
            )}
            <div className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 p-4 border-t border-gray-100 dark:border-slate-800 shadow-2xl ${view === 'alighting' ? 'grid grid-cols-4 gap-4' : 'flex items-center'}`}>
                <button onClick={onReportIssue} className={`bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 font-bold p-3 rounded-xl flex flex-col items-center justify-center gap-1 h-14 transition-all duration-300 ${view === 'alighting' ? 'col-span-1' : 'w-full'}`}>
                    <Icon name="alertTriangle" className="w-5 h-5" />
                    <span className="text-[8px] uppercase">Report</span>
                </button>
                {view === 'alighting' && (
                    <button onClick={() => setIsEndConfirmationOpen(true)} disabled={isEndingTrip} className="bg-[#E70D8D] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 col-span-3 h-14 shadow-lg shadow-pink-200 dark:shadow-none animate-slide-up-button">
                        {isEndingTrip ? <Spinner className="text-white"/> : <><Icon name="logOut" className="w-5 h-5"/>End Trip</>}
                    </button>
                )}
            </div>
            {scanResult && (
                <NfcScanningOverlay 
                    status={scanResult.status}
                    studentName={scanResult.student?.name}
                    studentImage={scanResult.student?.imgUrl}
                    studentGrade={scanResult.student?.grade}
                    errorMsg={scanResult.message}
                    onDone={() => setScanResult(null)}
                    onRetry={() => { setScanResult(null); }}
                    onScanAnother={() => { setScanResult(null); }}
                />
            )}
            <BoardingConfirmationModal
                isOpen={!!studentToConfirm}
                onClose={() => setStudentToConfirm(null)}
                student={studentToConfirm}
                onConfirm={(student) => {
                    const targetStatus = view === 'boarding' ? StudentStatus.Boarded : StudentStatus.Alighted;
                    setStudentToConfirm(null);
                    onUpdateStudent(student.id, targetStatus);
                    onScanned({ student, status: targetStatus });
                }}
                title={view === 'boarding' ? "Confirm Boarding" : "Confirm Alighting"}
                confirmText={view === 'boarding' ? "Board Student" : "Alight Student"}
            />
             <StudentActionModal
                isOpen={!!activeStudent}
                onClose={() => setActiveStudent(null)}
                student={activeStudent}
                onUpdateStatus={handleStudentAction}
                onNotify={(name) => showToast(`Notifying ${name}'s guardian.`, 'info')}
                onCall={(name) => showToast(`Calling ${name}'s guardian.`, 'info')}
                mode="trip"
                allStudents={trip.students}
                tripStartTime={trip.startTime}
            />
            <Modal isOpen={isEndConfirmationOpen} onClose={() => setIsEndConfirmationOpen(false)} title="End Trip?">
                <div className="flex flex-col items-center pb-2 text-center bg-white dark:bg-slate-900">
                    <div className="w-20 h-20 bg-pink-50 dark:bg-pink-950/30 rounded-full flex items-center justify-center mb-6">
                        <Icon name="logOut" className="w-8 h-8 text-[#E70D8D] dark:text-pink-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Are you sure you want to end this trip?</h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mb-8 px-4">
                        Please ensure all students have alighted or have been accounted for before ending the trip.
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button onClick={() => setIsEndConfirmationOpen(false)} className="py-4 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold text-sm uppercase tracking-wide">
                            Cancel
                        </button>
                        <button onClick={handleEndTrip} className="py-4 rounded-2xl bg-[#E70D8D] text-white font-bold shadow-lg shadow-pink-200 dark:shadow-none text-sm uppercase tracking-wide">
                            Confirm
                        </button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={showSuccessModal} onClose={() => {}} title="">
                <div className="flex flex-col items-center pb-4 text-center bg-white dark:bg-slate-900">
                    <div className="w-24 h-24 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <Icon name="circleCheck" className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-2xl font-black text-[#303690] dark:text-white mb-2">Trip Successfully Ended</h3>
                    <p className="text-gray-500 dark:text-slate-400 text-lg mb-8">
                        The trip data has been synchronized and saved successfully.
                    </p>
                    <button 
                        onClick={() => {
                            setShowSuccessModal(false);
                            setShowFeedbackModal(true);
                        }} 
                        className="w-full py-5 rounded-2xl bg-[#303690] dark:bg-indigo-600 text-white font-bold shadow-lg text-lg uppercase tracking-wider hover:opacity-95 transition-all active:scale-[0.99]"
                    >
                        Rate Your Trip
                    </button>
                </div>
            </Modal>

            <Modal isOpen={showFeedbackModal} onClose={() => {}} title="Rate Your Trip">
                <div className="flex flex-col pb-4 text-center bg-white dark:bg-slate-900 select-none">
                    <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
                        How was your driving experience on this trip? Your feedback helps us keep Terra GO safe and efficient!
                    </p>
                    
                    {/* Interactive Star Selection */}
                    <div className="flex justify-center items-center gap-3 mb-6">
                        {[1, 2, 3, 4, 5].map((starValue) => {
                            const isFilled = starValue <= (hoverRating || tripRating);
                            return (
                                <button
                                    key={starValue}
                                    type="button"
                                    onClick={() => {
                                        setTripRating(starValue);
                                        // Clear comments or issues tags reset when changing rating
                                        if (starValue > 3) {
                                            setSelectedIssueTags([]);
                                        }
                                    }}
                                    onMouseEnter={() => setHoverRating(starValue)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="p-1 transition-all duration-150 transform hover:scale-125 focus:outline-none"
                                >
                                    <Icon 
                                        name="star" 
                                        className={`w-10 h-10 transition-colors ${
                                            isFilled 
                                            ? 'text-yellow-500 fill-yellow-405 dark:text-yellow-400 dark:fill-yellow-500' 
                                            : 'text-gray-200 dark:text-slate-800'
                                        }`} 
                                    />
                                </button>
                            );
                        })}
                    </div>

                    {/* Low Rating conditional prompt and pre-defined tag selection */}
                    <AnimatePresence>
                        {tripRating > 0 && tripRating <= 3 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden text-left mb-6"
                            >
                                <p className="text-xs font-bold uppercase text-red-500 dark:text-red-400 tracking-wider mb-3">
                                    Help us understand what went wrong:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Heavy Traffic',
                                        'Parent Delay',
                                        'Student Behavior',
                                        'GPS / Navigation Issue',
                                        'App Offline / Slow',
                                        'Vehicle Troubleshooting'
                                    ].map((tag) => {
                                        const isSelected = selectedIssueTags.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedIssueTags(prev => 
                                                        prev.includes(tag) 
                                                        ? prev.filter(t => t !== tag) 
                                                        : [...prev, tag]
                                                    );
                                                }}
                                                className={`text-xs px-3.5 py-2 rounded-full font-semibold border transition-all ${
                                                    isSelected 
                                                    ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40 shadow-sm' 
                                                    : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-100 dark:border-slate-700/60 hover:bg-gray-100 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Feedback Comments Text Area */}
                    <div className="w-full text-left mb-6">
                        <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                            {tripRating <= 3 && tripRating > 0 ? 'Additional Details' : 'Any general comments? (Optional)'}
                        </label>
                        <textarea
                            value={tripComment}
                            onChange={(e) => setTripComment(e.target.value)}
                            placeholder={tripRating <= 3 && tripRating > 0 ? "Tell us more about the delay or issue..." : "Optional: How was the trip overall?"}
                            rows={3}
                            className="w-full p-4 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#303690] dark:focus:ring-indigo-600 focus:border-transparent transition-all placeholder-gray-400 dark:placeholder-slate-500"
                        />
                    </div>

                    {/* Submit Rating Feedback Action */}
                    <button
                        onClick={() => {
                            setShowFeedbackModal(false);
                            showToast(`Feedback submitted! Thank you for rating the trip.`, 'success');
                            // Delay slightly for toast to register before loading the main endTrip transition
                            setTimeout(() => {
                                onEndTrip();
                            }, 500);
                        }}
                        disabled={tripRating === 0}
                        className="w-full py-4 rounded-2xl bg-[#E70D8D] text-white font-bold shadow-lg shadow-pink-200 dark:shadow-none font-bold text-base uppercase tracking-wider hover:opacity-95 transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transform active:scale-[0.99]"
                    >
                        Submit Feedback
                    </button>
                </div>
            </Modal>
            <style>{`
                .toggle-checkbox:checked { right: 0; border-color: #E70D8D; } 
                .toggle-checkbox:checked + .toggle-label { background-color: #E70D8D; } 
                .toggle-label { transition: background-color 0.2s ease-in-out; }
                @keyframes slide-up-button {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up-button { animation: slide-up-button 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            `}</style>
        </div>
    );
};

const NfcIcon = ({ className = "w-48 h-48" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M35 45C42 38 50 35 60 35C70 35 78 38 85 45" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
        <path d="M25 35C35 25 47 20 60 20C73 20 85 25 95 35" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
        <path d="M45 55C49 52 54 50 60 50C66 50 71 52 75 55" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
        <circle cx="60" cy="85" r="25" stroke="#E2E8F0" strokeWidth="8" />
        <rect x="22" y="78" width="12" height="14" rx="3" stroke="#E2E8F0" strokeWidth="8" />
        <rect x="86" y="78" width="12" height="14" rx="3" stroke="#E2E8F0" strokeWidth="8" />
    </svg>
);

const FailedIcon = () => (
    <div className="relative w-24 h-24 flex items-center justify-center">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M25 5L55 5L75 25L75 55L55 75L25 75L5 55L5 25Z" fill="#EF4444" />
            <path d="M28 28L52 52M52 28L28 52" stroke="white" strokeWidth="8" strokeLinecap="round" />
        </svg>
    </div>
);

const NfcScanningOverlay: React.FC<{ 
    activeText?: string; 
    onDone?: () => void;
    status?: 'scanning' | 'success' | 'failed';
    studentName?: string;
    studentImage?: string;
    studentGrade?: string;
    errorMsg?: string;
    onRetry?: () => void;
    onScanAnother?: () => void;
    onScanTrigger?: () => void;
}> = ({ 
    onDone, 
    status = 'scanning',
    studentName,
    studentImage,
    studentGrade,
    errorMsg,
    onRetry,
    onScanAnother,
    onScanTrigger
}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    // Simulated scanner logic to introduce a real micro-processing step for rich interactive feedback
    const handleSimulateScan = () => {
        if (status === 'scanning' && !isProcessing) {
            setIsProcessing(true);
            setTimeout(() => {
                onScanTrigger?.();
            }, 1200); // 1.2s delay for modern credential ingestion simulation
        }
    };

    const handleActionDone = () => {
        setIsProcessing(false);
        onDone?.();
    };

    const handleActionRetry = () => {
        setIsProcessing(false);
        onRetry?.();
    };

    const handleActionScanAnother = () => {
        setIsProcessing(false);
        onScanAnother?.();
    };

    // Derive active processing state reactively without triggering cascading renders in an effect
    const showProcessing = status === 'scanning' && isProcessing;

    const titleText = showProcessing ? 'Reading Band/Bag Tag' :
                      status === 'success' ? 'Verified Successfully!' : 
                      status === 'failed' ? 'Scan Failed' : 
                      'Ready to Scan';

    return (
        <div className="absolute inset-0 bg-slate-950/60 dark:bg-black/70 backdrop-blur-xs z-[150] flex flex-col justify-end p-4 animate-fade-in">
            {/* Backdrop click dismiss context - linter-friendly button wrapper */}
            <button 
                type="button"
                className="absolute inset-0 -z-10 cursor-default w-full h-full bg-transparent border-none outline-none" 
                onClick={handleActionDone}
                aria-label="Dismiss scanning modal"
                tabIndex={-1}
            />

            <motion.div 
                initial={{ y: "100%", opacity: 0.8 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="bg-white dark:bg-slate-900 w-full max-w-sm mx-auto rounded-[32px] p-6 pb-8 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-gray-100 dark:border-slate-800/80 flex flex-col items-center relative overflow-hidden"
            >
                {/* Micro-indicator Bar */}
                <div className="w-12 h-1 bg-gray-200 dark:bg-slate-700 rounded-full mb-5" />

                {/* Styled Header Text */}
                <h2 className={`text-xl font-extrabold tracking-tight text-center mb-5 px-4 ${
                    showProcessing ? 'text-gray-700 dark:text-slate-300' :
                    status === 'success' ? 'text-gray-800 dark:text-slate-100' :
                    status === 'failed' ? 'text-red-600 dark:text-red-400' :
                    'text-gray-800 dark:text-slate-100'
                }`}>
                    {titleText}
                </h2>

                {/* Central High-Fidelity Interaction Graphic */}
                <div className="flex-grow flex flex-col items-center justify-center w-full min-h-[180px] mb-6">
                    {showProcessing ? (
                        <div className="flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-pink-200 dark:border-pink-950/30 border-t-[#E70D8D] rounded-full animate-spin"></div>
                        </div>
                    ) : status === 'success' ? (
                        <div className="relative flex flex-col items-center">
                            {/* Floating double rings of success */}
                            <div className="relative flex items-center justify-center w-28 h-28 rounded-full border border-green-200 dark:border-green-900 bg-green-50/20 dark:bg-green-950/25 shadow-inner animate-in zoom-in duration-300">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md">
                                    <img 
                                        src={studentImage || "https://picsum.photos/seed/student/200/200"} 
                                        alt={studentName} 
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1.5 border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center">
                                    <Icon name="check" className="w-4 h-4 stroke-[3px]" />
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col items-center">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight text-center">
                                    {studentName}
                                </h3>
                                <p className="text-gray-500 dark:text-slate-400 text-xs font-semibold mt-0.5">
                                    Grade: {studentGrade || "N/A"}
                                </p>
                            </div>
                        </div>
                    ) : status === 'failed' ? (
                        <div className="relative flex flex-col items-center">
                            <div className="relative flex items-center justify-center w-24 h-24 rounded-full border border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-955/20 animate-pulse mb-4">
                                <FailedIcon />
                            </div>
                            <p className="text-red-500 dark:text-red-400 text-sm font-semibold text-center px-6 max-w-[260px] leading-relaxed">
                                {errorMsg || "Tag scanned recently. Please wait before scanning again."}
                            </p>
                        </div>
                    ) : (
                        /* Standard scanning wait mode styled exactly like mock */
                        <div 
                            className="relative flex flex-col items-center cursor-pointer active:scale-95 transition-all duration-300"
                            onClick={handleSimulateScan}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSimulateScan(); }}
                            aria-label="Simulate NFC Scan"
                        >
                            <div className="relative w-36 h-36 flex items-center justify-center">
                                <div className="absolute w-full h-full rounded-full border border-[#E70D8D]/20 dark:border-[#E70D8D]/10 animate-pulse" />
                                <div className="absolute w-28 h-28 rounded-full border border-[#E70D8D]/40 dark:border-[#E70D8D]/20 animate-ping [animation-duration:3s]" />
                                <NfcIcon className="w-32 h-32 relative z-10" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sub-context instruction prompt */}
                {status === 'scanning' && !showProcessing && (
                    <p className="text-gray-500 dark:text-slate-400 text-xs text-center font-semibold max-w-[280px] leading-relaxed mb-6 px-2">
                        Hold your Terra GO Band or Bag Tag to the upper back of your phone to scan it.
                    </p>
                )}
                {showProcessing && (
                    <p className="text-gray-500 dark:text-slate-400 text-xs text-center font-semibold max-w-[280px] leading-relaxed mb-6 px-2 animate-pulse">
                        Please keep the band or bag tag near the reader...
                    </p>
                )}

                {/* Full-width brand-aligned buttons container */}
                <div className="w-full flex flex-col gap-2">
                    {status === 'success' && (
                        <div className="grid grid-cols-2 gap-3 w-full">
                            {onScanAnother && (
                                <button 
                                    onClick={handleActionScanAnother}
                                    className="w-full bg-[#303690] text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider text-center"
                                >
                                    Scan Again
                                </button>
                            )}
                            <button 
                                onClick={handleActionDone}
                                className={`w-full bg-[#E70D8D] text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider shadow-pink-100 dark:shadow-none text-center ${!onScanAnother ? 'col-span-2' : ''}`}
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {status === 'failed' && (
                        <>
                            {onRetry && (
                                <button 
                                    onClick={handleActionRetry}
                                    className="w-full bg-[#303690] text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider"
                                >
                                    Retry
                                </button>
                            )}
                            <button 
                                onClick={handleActionDone}
                                className="w-full bg-[#E70D8D] text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider shadow-pink-100 dark:shadow-none"
                            >
                                Cancel
                            </button>
                        </>
                    )}

                    {status === 'scanning' && (
                        <button 
                            onClick={handleActionDone}
                            disabled={showProcessing}
                            className="w-full bg-[#E70D8D] text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider disabled:opacity-50 shadow-pink-100 dark:shadow-none"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

const NfcSuccessModal: React.FC<{ student: Student; status: StudentStatus; onDismiss: () => void }> = ({ student, status, onDismiss }) => {
    const displayStatus = status === StudentStatus.Boarded ? 'Boarded' : 
                         status === StudentStatus.Alighted ? 'Alighted' : 
                         status === StudentStatus.InSchool ? 'Checked In' : 
                         status === StudentStatus.LeftSchool ? 'Checked Out' : 
                         status;

    return (
        <div className="absolute inset-x-0 top-12 z-[100] flex justify-center p-4">
            <div 
                onClick={onDismiss}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDismiss(); }}
                role="button"
                tabIndex={0}
                aria-label="Dismiss notification"
                className="bg-white rounded-2xl shadow-lg flex items-center p-3 pr-4 gap-4 w-full max-w-[280px] animate-popup-in-out border border-gray-100 cursor-pointer active:scale-[0.98] transition-all"
            >
                <div className="flex-shrink-0">
                    <img src={student.imgUrl} alt={student.name} className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm" />
                </div>
                
                <div className="flex-grow min-w-0">
                    <h4 className="font-bold text-sm text-gray-900 truncate leading-tight">{student.name}</h4>
                    <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
                        {student.grade} &bull; {displayStatus}
                    </p>
                </div>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                    <Icon name="xCircle" className="w-5 h-5" />
                </button>
            </div>
            <style>{`
                @keyframes popup-in-out {
                  0% { opacity: 0; transform: translateY(-30px) scale(0.9); }
                  10% { opacity: 1; transform: translateY(0) scale(1); }
                  90% { opacity: 1; transform: translateY(0) scale(1); }
                  100% { opacity: 0; transform: translateY(-20px) scale(0.95); }
                }
                .animate-popup-in-out { animation: popup-in-out 3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            `}</style>
        </div>
    );
};

const BoardingConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    onConfirm: (student: Student) => void;
    title?: string;
    confirmText?: string;
}> = ({ isOpen, onClose, student, onConfirm, title = "Confirmation", confirmText = "Confirm" }) => {
    if (!student) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex flex-col items-center pb-1">
                 <div className="relative mb-4 mt-1">
                    <div className="absolute inset-0 bg-pink-100 dark:bg-pink-950/20 rounded-full blur-lg opacity-40 animate-pulse"></div>
                    <img src={student.imgUrl} alt={student.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white shadow-lg relative z-10 object-cover" />
                    {student.alert && (
                        <div className="absolute -bottom-1 -right-1 bg-[#E70D8D] rounded-full p-1.5 border-2 border-white z-20 shadow-sm">
                            <Icon name="alertTriangle" className="w-4 h-4 text-white" />
                        </div>
                    )}
                 </div>
                 
                 <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-0.5">{student.name}</h3>
                 <p className="text-gray-500 font-medium text-xs mb-4">{student.grade} • {student.admissionNumber}</p>

                 {student.alert && (
                     <div className="w-full bg-pink-50 dark:bg-pink-950/25 rounded-xl p-3 mb-5 border border-pink-100 dark:border-pink-900/30 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#E70D8D]"></div>
                        <div className="flex flex-col items-center relative z-10">
                            <p className="text-[#E70D8D] font-bold text-[10px] uppercase tracking-widest mb-0.5">Alert</p>
                            <p className="text-gray-800 dark:text-slate-200 text-xs text-center font-semibold leading-relaxed">{student.alert}</p>
                        </div>
                     </div>
                 )}

                 {!student.alert && (
                     <p className="text-gray-600 dark:text-slate-350 text-xs text-center mb-5 px-4 leading-relaxed">
                        Please confirm the action for this student.
                     </p>
                 )}

                 <div className="grid grid-cols-2 gap-3 w-full">
                    <button onClick={onClose} className="py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-xs uppercase tracking-wider">
                        Cancel
                    </button>
                    <button onClick={() => onConfirm(student)} className="py-2.5 rounded-xl bg-[#E70D8D] text-white font-bold shadow-md shadow-pink-100 dark:shadow-none hover:opacity-95 transition-all transform active:scale-[0.98] text-xs uppercase tracking-wider">
                        {confirmText}
                    </button>
                 </div>
            </div>
        </Modal>
    );
};


const TripSummaryScreen: React.FC<{
    trip: Trip;
    onDone: () => void;
    onBack?: () => void;
    showToast?: (msg: string, type?: ToastType) => void;
}> = ({ trip, onDone, onBack }) => {
    const boardedCount = trip.students.filter(s => s.status === StudentStatus.Alighted || s.status === StudentStatus.Boarded).length;
    const alightedCount = trip.students.filter(s => s.status === StudentStatus.Alighted).length;
    const absentCount = trip.students.filter(s => s.status === StudentStatus.Absent).length;
    const duration = trip.endTime ? Math.round((trip.endTime.getTime() - trip.startTime.getTime()) / 60000) : 0;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100">
            <Header title="Trip Summary" onBack={onBack || onDone} />
            <div className="flex-grow p-6 overflow-y-auto min-h-0">
                <div className="bg-[#E70D8D] rounded-2xl shadow-lg p-6 mb-6 text-center text-white relative overflow-hidden">
                     <div className="absolute -top-10 -right-10 w-32 h-32 bg-white rounded-full blur-2xl opacity-20"></div>
                     <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-1">{trip.type} Trip Completed</h2>
                        <p className="text-pink-100">{trip.route.name}</p>
                     </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <SummaryCard icon="clock" label="Duration" value={`${duration} min`} />
                    <SummaryCard icon="users" label="Boarded" value={`${boardedCount}`} />
                    <SummaryCard icon="logOut" label="Alighted" value={`${alightedCount}`} />
                    <SummaryCard icon="xCircle" label="Absent" value={`${absentCount}`} />
                </div>
                <div>
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase text-gray-500 dark:text-slate-400 tracking-wider">Issues Reported</h3>
                        <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">
                            {trip.issues.length === 0 ? 'None' : `${trip.issues.length}`}
                        </span>
                    </div>
                    {trip.issues.length > 0 && (
                        <ul className="mt-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 space-y-3">
                            {trip.issues.map((issue, index) => (
                                <li key={index} className="border-b border-gray-100 dark:border-slate-800 last:border-b-0 pb-2 last:pb-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-gray-800 dark:text-slate-200">{issue.type}</p>
                                        {issue.recipientType === 'parent' ? (
                                            <span className="text-[10px] font-bold bg-pink-100 dark:bg-pink-900/40 text-[#E70D8D] px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Icon name="users" className="w-3 h-3" />
                                                {issue.recipientCount ? `${issue.recipientCount} Parents Notified` : 'Parents Notified'}
                                            </span>
                                        ) : issue.recipientType === 'school' ? (
                                            <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-[#303690] dark:text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Icon name="shield" className="w-3 h-3" />
                                                School Notified
                                            </span>
                                        ) : null}
                                    </div>
                                    {issue.note && <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{issue.note}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
                 <button 
                     onClick={onDone} 
                     className="w-full bg-[#E70D8D] text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all h-14 flex items-center justify-center text-base cursor-pointer"
                 >
                     Back to Home
                 </button>
            </div>
        </div>
    );
};

const SummaryCard: React.FC<{ icon: IconName; label: string; value: string; onClick?: () => void; }> = ({ icon, label, value, onClick }) => (
    <button 
        onClick={onClick}
        disabled={!onClick}
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 flex flex-col items-center justify-center w-full ${onClick ? 'cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-950/20 hover:border-pink-200 dark:hover:border-pink-900/40 transition-all active:scale-95' : ''}`}
    >
        <div className="bg-pink-50 dark:bg-pink-950/45 p-3 rounded-full mb-3">
             <Icon name={icon} className="w-5 h-5 text-[#E70D8D] dark:text-pink-400"/>
        </div>
        <p className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide mb-1">{label}</p>
        <p className="font-bold text-2xl text-gray-800 dark:text-slate-100">{value}</p>
    </button>
);

const GateAttendanceScreen: React.FC<{ onBack: () => void; onGuardianVerify: () => void; showToast: (msg: string, type?: ToastType) => void; onScanned: (data: {student: Student, status: StudentStatus} | null) => void; selectedGateLocation: GateLocation | null; }> = ({ onBack, onGuardianVerify, showToast, onScanned, selectedGateLocation }) => {
    const [students, setStudents] = useState<Student[]>(GATE_MOCK_STUDENTS);
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'checkin' | 'checkout'>('checkin');
    const [manualMode, setManualMode] = useState(false);
    const [isQuickScanModeActive, setIsQuickScanModeActive] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [activeStudent, setActiveStudent] = useState<Student | null>(null);
    const [studentToConfirm, setStudentToConfirm] = useState<Student | null>(null);
    const [scanResult, setScanResult] = useState<{status: 'success' | 'failed', student?: Student, message?: string} | null>(null);
    const [scanCount, setScanCount] = useState(0);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const handleViewChange = (newView: 'checkin' | 'checkout') => {
        setView(newView);
        setSelectedStudentIds([]);
    };

    const handleManualModeToggle = (checked: boolean) => {
        setManualMode(checked);
        setSelectedStudentIds([]);
        if (checked && isQuickScanModeActive) {
            setIsQuickScanModeActive(false);
        }
    };

    const studentsToShow = useMemo(() => {
        let list = students;
        if (view === 'checkin') {
            list = students.filter(s => s.status === StudentStatus.NotArrived || s.status === StudentStatus.Absent);
        } else {
            list = students.filter(s => s.status === StudentStatus.InSchool);
        }
        if (!searchTerm) return list;
        return list.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [students, view, searchTerm]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const allVisibleSelected = studentsToShow.length > 0 && selectedStudentIds.length === studentsToShow.length;
            const someSelected = selectedStudentIds.length > 0 && selectedStudentIds.length < studentsToShow.length;
            selectAllCheckboxRef.current.checked = allVisibleSelected;
            selectAllCheckboxRef.current.indeterminate = someSelected;
        }
    }, [selectedStudentIds, studentsToShow]);

    const handleManualScan = () => {
        const isSuccess = scanCount % 2 === 0;
        setScanCount(prev => prev + 1);

        if (isSuccess) {
            const targetStatus = view === 'checkin' ? StudentStatus.NotArrived : StudentStatus.InSchool;
            const nextStatus = view === 'checkin' ? StudentStatus.InSchool : StudentStatus.LeftSchool;
            const studentToProcess = students.find(s => s.status === targetStatus);

            if (studentToProcess) {
                // Quick scan is silent
                performUpdate(studentToProcess, nextStatus, true);
                setScanResult({ status: 'success', student: studentToProcess });
            } else {
                showToast(`All students ${view === 'checkin' ? 'checked in' : 'checked out'}.`, 'info');
            }
        } else {
            setScanResult({ 
                status: 'failed', 
                message: scanCount % 4 === 1 ? "Child is in the wrong route." : "Failed identification of the band." 
            });
        }
    };

    const performUpdate = (student: Student, newStatus: StudentStatus, silent: boolean = false) => {
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: newStatus, lastUpdateTime: new Date() } : s));
        onScanned({ student, status: newStatus }, silent);
    };

    const handleStudentAction = (student: Student, newStatus: StudentStatus) => {
        if (newStatus === StudentStatus.InSchool && view === 'checkin') {
            if (student.alert) {
                setStudentToConfirm(student);
                return;
            }
            // Manual check-in
            setStudentToConfirm(student);
        } else if (newStatus === StudentStatus.LeftSchool && view === 'checkout') {
            // Manual check-out
            setStudentToConfirm(student);
        } else {
            performUpdate(student, newStatus);
        }
    };

    const handleToggleSelect = (studentId: string) => {
        setSelectedStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudentIds(studentsToShow.map(s => s.id));
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleBulkUpdate = (status: StudentStatus) => {
        setStudents(prev => prev.map(s => selectedStudentIds.includes(s.id) ? { ...s, status, lastUpdateTime: new Date() } : s));
        setSelectedStudentIds([]);
        showToast(`${selectedStudentIds.length} students updated.`, 'info');
    };
    
    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
            <Header title={selectedGateLocation ? `${selectedGateLocation.name} Attendance` : "Attendance"} onBack={onBack}/>
             <div className="bg-white dark:bg-slate-900 px-4 py-3 border-b border-gray-100 dark:border-slate-800 animate-fade-in">
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-slate-400">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">In School</span>
                        <span className="font-bold text-xl text-[#303690] dark:text-white">{students.filter(s => s.status === StudentStatus.InSchool).length}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Departed</span>
                        <span className="font-bold text-xl text-gray-650 dark:text-slate-300">{students.filter(s => s.status === StudentStatus.LeftSchool).length}</span>
                    </div>
                </div>
            </div>
             <div className="flex bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                <button 
                    className={`flex-1 p-3 font-semibold text-sm transition-colors relative ${view === 'checkin' ? 'text-[#E70D8D]' : 'text-gray-500 dark:text-slate-400'}`} 
                    onClick={() => handleViewChange('checkin')}
                >
                    Arrivals
                    {view === 'checkin' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E70D8D]"></div>}
                </button>
                <button 
                    className={`flex-1 p-3 font-semibold text-sm transition-colors relative ${view === 'checkout' ? 'text-[#E70D8D]' : 'text-gray-500 dark:text-slate-400'}`} 
                    onClick={() => handleViewChange('checkout')}
                >
                    Departures
                    {view === 'checkout' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E70D8D]"></div>}
                </button>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-50 dark:border-slate-800 sticky top-[165px] z-10 animate-fade-in">
                <div className="flex items-center gap-2.5 mb-4 w-full">
                     <ModeToggle 
                        label="Quick Scan"
                        icon="zap"
                        checked={isQuickScanModeActive}
                        hasSwitch={false}
                        onChange={(checked) => {
                            setIsQuickScanModeActive(checked);
                            if(checked) handleManualModeToggle(false);
                        }}
                    />
                    <ModeToggle 
                        label="Manual Mode"
                        icon="userCheck"
                        checked={manualMode}
                        hasSwitch={true}
                        onChange={handleManualModeToggle}
                    />
                </div>
                <div className="relative">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
                    <input type="text" placeholder="Search student..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 text-sm text-gray-800 dark:text-slate-100 border border-transparent dark:border-slate-700"/>
                </div>
                {manualMode && (
                    <div className="flex items-center gap-2 mt-3 pl-1">
                        <input 
                            type="checkbox" 
                            id="select-all-gate" 
                            ref={selectAllCheckboxRef}
                            onChange={handleSelectAll}
                            className="w-5 h-5 rounded text-[#E70D8D] border-gray-300 dark:border-slate-700 focus:ring-[#E70D8D]" 
                        />
                        <label htmlFor="select-all-gate" className="text-xs font-bold uppercase text-gray-500 dark:text-slate-450 select-none">Select All Students</label>
                    </div>
                )}
            </div>
            <div className="flex-grow overflow-y-auto min-h-0 pb-24 bg-white dark:bg-slate-950">
                {isQuickScanModeActive && (
                    <NfcScanningOverlay 
                        activeText="Quick Scan Active" 
                        onDone={() => setIsQuickScanModeActive(false)} 
                        onScanTrigger={handleManualScan}
                        status={scanResult?.status}
                        studentName={scanResult?.student?.name}
                        studentImage={scanResult?.student?.imgUrl}
                        studentGrade={scanResult?.student?.grade}
                        errorMsg={scanResult?.message}
                        onRetry={() => setScanResult(null)}
                        onScanAnother={() => setScanResult(null)}
                    />
                )}
                {studentsToShow.length > 0 ? (
                    <ul>{studentsToShow.map(student => (
                       <StudentListItem 
                            key={student.id} 
                            student={student} 
                            onSelect={setActiveStudent} 
                            bulkMode={manualMode} 
                            isSelected={selectedStudentIds.includes(student.id)} 
                            onToggleSelect={handleToggleSelect} 
                            view={view} 
                            onUpdateStatus={handleStudentAction} 
                        />
                    ))}</ul>
                ) : (
                    <div className="text-center p-8 text-gray-400 dark:text-slate-500 mt-8">
                         <div className="bg-gray-50 dark:bg-slate-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                            <Icon name={view === 'checkin' ? 'logIn' : 'logOut'} className="w-10 h-10 text-gray-300 dark:text-slate-600"/>
                        </div>
                        <p className="font-semibold text-gray-600 dark:text-slate-450">{view === 'checkin' ? 'No arrivals pending.' : 'No departures pending.'}</p>
                    </div>
                )}
            </div>

            {manualMode && selectedStudentIds.length > 0 ? (
                 <div className="absolute bottom-4 left-4 right-4 bg-[#303690] dark:bg-slate-900 border dark:border-slate-800 shadow-2xl text-white p-4 rounded-xl flex justify-between items-center z-20 animate-slide-up-button">
                    <p className="font-bold">{selectedStudentIds.length} selected</p>
                    <div className="flex gap-2">
                         {view === 'checkin' && <>
                            <button onClick={() => handleBulkUpdate(StudentStatus.InSchool)} className="bg-[#E70D8D] text-white font-bold px-4 py-2 rounded-xl text-sm hover:opacity-95 text-xs transition-colors">Check In</button>
                            <button onClick={() => handleBulkUpdate(StudentStatus.Absent)} className="bg-white/20 text-white font-bold px-4 py-2 rounded-xl text-sm hover:opacity-95 text-xs transition-colors">Absent</button>
                         </>}
                         {view === 'checkout' && <button onClick={() => handleBulkUpdate(StudentStatus.LeftSchool)} className="bg-[#E70D8D] text-white font-bold px-4 py-2 rounded-xl text-sm hover:opacity-95 text-xs transition-colors">Check Out</button>}
                    </div>
                </div>
            ) : (
                !manualMode && (
                    <div className="bg-white dark:bg-slate-900 p-4 border-t border-gray-100 dark:border-slate-800 shadow-2xl animate-fade-in"><button onClick={onGuardianVerify} className="w-full bg-[#E70D8D] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-colors shadow-lg shadow-pink-100 dark:shadow-none"><Icon name="shield" className="w-5 h-5"/>Guardian Verification for Pickup</button></div>
                )
            )}
            
            {scanResult && (
                <NfcScanningOverlay 
                    status={scanResult.status}
                    studentName={scanResult.student?.name}
                    studentImage={scanResult.student?.imgUrl}
                    studentGrade={scanResult.student?.grade}
                    errorMsg={scanResult.message}
                    onDone={() => setScanResult(null)}
                    onRetry={() => { setScanResult(null); }}
                    onScanAnother={() => { setScanResult(null); }}
                />
            )}
            <BoardingConfirmationModal
                isOpen={!!studentToConfirm}
                onClose={() => setStudentToConfirm(null)}
                student={studentToConfirm}
                onConfirm={(confirmedStudent) => {
                    const nextStatus = view === 'checkin' ? StudentStatus.InSchool : StudentStatus.LeftSchool;
                    setStudentToConfirm(null);
                    // Manual confirmation shows the top notification
                    performUpdate(confirmedStudent, nextStatus);
                }}
                title={view === 'checkin' ? "Check-in Confirmation" : "Check-out Confirmation"}
                confirmText={view === 'checkin' ? "Confirm Check-in" : "Confirm Check-out"}
            />
             <StudentActionModal
                isOpen={!!activeStudent}
                onClose={() => setActiveStudent(null)}
                student={activeStudent}
                onUpdateStatus={handleStudentAction}
                onNotify={(name) => showToast(`Notifying ${name}'s guardian.`, 'info')}
                onCall={(name) => showToast(`Calling ${name}'s guardian.`, 'info')}
                mode="gate"
                allStudents={students}
            />
             <style>{`.toggle-checkbox:checked { right: 0; border-color: #E70D8D; } .toggle-checkbox:checked + .toggle-label { background-color: #E70D8D; } .toggle-label { transition: background-color 0.2s ease-in-out; }`}</style>
        </div>
    );
};

const ProfileScreen: React.FC<{ onBack: () => void; onLogoutClick: () => void; onSettingsClick: () => void; staff?: StaffMember; }> = ({ onBack, onLogoutClick, onSettingsClick, staff }) => {
    const { selectedVehicle } = useVehicle();
    const staffName = staff?.name || MOCK_DRIVER.name;
    const staffPartner = staff?.partnerName || MOCK_DRIVER.partnerName;
    const staffRoleLabel = staff?.role === 'minder' ? 'Terra GO Minder' : 'Terra GO Driver';
    const staffPhone = staff?.phone || MOCK_DRIVER.phone;
    const staffEmail = staff?.email || 'driver@terra.go';

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
            <Header title={staff?.role === 'minder' ? "Minder Profile" : "Driver Profile"} onBack={onBack}/>
            <div className="flex-grow p-6 overflow-y-auto min-h-0">
                <div className="text-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-pink-100 dark:from-pink-950/20 to-transparent rounded-t-full opacity-50 -z-10"></div>
                    <div className="relative inline-block">
                        <ProfileAvatar 
                            name={staffName} 
                            imgUrl={staff?.imgUrl || MOCK_DRIVER.imgUrl} 
                            sizeClassName="w-32 h-32" 
                            textSizeClassName="text-4xl"
                            className="mx-auto mb-4 border-4 border-white dark:border-slate-800 shadow-lg" 
                        />
                        <div className="absolute bottom-4 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-white dark:border-slate-800"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-[#303690] dark:text-white">{staffName}</h2>
                    <p className="text-gray-500 dark:text-slate-400 font-medium">{staffRoleLabel}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-805 p-2 mt-8 text-left space-y-1">
                    <ProfileInfoItem icon="phone" label="Mobile Phone" value={staffPhone} />
                    <ProfileInfoItem icon="mail" label="Staff Email" value={staffEmail} />
                    <ProfileInfoItem icon="bus" label="Assigned Vehicle" value={selectedVehicle.registration} />
                    <ProfileInfoItem icon="mapPin" label="Assigned Zone" value={selectedVehicle.zone} />
                    <ProfileInfoItem icon="users" label="Partner" value={staffPartner} />
                    <ProfileInfoItem icon="settings" label="Settings" value="" isAction={true} onClick={onSettingsClick} />
                </div>
                <button onClick={onLogoutClick} className="w-full mt-8 bg-red-50 dark:bg-red-950/25 text-red-600 dark:text-red-400 font-bold p-4 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">Logout</button>
            </div>
        </div>
    );
};

const ProfileInfoItem: React.FC<{ icon: IconName; label: string; value: string; isAction?: boolean, onClick?: () => void; }> = ({ icon, label, value, isAction, onClick }) => (
    <button 
        className={`flex items-center p-4 rounded-xl w-full text-left ${isAction ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40' : ''}`} 
        onClick={onClick}
        disabled={!onClick}
    >
        <div className={`p-2 rounded-full ${isAction ? 'bg-gray-100 dark:bg-slate-800' : 'bg-pink-50 dark:bg-pink-950/20'}`}>
             <Icon name={icon} className={`w-5 h-5 ${isAction ? 'text-gray-500 dark:text-slate-400' : 'text-[#E70D8D] dark:text-pink-400'}`}/>
        </div>
        <p className="ml-4 text-gray-600 dark:text-slate-300 font-medium">{label}</p>
        <p className={`ml-auto font-bold ${isAction ? 'text-[#E70D8D] dark:text-pink-400' : 'text-gray-800 dark:text-slate-100'}`}>{value}</p>
        {isAction && <Icon name="arrowRight" className="w-5 h-5 ml-2 text-gray-400 dark:text-slate-500" />}
    </button>
);

const SettingsScreen: React.FC<{
    onBack: () => void;
    settings: { notifications: boolean; offlineMode: boolean; darkMode: boolean; };
    onSettingChange: (key: string, value: boolean) => void;
    dataUsage: number;
    onOpenDataHistory: () => void;
    otaStatus: string;
    onOpenOTA: () => void;
    onOpenSupport: () => void;
}> = ({ onBack, settings, onSettingChange, dataUsage, onOpenDataHistory, otaStatus, onOpenOTA, onOpenSupport }) => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
        <Header title="Settings" onBack={onBack} />
        <div className="flex-grow p-6 overflow-y-auto min-h-0 space-y-8">
            <SettingsSection title="General">
                <SettingsToggleItem id="notif-toggle" icon="bell" label="Notifications" isChecked={settings.notifications} onToggle={() => onSettingChange('notifications', !settings.notifications)} />
                <SettingsToggleItem id="dark-toggle" icon="moon" label="Dark Mode" isChecked={settings.darkMode} onToggle={() => onSettingChange('darkMode', !settings.darkMode)} />
            </SettingsSection>
            <SettingsSection title="Data & Sync">
                <SettingsActionItem icon="database" label="Data Usage" value={`${dataUsage} MB`} onClick={onOpenDataHistory} isLink/>
                <SettingsToggleItem id="offline-toggle" icon="wifiOff" label="Offline Mode" isChecked={settings.offlineMode} onToggle={() => onSettingChange('offlineMode', !settings.offlineMode)} />
            </SettingsSection>
             <SettingsSection title="Support">
                <SettingsActionItem icon="helpCircle" label="Help & Support" onClick={onOpenSupport} isLink />
                <SettingsActionItem icon="shield" label="Privacy Policy" isLink />
                <div className="flex items-center p-4">
                    <Icon name="info" className="w-5 h-5 text-gray-400 dark:text-gray-500"/>
                    <p className="ml-4 text-gray-600 dark:text-slate-300 font-medium flex-grow">App Version</p>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 dark:text-slate-100">{APP_VERSION}</p>
                        {otaStatus === 'available' && (
                            <button 
                                onClick={onOpenOTA}
                                className="bg-[#E70D8D] text-white text-[8px] font-bold px-2 py-1 rounded-full animate-pulse"
                            >
                                Update Available
                            </button>
                        )}
                    </div>
                </div>
            </SettingsSection>
        </div>
    </div>
);

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase px-4 mb-2 tracking-wider">{title}</h2>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-2 space-y-1">{children}</div>
    </div>
);

const SettingsToggleItem: React.FC<{ icon: IconName; label: string; isChecked: boolean; onToggle: () => void; id: string; }> = ({ icon, label, isChecked, onToggle, id }) => (
    <div className="flex items-center p-4">
        <Icon name={icon} className="w-5 h-5 text-gray-400 dark:text-gray-500"/>
        <p className="ml-4 text-gray-600 dark:text-slate-350 font-medium flex-grow">{label}</p>
        <div className="relative inline-block w-10 align-middle select-none">
            <input type="checkbox" id={id} name="toggle" checked={isChecked} onChange={onToggle} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 dark:border-slate-700 appearance-none cursor-pointer top-0.5 left-0.5"/>
            <label htmlFor={id} className="toggle-label block overflow-hidden h-7 rounded-full bg-gray-200 dark:bg-slate-700 cursor-pointer">
                <span className="sr-only">{label}</span>
            </label>
        </div>
        <style>{`.toggle-checkbox:checked { right: 0; border-color: #E70D8D; } .toggle-checkbox:checked + .toggle-label { background-color: #E70D8D; } .toggle-label { transition: background-color 0.2s ease-in-out; }`}</style>
    </div>
);

const SettingsActionItem: React.FC<{ icon: IconName; label: string; value?: string; onClick?: () => void; isLink?: boolean, actionText?: string; }> = ({ icon, label, value, onClick, isLink, actionText }) => (
    <button 
        className={`flex items-center p-4 rounded-xl w-full text-left ${onClick || isLink ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50' : ''}`} 
        onClick={onClick}
        disabled={!onClick && !isLink}
    >
        <Icon name={icon} className="w-5 h-5 text-gray-400 dark:text-gray-500"/>
        <p className="ml-4 text-gray-600 dark:text-slate-350 font-medium flex-grow">{label}</p>
        {value && <p className="font-bold text-gray-800 dark:text-slate-100">{value}</p>}
        {actionText && <button className="font-bold text-red-500 ml-4 text-sm" onClick={(e) => { e.stopPropagation(); if (onClick) onClick(); }}>{actionText}</button>}
        {isLink && <Icon name="arrowRight" className="w-5 h-5 ml-2 text-gray-400 dark:text-gray-500" />}
    </button>
);


const SupportScreen: React.FC<{ onBack: () => void; }> = ({ onBack }) => {
    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
            <Header title="Help & Support" onBack={onBack}/>
            <div className="flex-grow p-6 overflow-y-auto min-h-0">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-slate-800 text-center animate-fade-in">
                    <div className="bg-blue-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon name="phone" className="w-10 h-10 text-[#303690] dark:text-white"/>
                    </div>
                    <h3 className="text-2xl font-black text-[#303690] dark:text-slate-100 mb-2">Need Assistance?</h3>
                    <p className="text-gray-500 dark:text-slate-400 mb-8 px-4 leading-relaxed">
                        Our support team is available to help you with any issues strictly related to the Terra GO App.
                    </p>
                    
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/60">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Support Helpline</p>
                            <p className="text-2xl font-black text-gray-800 dark:text-slate-100 tracking-tight">+254 700 000 000</p>
                        </div>
                        
                        <div className="bg-pink-50/50 dark:bg-pink-950/20 p-5 rounded-2xl border border-pink-100 dark:border-pink-955/35 text-left flex gap-4">
                            <Icon name="info" className="w-6 h-6 text-[#E70D8D] dark:text-pink-400 flex-shrink-0 mt-1"/>
                            <div>
                                <p className="font-bold text-[#E70D8D] dark:text-pink-400 text-sm">How to Contact Us</p>
                                <p className="text-xs text-pink-700/80 dark:text-pink-300 mt-1 leading-relaxed font-medium">
                                    Direct calls from this application are disabled for security. Please <strong>Call</strong> the number above from your device&apos;s dialer.
                                </p>
                             </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400 dark:text-slate-500">Available Monday - Friday | 8:00 AM - 5:00 PM</p>
                </div>
            </div>
        </div>
    );
};

const BandIdentificationScreen: React.FC<{ onBack: () => void; showToast: (msg: string, type?: ToastType) => void }> = ({ onBack, showToast }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [identifiedStudent, setIdentifiedStudent] = useState<Student | null>(null);
    const [unassignedTag, setUnassignedTag] = useState<string | null>(null);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [serialNumber, setSerialNumber] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleStartScan = () => {
        setIsScanning(true);
    };

    const handleScanComplete = (student: Student) => {
        setIsScanning(false);
        setIdentifiedStudent(student);
        setUnassignedTag(null);
        setIsManualEntry(false);
    };

    const handleManualSearch = () => {
        if (!serialNumber.trim()) return;
        setIsSearching(true);
        setTimeout(() => {
            setIsSearching(false);
            const normalized = serialNumber.trim().toUpperCase();
            // Guarantee unassigned state if user inputs special triggers, or give random 35% chance
            const isUnassigned = normalized.includes('404') || normalized.includes('UNASSIGNED') || normalized.includes('0000') || Math.random() < 0.35;
            
            if (isUnassigned) {
                setUnassignedTag(normalized);
                setIdentifiedStudent(null);
                setIsManualEntry(false);
                showToast(`Band ${normalized} is not assigned.`, 'info');
            } else {
                const student = MOCK_STUDENTS[Math.floor(Math.random() * MOCK_STUDENTS.length)];
                setUnassignedTag(null);
                handleScanComplete(student);
                showToast(`Found student: ${student.name}`, 'success');
            }
        }, 1500);
    };

    const handleDeactivate = () => {
        setIsDeactivating(true);
        setTimeout(() => {
            setIsDeactivating(false);
            showToast(`Tag/Band for ${identifiedStudent?.name} has been deactivated.`, 'success');
            setIdentifiedStudent(null);
        }, 2000);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100">
            <Header title="Identify Band/Tag" onBack={onBack}/>
            
            <div className="flex-grow p-6 flex flex-col overflow-y-auto min-h-0">
                {unassignedTag ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
                        <div className="w-48 h-48 bg-pink-50/50 dark:bg-pink-950/15 rounded-full border-4 border-dashed border-pink-200 dark:border-pink-900/30 flex items-center justify-center mb-6 relative">
                            <div className="w-36 h-36 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-pink-100 dark:border-pink-950/40 flex items-center justify-center">
                                <Icon name="zap" className="w-16 h-16 text-gray-300 dark:text-slate-600 animate-pulse"/>
                            </div>
                            <div className="absolute top-2 right-2 bg-pink-500 p-2.5 rounded-full border-4 border-white dark:border-slate-800 shadow-md">
                                <Icon name="xCircle" className="w-5 h-5 text-white"/>
                            </div>
                        </div>

                        <span className="bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-350 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block">
                            Band/Tag Unassigned
                        </span>

                        <h2 className="text-2xl font-black text-[#303690] dark:text-white mb-2">No Registered Owner</h2>
                        <p className="text-gray-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed text-sm px-4">
                            The serial key <strong className="text-gray-700 dark:text-slate-300 font-mono font-bold bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{unassignedTag}</strong> is active in the system, but has not been associated with any student account yet.
                        </p>

                        <div className="bg-blue-50 dark:bg-blue-955/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30 text-left max-w-md w-full mb-8 flex gap-3">
                            <Icon name="info" className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"/>
                            <div>
                                <p className="font-bold text-blue-800 dark:text-indigo-300 text-xs uppercase tracking-wider mb-0.5">What should I do?</p>
                                <p className="text-xs text-blue-750 dark:text-slate-350 leading-relaxed font-medium">
                                    You can return this band/tag back to the front office setup desk to assign it to a student, or continue checking other tags.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col w-full gap-3 max-w-sm">
                            <button 
                                onClick={() => {
                                    setUnassignedTag(null);
                                    setIsManualEntry(false);
                                    setIsScanning(false);
                                    setSerialNumber('');
                                }}
                                className="w-full bg-[#E70D8D] text-white font-black py-4 rounded-xl shadow-lg shadow-pink-200 dark:shadow-none hover:opacity-95 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                <Icon name="zap" className="w-4 h-4"/>
                                Scan Next Band / Tag
                            </button>
                            
                            <button 
                                onClick={() => {
                                    setUnassignedTag(null);
                                    setIsManualEntry(true);
                                    setSerialNumber('');
                                }}
                                className="w-full bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 font-bold py-3.5 rounded-xl border border-gray-250 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60 hover:text-gray-850 transition-colors text-sm"
                            >
                                Manually Search Different Serial
                            </button>
                        </div>
                    </div>
                ) : !identifiedStudent ? (
                    !isManualEntry ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center">
                            <div className="w-64 h-64 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-850 flex items-center justify-center mb-8 pulse-slow">
                                <Icon name="zap" className="w-24 h-24 text-[#E70D8D] dark:text-pink-500 opacity-20"/>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">Lost Tag or Band Found?</h3>
                            <p className="text-gray-500 dark:text-slate-400 mb-8 px-8 text-sm">Scan a Terra GO band or bag tag to see which student it belongs to.</p>
                            
                            <div className="flex flex-col w-full gap-3">
                                <button 
                                    onClick={handleStartScan}
                                    className="w-full bg-[#E70D8D] text-white font-bold px-10 py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all h-14 text-sm"
                                >
                                    <Icon name="zap" className="w-5 h-5"/>
                                    Start Scanning
                                </button>
                                
                                <button 
                                    onClick={() => setIsManualEntry(true)}
                                    className="text-xs font-bold text-[#E70D8D] dark:text-pink-400 hover:opacity-80 transition-opacity py-2 underline underline-offset-4"
                                >
                                    Enter Band/Bag Tag Serial Manually
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 mb-6">
                                <h3 className="text-lg font-bold text-[#303690] dark:text-white mb-4 text-center">Manual Serial Search</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="serial-input" className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Serial Number</label>
                                        <input 
                                            id="serial-input"
                                            type="text" 
                                            placeholder="e.g. TG-BAND-1234" 
                                            value={serialNumber}
                                            onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-4 text-lg font-bold text-[#303690] dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-905/30 mb-4"
                                        />
                                        
                                        <div className="bg-pink-50/40 dark:bg-pink-955/15 border border-pink-100/50 dark:border-pink-900/30 rounded-xl p-3 text-center">
                                            <p className="text-xs text-pink-700/90 dark:text-pink-300 leading-tight font-medium">
                                                💡 <strong>Quick Test:</strong> Use a serial matching <strong>404</strong>, <strong>0000</strong>, or <strong>UNASSIGNED</strong> to force the new unassigned card view.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={handleManualSearch}
                                        disabled={isSearching || !serialNumber.trim()}
                                        className="w-full bg-[#E70D8D] text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 h-14 disabled:opacity-50 transition-all text-sm"
                                    >
                                        {isSearching ? <Spinner className="text-white"/> : <><Icon name="search" className="w-5 h-5"/> Search Owner</>}
                                    </button>
                                    
                                    <button 
                                        onClick={() => setIsManualEntry(false)}
                                        className="w-full text-gray-500 dark:text-slate-400 font-bold py-2 text-sm hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 dark:bg-blue-955/15 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30 flex gap-4">
                                <div className="bg-white dark:bg-slate-850 p-3 rounded-xl shadow-sm border border-blue-50 dark:border-slate-800 flex-shrink-0">
                                    <div className="w-10 h-6 border-2 border-[#303690] dark:border-indigo-400 rounded-sm relative flex items-center justify-end pr-1">
                                        <div className="w-1.5 h-1 bg-pink-500 rounded-full animate-pulse"></div>
                                        <div className="absolute -left-1 top-1.5 w-1 h-3 bg-[#303690] dark:bg-indigo-400 rounded-l-sm"></div>
                                    </div>
                                </div>
                                <div className="flex-grow">
                                    <p className="font-bold text-[#303690] dark:text-white text-sm italic">Where is the serial?</p>
                                    <p className="text-xs text-blue-700/80 dark:text-slate-350 mt-1 leading-relaxed font-medium">
                                        Flip the band over. The serial number is printed on the <strong>inner strap</strong>, usually near the buckle or the tag loop.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 overflow-y-auto">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 text-center">
                            <div className="relative inline-block mb-4">
                                <img src={identifiedStudent.imgUrl} alt={identifiedStudent.name} className="w-32 h-32 rounded-full border-4 border-pink-50 dark:border-pink-900/10 object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute top-0 right-0 bg-[#E70D8D] p-2 rounded-full border-4 border-white dark:border-slate-900">
                                    <Icon name="check" className="w-4 h-4 text-white"/>
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-[#303690] dark:text-white">{identifiedStudent.name}</h2>
                            <p className="text-gray-500 dark:text-slate-450 font-bold uppercase tracking-widest text-[10px] mt-1">{identifiedStudent.grade} &bull; {identifiedStudent.admissionNumber}</p>
                            
                            <div className="mt-6 pt-6 border-t border-gray-50 dark:border-slate-800 grid grid-cols-2 gap-4">
                               <div className="bg-blue-50/50 dark:bg-blue-955/20 p-4 rounded-2xl text-left">
                                   <p className="text-[8px] font-bold text-blue-400 dark:text-indigo-400 uppercase tracking-widest mb-1">Status</p>
                                   <p className="font-bold text-blue-700 dark:text-indigo-300 text-sm">Active Tag/Band</p>
                               </div>
                               <div className="bg-pink-50/50 dark:bg-pink-955/20 p-4 rounded-2xl text-left">
                                   <p className="text-[8px] font-bold text-pink-400 dark:text-pink-400 uppercase tracking-widest mb-1">Last Update</p>
                                   <p className="font-bold text-pink-700 dark:text-pink-300 text-sm">Today, 08:30</p>
                               </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-955/15 rounded-2xl p-5 border border-yellow-100 dark:border-yellow-900/30 flex gap-4">
                            <Icon name="alertTriangle" className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0"/>
                            <div>
                                <p className="font-bold text-yellow-700 dark:text-yellow-500 text-sm">Owner Not Found?</p>
                                <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1 font-medium">If you cannot find the student, you can temporarily deactivate this band to prevent misuse.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <button 
                                onClick={handleDeactivate}
                                disabled={isDeactivating}
                                className="w-full bg-red-50 dark:bg-red-955/25 text-red-600 dark:text-red-400 font-bold py-4 rounded-2xl border border-red-100 dark:border-red-950/40 flex items-center justify-center gap-2 h-14"
                            >
                                {isDeactivating ? <Spinner className="text-red-600"/> : <><Icon name="xCircle" className="w-5 h-5"/> Deactivate Tag/Band</>}
                            </button>
                            <button 
                                onClick={() => setIdentifiedStudent(null)}
                                className="w-full bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 font-bold py-4 rounded-2xl border border-gray-100 dark:border-slate-800 h-14 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                            >
                                Finish
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isScanning && (
                <NfcScanningOverlay 
                    onDone={() => setIsScanning(false)}
                    onScanTrigger={() => {
                        const isUnassigned = Math.random() < 0.35;
                        if (isUnassigned) {
                            const mockSerial = `TG-BAND-${Math.floor(1000 + Math.random() * 9000)}`;
                            setIsScanning(false);
                            setUnassignedTag(mockSerial);
                            setIdentifiedStudent(null);
                            setIsManualEntry(false);
                            showToast(`Scanned unassigned band: ${mockSerial}`, 'info');
                        } else {
                            handleScanComplete(MOCK_STUDENTS[Math.floor(Math.random() * MOCK_STUDENTS.length)]);
                        }
                    }}
                    activeText="Place tag/band near device to identify"
                />
            )}
            
            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.8; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.02); }
                }
                .pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

const DELAY_PRESETS = ['5 min', '10 min', '15 min', '20 min', '25 min', '30 min', '40 min', '45 min', '50 min', '60 min'];

const DelayReportModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onReport: (issue: Issue) => void;
    students?: Student[];
}> = ({ isOpen, onClose, onReport, students = [] }) => {
    const [step, setStep] = useState<'type' | 'recipient' | 'school' | 'parent'>('type');
    const [issueType, setIssueType] = useState<IssueType>(IssueType.Delay);
    const [recipientAudience, setRecipientAudience] = useState<'all' | 'custom'>('all');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() => students.map(s => s.id));
    const [selectedPresetTime, setSelectedPresetTime] = useState<string | null>(null);
    const [customMinutes, setCustomMinutes] = useState<string>('');
    const [note, setNote] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isReporting, setIsReporting] = useState(false);

    const toggleStudent = (id: string) => {
        setSelectedStudentIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        setSelectedStudentIds(students.map(s => s.id));
    };

    const handleClearAll = () => {
        setSelectedStudentIds([]);
    };

    const handleApplyPreset = (minutesText: string) => {
        setSelectedPresetTime(minutesText);
        setCustomMinutes('');
        setNote(`Delayed by ~${minutesText}. Bus is on the way.`);
    };

    const handleCustomMinutesChange = (val: string) => {
        setCustomMinutes(val);
        setSelectedPresetTime(null);
        if (val.trim()) {
            setNote(`Delayed by ~${val} min. Bus is on the way.`);
        }
    };

    const handleSelectType = (type: IssueType) => {
        setIssueType(type);
        setStep('recipient');
    };

    const handleSubmit = (recipient: 'parent' | 'school') => { 
        if (recipient === 'parent' && recipientAudience === 'custom' && selectedStudentIds.length === 0) {
            return;
        }

        const count = recipientAudience === 'all' ? students.length : selectedStudentIds.length;
        const studentIdsToSend = recipientAudience === 'all' ? students.map(s => s.id) : selectedStudentIds;

        setIsReporting(true);
        setTimeout(() => {
            onReport({ 
                type: issueType, 
                note: note.trim() || `${issueType} reported`, 
                timestamp: new Date(),
                recipientType: recipient,
                recipientCount: recipient === 'parent' ? count : undefined,
                selectedStudentIds: recipient === 'parent' ? studentIdsToSend : undefined,
                recipientSummary: recipient === 'parent' 
                    ? `${count} parent${count === 1 ? '' : 's'} notified directly`
                    : 'Reported to school transport office'
            }); 
            setNote('');
            setSelectedPresetTime(null);
            setCustomMinutes('');
            setIsReporting(false);
        }, 700);
    };

    const getModalTitle = () => {
        if (step === 'type') return 'Report an Issue';
        if (step === 'recipient') return 'Who to Notify?';
        if (step === 'school') return 'Notify School';
        return 'Notify Parents';
    };

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        return students.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.parentName && s.parentName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [students, searchTerm]);

    const isDelayOrTraffic = issueType === IssueType.Delay || issueType === IssueType.Traffic;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={getModalTitle()}
        >
            <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-0.5">
                {/* STEP 1: Select Type - 2 columns side by side with clean concise descriptions */}
                {step === 'type' && (
                    <div className="space-y-3">
                        <p className="text-base font-bold text-gray-800 dark:text-slate-100">
                            What type of issue do you want to report?
                        </p>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            {/* Delay */}
                            <button
                                type="button"
                                onClick={() => handleSelectType(IssueType.Delay)}
                                className="p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#E70D8D]/40 dark:hover:border-pink-500/40 hover:bg-pink-50/20 dark:hover:bg-slate-850 flex flex-col justify-between text-left transition-all active:scale-[0.98] group min-h-[125px] shadow-2xs"
                            >
                                <div className="flex items-center justify-between w-full mb-2">
                                    <div className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-955/30 text-[#E70D8D] border border-pink-100 dark:border-pink-900/40 group-hover:bg-[#E70D8D] group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-2xs">
                                        <Icon name="clock" className="w-6 h-6" />
                                    </div>
                                    <Icon name="chevronRight" className="w-5 h-5 text-gray-300 dark:text-slate-600 group-hover:text-[#E70D8D] dark:group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
                                </div>
                                <div>
                                    <h4 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                                        Delay
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-snug">
                                        Schedule & pickup delay
                                    </p>
                                </div>
                            </button>

                            {/* Traffic */}
                            <button
                                type="button"
                                onClick={() => handleSelectType(IssueType.Traffic)}
                                className="p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#E70D8D]/40 dark:hover:border-pink-500/40 hover:bg-pink-50/20 dark:hover:bg-slate-850 flex flex-col justify-between text-left transition-all active:scale-[0.98] group min-h-[125px] shadow-2xs"
                            >
                                <div className="flex items-center justify-between w-full mb-2">
                                    <div className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-955/30 text-[#E70D8D] border border-pink-100 dark:border-pink-900/40 group-hover:bg-[#E70D8D] group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-2xs">
                                        <Icon name="bus" className="w-6 h-6" />
                                    </div>
                                    <Icon name="chevronRight" className="w-5 h-5 text-gray-300 dark:text-slate-600 group-hover:text-[#E70D8D] dark:group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
                                </div>
                                <div>
                                    <h4 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                                        Traffic Delay
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-snug">
                                        Road congestion & jam
                                    </p>
                                </div>
                            </button>

                            {/* Vehicle issue */}
                            <button
                                type="button"
                                onClick={() => handleSelectType(IssueType.Vehicle)}
                                className="p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#E70D8D]/40 dark:hover:border-pink-500/40 hover:bg-pink-50/20 dark:hover:bg-slate-850 flex flex-col justify-between text-left transition-all active:scale-[0.98] group min-h-[125px] shadow-2xs"
                            >
                                <div className="flex items-center justify-between w-full mb-2">
                                    <div className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-955/30 text-[#E70D8D] border border-pink-100 dark:border-pink-900/40 group-hover:bg-[#E70D8D] group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-2xs">
                                        <Icon name="alertTriangle" className="w-6 h-6" />
                                    </div>
                                    <Icon name="chevronRight" className="w-5 h-5 text-gray-300 dark:text-slate-600 group-hover:text-[#E70D8D] dark:group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
                                </div>
                                <div>
                                    <h4 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                                        Vehicle Issue
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-snug">
                                        Mechanical fault / tire
                                    </p>
                                </div>
                            </button>

                            {/* Weather */}
                            <button
                                type="button"
                                onClick={() => handleSelectType(IssueType.Weather)}
                                className="p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#E70D8D]/40 dark:hover:border-pink-500/40 hover:bg-pink-50/20 dark:hover:bg-slate-850 flex flex-col justify-between text-left transition-all active:scale-[0.98] group min-h-[125px] shadow-2xs"
                            >
                                <div className="flex items-center justify-between w-full mb-2">
                                    <div className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-955/30 text-[#E70D8D] border border-pink-100 dark:border-pink-900/40 group-hover:bg-[#E70D8D] group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-2xs">
                                        <Icon name="sun" className="w-6 h-6" />
                                    </div>
                                    <Icon name="chevronRight" className="w-5 h-5 text-gray-300 dark:text-slate-600 group-hover:text-[#E70D8D] dark:group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
                                </div>
                                <div>
                                    <h4 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                                        Weather Issue
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-snug">
                                        Heavy rain or storms
                                    </p>
                                </div>
                            </button>

                            {/* Safety Incident (col-span-2 across bottom) */}
                            <button
                                type="button"
                                onClick={() => handleSelectType(IssueType.Safety)}
                                className="col-span-2 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#E70D8D]/40 dark:hover:border-pink-500/40 hover:bg-pink-50/20 dark:hover:bg-slate-850 flex items-center justify-between text-left transition-all active:scale-[0.98] group shadow-2xs"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-955/30 text-[#E70D8D] border border-pink-100 dark:border-pink-900/40 group-hover:bg-[#E70D8D] group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-2xs">
                                        <Icon name="shield" className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                                            Safety Incident
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Accident, medical or emergency
                                        </p>
                                    </div>
                                </div>
                                <Icon name="chevronRight" className="w-5 h-5 text-gray-300 dark:text-slate-600 group-hover:text-[#E70D8D] dark:group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Choose Recipient - 2 clear, big choices */}
                {step === 'recipient' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-1">
                            <button 
                                type="button"
                                onClick={() => setStep('type')}
                                className="flex items-center gap-1.5 text-sm font-bold text-[#303690] dark:text-indigo-400 hover:underline"
                            >
                                <Icon name="chevronLeft" className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-50 dark:bg-indigo-950/40 text-[#303690] dark:text-indigo-300 border border-blue-100 dark:border-indigo-900/30">
                                {issueType}
                            </span>
                        </div>

                        <p className="text-base font-bold text-gray-900 dark:text-white">
                            Who should receive this report?
                        </p>

                        <div className="flex flex-col gap-3 pt-1">
                            {/* Notify Parents */}
                            <button
                                type="button"
                                onClick={() => setStep('parent')}
                                className="w-full p-5 rounded-2xl border-2 border-pink-200 dark:border-pink-900/50 bg-pink-50/80 dark:bg-pink-950/30 hover:bg-pink-100 text-left flex items-center justify-between transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-[#E70D8D] text-white flex items-center justify-center shrink-0 shadow-md">
                                        <Icon name="users" className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-extrabold text-[#E70D8D]">1. Notify Parents</p>
                                        <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5">Send message directly to parents on this trip</p>
                                    </div>
                                </div>
                                <Icon name="chevronRight" className="w-6 h-6 text-[#E70D8D] group-hover:translate-x-0.5 transition-transform" />
                            </button>

                            {/* Notify School */}
                            <button
                                type="button"
                                onClick={() => setStep('school')}
                                className="w-full p-5 rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/30 hover:bg-blue-100 text-left flex items-center justify-between transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-[#303690] dark:bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                        <Icon name="shield" className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-extrabold text-[#303690] dark:text-indigo-400">2. Notify School</p>
                                        <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5">Send report to school transport desk</p>
                                    </div>
                                </div>
                                <Icon name="chevronRight" className="w-6 h-6 text-[#303690] dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3A: School Flow - Simple & Fast */}
                {step === 'school' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-1">
                            <button 
                                type="button"
                                onClick={() => setStep('recipient')}
                                className="flex items-center gap-1.5 text-sm font-bold text-[#303690] dark:text-indigo-400 hover:underline"
                            >
                                <Icon name="chevronLeft" className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/50 text-[#303690] dark:text-indigo-300">
                                School &bull; {issueType}
                            </span>
                        </div>

                        {/* Quick Delay Presets if delay or traffic - Horizontally Scrollable from 5m to 60m + Custom input */}
                        {isDelayOrTraffic && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                        Delay Duration:
                                    </p>
                                    <span className="text-[11px] font-medium text-gray-400">Scroll for more &rarr;</span>
                                </div>
                                <div className="flex overflow-x-auto gap-2 pb-2 pt-0.5 no-scrollbar scroll-smooth">
                                    {DELAY_PRESETS.map(time => (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => handleApplyPreset(time)}
                                            className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${
                                                selectedPresetTime === time
                                                    ? 'bg-[#303690] text-white border-[#303690] shadow-sm'
                                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            +{time}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom duration typing input */}
                                <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-gray-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 shrink-0">Or custom:</span>
                                    <div className="flex items-center gap-1.5">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="240"
                                            value={customMinutes}
                                            onChange={(e) => handleCustomMinutesChange(e.target.value)}
                                            placeholder="e.g. 45"
                                            className="w-20 p-1.5 text-center font-bold text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#303690]"
                                        />
                                        <span className="text-xs font-bold text-gray-500 dark:text-slate-400">mins delay</span>
                                    </div>
                                    {customMinutes && (
                                        <span className="text-[11px] text-green-600 dark:text-green-400 font-bold ml-auto">
                                            ✓ Saved
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
                                Note (Optional):
                            </p>
                            <textarea 
                                value={note} 
                                onChange={(e) => setNote(e.target.value)} 
                                placeholder="Type any note for the transport office..." 
                                className="w-full p-3.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white min-h-[90px] focus:outline-none focus:ring-2 focus:ring-[#303690] text-sm"
                            />
                        </div>

                        <button 
                            type="button"
                            onClick={() => handleSubmit('school')} 
                            disabled={isReporting} 
                            className="w-full bg-[#303690] dark:bg-indigo-600 hover:opacity-95 text-white font-bold p-4 rounded-2xl h-14 flex items-center justify-center text-base shadow-lg transition-all"
                        >
                            {isReporting ? <Spinner className="text-white w-5 h-5"/> : 'Send Report to School'}
                        </button>
                    </div>
                )}

                {/* STEP 3B: Parent Flow - Clean, Uncluttered, Fast */}
                {step === 'parent' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-1">
                            <button 
                                type="button"
                                onClick={() => setStep('recipient')}
                                className="flex items-center gap-1.5 text-sm font-bold text-[#E70D8D] hover:underline"
                            >
                                <Icon name="chevronLeft" className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950/50 text-[#E70D8D]">
                                Parents &bull; {issueType}
                            </span>
                        </div>

                        {/* Who receives this: Simple segmented buttons */}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                Send Notification To:
                            </p>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRecipientAudience('all');
                                        setSelectedStudentIds(students.map(s => s.id));
                                    }}
                                    className={`py-3 rounded-lg font-bold text-sm transition-all ${
                                        recipientAudience === 'all' 
                                            ? 'bg-white dark:bg-slate-700 text-[#E70D8D] shadow-sm' 
                                            : 'text-gray-600 dark:text-slate-400'
                                    }`}
                                >
                                    All Parents ({students.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRecipientAudience('custom')}
                                    className={`py-3 rounded-lg font-bold text-sm transition-all ${
                                        recipientAudience === 'custom' 
                                            ? 'bg-white dark:bg-slate-700 text-[#E70D8D] shadow-sm' 
                                            : 'text-gray-600 dark:text-slate-400'
                                    }`}
                                >
                                    Select Students ({selectedStudentIds.length})
                                </button>
                            </div>

                            {/* Clean, quiet summary if all parents */}
                            {recipientAudience === 'all' ? (
                                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-2 px-1">
                                    All {students.length} parents on this trip will receive this notification.
                                </p>
                            ) : (
                                <div className="mt-3 space-y-2 border border-gray-200 dark:border-slate-800 rounded-2xl p-3 bg-gray-50 dark:bg-slate-850">
                                    <div className="flex items-center justify-between text-xs pb-1">
                                        <span className="font-bold text-gray-600 dark:text-slate-300">
                                            {selectedStudentIds.length} of {students.length} selected
                                        </span>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={handleSelectAll} className="text-[#E70D8D] font-bold hover:underline">Select All</button>
                                            <button type="button" onClick={handleClearAll} className="text-gray-400 font-bold hover:underline">Clear</button>
                                        </div>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Search student or parent name..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
                                    />
                                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                        {filteredStudents.map(student => {
                                            const isSelected = selectedStudentIds.includes(student.id);
                                            return (
                                                <button
                                                    type="button"
                                                    key={student.id}
                                                    onClick={() => toggleStudent(student.id)}
                                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left border transition-all ${
                                                        isSelected 
                                                            ? 'bg-white dark:bg-slate-800 border-pink-300 dark:border-pink-900 shadow-2xs' 
                                                            : 'bg-transparent border-transparent opacity-60'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                                                            isSelected 
                                                                ? 'bg-[#E70D8D] border-[#E70D8D] text-white' 
                                                                : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                                        }`}>
                                                            {isSelected && <Icon name="check" className="w-3.5 h-3.5 stroke-[3]" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-xs text-gray-800 dark:text-white truncate">{student.name}</p>
                                                            <p className="text-[11px] text-gray-400 truncate">{student.parentName || student.grade}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Delay Presets if delay or traffic - Horizontally Scrollable from 5m to 60m + Custom input */}
                        {isDelayOrTraffic && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                        Delay Duration:
                                    </p>
                                    <span className="text-[11px] font-medium text-gray-400">Scroll for more &rarr;</span>
                                </div>
                                <div className="flex overflow-x-auto gap-2 pb-2 pt-0.5 no-scrollbar scroll-smooth">
                                    {DELAY_PRESETS.map(time => (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => handleApplyPreset(time)}
                                            className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${
                                                selectedPresetTime === time
                                                    ? 'bg-[#E70D8D] text-white border-[#E70D8D] shadow-sm'
                                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            +{time}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom duration typing input */}
                                <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-gray-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 shrink-0">Or custom:</span>
                                    <div className="flex items-center gap-1.5">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="240"
                                            value={customMinutes}
                                            onChange={(e) => handleCustomMinutesChange(e.target.value)}
                                            placeholder="e.g. 45"
                                            className="w-20 p-1.5 text-center font-bold text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E70D8D]"
                                        />
                                        <span className="text-xs font-bold text-gray-500 dark:text-slate-400">mins delay</span>
                                    </div>
                                    {customMinutes && (
                                        <span className="text-[11px] text-pink-600 dark:text-pink-400 font-bold ml-auto">
                                            ✓ Saved
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Note */}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
                                Message (Optional):
                            </p>
                            <textarea 
                                value={note} 
                                onChange={(e) => setNote(e.target.value)} 
                                placeholder="Add message for parents (optional)..." 
                                className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white min-h-[70px] focus:outline-none focus:ring-2 focus:ring-[#E70D8D] text-sm"
                            />
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="button"
                            onClick={() => handleSubmit('parent')} 
                            disabled={isReporting || (recipientAudience === 'custom' && selectedStudentIds.length === 0)} 
                            className="w-full bg-[#E70D8D] hover:bg-pink-600 disabled:opacity-50 text-white font-bold p-4 rounded-2xl h-14 flex items-center justify-center text-base shadow-lg shadow-pink-200 dark:shadow-none transition-all"
                        >
                            {isReporting ? (
                                <div className="flex items-center gap-2">
                                    <Spinner className="text-white w-5 h-5"/>
                                    <span>Sending notification...</span>
                                </div>
                            ) : (
                                <span>
                                    {recipientAudience === 'all'
                                        ? `Send to All Parents (${students.length})`
                                        : selectedStudentIds.length === 0 
                                            ? 'Select at least 1 student' 
                                            : `Send to ${selectedStudentIds.length} Parent${selectedStudentIds.length === 1 ? '' : 's'}`}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const DeviceRegistrationModal: React.FC<{ isOpen: boolean; onClose: () => void; onRegister: () => void; }> = ({ isOpen, onClose, onRegister }) => {
    const [step, setStep] = useState(1);
    const [isRegistering, setIsRegistering] = useState(false);
    const [serialNumber, setSerialNumber] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    const handleNext = () => {
        setStep(2);
    };

    const handleScan = () => {
        setIsScanning(true);
        setTimeout(() => {
            setSerialNumber('TG-' + Math.random().toString(36).substring(2, 10).toUpperCase());
            setIsScanning(false);
        }, 2000);
    };

    const handleRegister = () => {
        if (!serialNumber) return;
        setIsRegistering(true);
        setTimeout(() => {
            onRegister();
            setIsRegistering(false);
        }, 2000);
    };

    const renderStep1 = () => (
        <div className="flex flex-col items-center gap-6 py-2">
            <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center relative">
                <Icon name="smartphone" className="w-12 h-12 text-pink-500" />
                <div className="absolute -bottom-1 -right-1 bg-[#E70D8D] p-2 rounded-full border-4 border-white shadow-sm">
                    <Icon name="shield" className="w-5 h-5 text-white" />
                </div>
            </div>
            <div className="text-center px-2">
                <h3 className="text-2xl font-bold text-[#303690] dark:text-white mb-2">Register Device</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed px-4">
                    To ensure security and access trips, this device must be registered on <span className="font-bold text-[#303690] dark:text-white">Terra GO</span>.
                </p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-105 dark:border-slate-700 w-full flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Device Signature</span>
                    <span className="text-sm font-mono font-bold text-[#303690] dark:text-white">{DEVICE_SIGNATURE}</span>
                </div>
            </div>
            <div className="flex flex-col gap-3 w-full items-center">
                <button 
                    onClick={handleNext} 
                    className="w-fit min-w-[200px] bg-[#E70D8D] text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-pink-100 hover:opacity-95 transition-all flex items-center justify-center h-12"
                >
                    Register Now
                </button>
                <button onClick={onClose} className="py-2 text-gray-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-gray-600 dark:hover:text-slate-300">
                    Cancel
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="flex flex-col items-center gap-6 py-2">
            <div className="text-center px-2">
                <h3 className="text-2xl font-bold text-[#303690] dark:text-white mb-2">Device Serial</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed px-4">
                    Scan the barcode on the device box or enter the serial number manually.
                </p>
            </div>

            <div className="w-full space-y-4">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Enter Serial Number" 
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                        className="w-full p-4 pr-20 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white font-mono font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E70D8D] transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {serialNumber && !isScanning && (
                            <button 
                                onClick={() => setSerialNumber('')}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <Icon name="xCircle" className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={handleScan}
                            disabled={isScanning}
                            className="p-2 text-[#E70D8D] hover:bg-pink-50 rounded-lg transition-colors"
                        >
                            {isScanning ? <Spinner className="w-5 h-5" /> : <Icon name="camera" className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {isScanning && (
                    <div className="w-full aspect-video bg-gray-900 rounded-2xl relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 opacity-30">
                             <div className="absolute top-0 left-0 w-full h-1 bg-[#E70D8D] animate-scan"></div>
                        </div>
                        <Icon name="maximize" className="w-12 h-12 text-white/20" />
                        <p className="absolute bottom-4 text-white/60 text-[10px] font-bold uppercase tracking-widest">Scanning for barcode...</p>
                        <style>{`
                            @keyframes scan {
                                0% { top: 0; }
                                100% { top: 100%; }
                            }
                            .animate-scan { animation: scan 2s linear infinite; }
                        `}</style>
                    </div>
                )}

                {serialNumber && !isScanning && (
                    <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500 p-1.5 rounded-full">
                                <Icon name="check" className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Serial Detected</p>
                                <p className="text-sm font-mono font-bold text-green-800">{serialNumber}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSerialNumber('')}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            title="Retry"
                        >
                            <Icon name="rotateCcw" className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3 w-full items-center">
                <button 
                    onClick={handleRegister} 
                    disabled={isRegistering || !serialNumber || isScanning}
                    className="w-fit min-w-[200px] bg-[#E70D8D] text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-pink-100 hover:opacity-95 transition-all flex items-center justify-center h-12 disabled:opacity-50 disabled:shadow-none"
                >
                    {isRegistering ? <Spinner className="text-white"/> : 'Confirm & Register'}
                </button>
                <button onClick={() => setStep(1)} className="py-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600">
                    Back
                </button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={step === 1 ? "Device Required" : "Identity Verification"}>
            <div className="flex flex-col">
                <div className="flex-grow">
                    {step === 1 ? renderStep1() : renderStep2()}
                </div>
                
                <div className="flex justify-center gap-2 mt-6">
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 1 ? 'bg-[#E70D8D] w-4' : 'bg-gray-200'}`}></div>
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 2 ? 'bg-[#E70D8D] w-4' : 'bg-gray-200'}`}></div>
                </div>
            </div>
        </Modal>
    );
};

const OTAUpdateModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; }> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'notice' | 'downloading' | 'complete'>('notice');
    const [progress, setProgress] = useState(0);

    const startUpdate = () => {
        setStep('downloading');
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setStep('complete');
                    return 100;
                }
                return prev + 2;
            });
        }, 50);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={step === 'downloading' ? () => {} : onClose} title="Software Update">
            <div className="flex flex-col items-center gap-6 py-2">
                {step === 'notice' && (
                    <>
                        <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <Icon name="wifi" className="w-10 h-10 text-[#303690] dark:text-white" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#303690] dark:text-white">New Update Available</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-350 mt-2">Version 1.2.0 is ready to be installed.</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl w-full">
                            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-2">Release Notes</p>
                            <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                                <li>Enhanced live GPS tracking accuracy</li>
                                <li>Reduced battery consumption during trips</li>
                                <li>New &apos;Quick Scan&apos; attendance mode</li>
                                <li>UI performance improvements</li>
                            </ul>
                        </div>
                        <button 
                            onClick={startUpdate}
                            className="w-full bg-[#E70D8D] text-white font-bold py-4 rounded-xl shadow-lg"
                        >
                            Download & Install
                        </button>
                    </>
                )}

                {step === 'downloading' && (
                    <>
                        <div className="w-20 h-20 bg-pink-50 dark:bg-pink-950/20 rounded-full flex items-center justify-center relative overflow-hidden">
                             <Spinner size={40} className="text-[#E70D8D]" />
                        </div>
                        <div className="text-center w-full">
                            <h3 className="text-xl font-bold text-[#303690] dark:text-white">{progress < 100 ? 'Downloading Update...' : 'Extracting Files...'}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-350 mt-1">Keep the app open during installation</p>
                        </div>
                        <div className="w-full space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-400 dark:text-slate-500">
                                <span>Progress</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-slate-850 rounded-full h-3 overflow-hidden">
                                <div 
                                    className="bg-[#E70D8D] h-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {step === 'complete' && (
                    <>
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
                            <Icon name="checkCircle" className="w-10 h-10 text-green-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-800">Update Ready!</h3>
                            <p className="text-sm text-gray-500 mt-2">Terra GO Driver Companion has been updated to version 1.2.0.</p>
                        </div>
                        <button 
                            onClick={onSuccess}
                            className="w-full bg-[#303690] text-white font-bold py-4 rounded-xl shadow-lg"
                        >
                            Finish & Reload
                        </button>
                    </>
                )}
            </div>
        </Modal>
    );
};

const StudentActionModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    student: Student | null; 
    onUpdateStatus: (student: Student, newStatus: StudentStatus) => void; 
    onNotify: (name: string) => void; 
    onCall: (name: string) => void; 
    mode: 'trip' | 'gate';
    allStudents?: Student[];
    tripStartTime?: Date;
}> = ({ isOpen, onClose, student, onUpdateStatus, onNotify, onCall, mode, allStudents, tripStartTime }) => {
    const { selectedVehicle } = useVehicle();

    if (!student) return null;

    const studentIndex = allStudents ? allStudents.findIndex(s => s.id === student.id) : -1;
    const stopNumber = studentIndex !== -1 ? studentIndex + 1 : 1;
    const totalCount = allStudents ? allStudents.length : 10;

    const isAlightingOrCheckOut = 
        mode === 'trip' 
            ? [StudentStatus.Boarded, StudentStatus.Alighted].includes(student.status)
            : [StudentStatus.InSchool, StudentStatus.LeftSchool].includes(student.status);

    const actionVerb = isAlightingOrCheckOut 
        ? (mode === 'trip' ? 'Drop-off' : 'Check-out') 
        : (mode === 'trip' ? 'Boarding' : 'Check-in');

    const getETAString = () => {
        const base = tripStartTime ? new Date(tripStartTime) : new Date();
        // Adjust standard expected base hours for realistic gate modes when trip start is omitted
        if (mode === 'gate') {
            if (isAlightingOrCheckOut) {
                base.setHours(15, 30, 0, 0);
            } else {
                base.setHours(7, 30, 0, 0);
            }
        }
        const index = studentIndex !== -1 ? studentIndex : 0;
        // Assume roughly 4 minutes spacing between stops
        const minutesToAdd = 5 + index * 4;
        const etaDate = new Date(base.getTime() + minutesToAdd * 60 * 1000);
        return etaDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const handleAction = (status: StudentStatus) => {
        onUpdateStatus(student, status);
        onClose();
    };

    const getActions = () => {
        switch(student.status) {
            case StudentStatus.NotBoarded: return (
                <div className="grid grid-cols-2 gap-3 w-full">
                    <button onClick={() => handleAction(StudentStatus.Boarded)} className="w-full bg-[#303690] dark:bg-indigo-600 hover:opacity-95 text-white font-extrabold rounded-xl shadow-sm h-11 uppercase tracking-wider text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5">
                        Board Student
                    </button>
                    <button onClick={() => handleAction(StudentStatus.Absent)} className="w-full bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold rounded-xl h-11 border border-red-100/50 dark:border-red-900/30 text-xs hover:bg-red-100/30 flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider">
                        Mark Absent
                    </button>
                </div>
            );
            case StudentStatus.Boarded: return (
                <div className="grid grid-cols-2 gap-3 w-full">
                    <button onClick={() => handleAction(StudentStatus.Alighted)} className="w-full bg-[#E70D8D] hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-500 text-white font-extrabold rounded-xl shadow-sm h-11 uppercase tracking-wider text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5">
                        Alight Student
                    </button>
                    <button onClick={() => handleAction(StudentStatus.NotBoarded)} className="w-full bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 font-bold rounded-xl border border-orange-100 dark:border-orange-900/30 h-11 flex items-center justify-center gap-1.5 text-xs hover:bg-orange-100/30 transition-all uppercase tracking-wider">
                        <Icon name="xCircle" className="w-3.5 h-3.5 shrink-0" /> Undo Board
                    </button>
                </div>
            );
            case StudentStatus.Alighted: return <>
                <div className="text-center p-2.5 bg-green-50 dark:bg-green-950/20 rounded-xl mb-2 border border-green-100/50 dark:border-green-900/30 flex items-center justify-center gap-1.5 text-green-800 dark:text-green-400 font-bold text-xs uppercase tracking-wider">
                    <Icon name="checkCircle" className="w-3.5 h-3.5 text-green-500" /> Student has Alighted
                </div>
                <button onClick={() => handleAction(StudentStatus.Boarded)} className="w-full bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 font-bold rounded-xl border border-blue-100 dark:border-blue-900/30 h-11 flex items-center justify-center gap-1.5 text-xs hover:bg-blue-100/30 transition-all uppercase tracking-wider">
                    <Icon name="arrowRight" className="w-3.5 h-3.5 rotate-180 shrink-0" /> Undo Alighted
                </button>
            </>;
            case StudentStatus.NotArrived: return (
                <div className="grid grid-cols-2 gap-3 w-full">
                    <button onClick={() => handleAction(StudentStatus.InSchool)} className="w-full bg-[#303690] dark:bg-indigo-600 hover:opacity-95 text-white font-extrabold rounded-xl shadow-sm h-11 uppercase tracking-wider text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5">
                        Check In
                    </button>
                    <button onClick={() => handleAction(StudentStatus.Absent)} className="w-full bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold rounded-xl h-11 border border-red-100/50 dark:border-red-900/30 text-xs hover:bg-red-100/30 flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider">
                        Mark Absent
                    </button>
                </div>
            );
            case StudentStatus.InSchool: return (
                <div className="grid grid-cols-2 gap-3 w-full">
                    <button onClick={() => handleAction(StudentStatus.LeftSchool)} className="w-full bg-[#E70D8D] hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-500 text-white font-extrabold rounded-xl shadow-sm h-11 uppercase tracking-wider text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5">
                        Check Out
                    </button>
                    <button onClick={() => handleAction(StudentStatus.NotArrived)} className="w-full bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 font-bold rounded-xl border border-orange-100 dark:border-orange-900/30 h-11 flex items-center justify-center gap-1.5 text-xs hover:bg-orange-100/30 transition-all uppercase tracking-wider">
                        <Icon name="xCircle" className="w-3.5 h-3.5 shrink-0" /> Undo Check-in
                    </button>
                </div>
            );
            case StudentStatus.LeftSchool: return <>
                <div className="text-center p-2.5 bg-green-50 dark:bg-green-950/20 rounded-xl mb-2 border border-green-100/50 dark:border-green-900/30 flex items-center justify-center gap-1.5 text-green-800 dark:text-green-400 font-bold text-xs uppercase tracking-wider">
                     <Icon name="checkCircle" className="w-3.5 h-3.5 text-green-500" /> Student has Left School
                </div>
                <button onClick={() => handleAction(StudentStatus.InSchool)} className="w-full bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 font-bold rounded-xl border border-blue-100 dark:border-blue-900/30 h-11 flex items-center justify-center gap-1.5 text-xs hover:bg-blue-100/30 transition-all uppercase tracking-wider">
                    <Icon name="arrowRight" className="w-3.5 h-3.5 rotate-180 shrink-0" /> Undo Check-out
                </button>
            </>;
            case StudentStatus.Absent: return <>
                 <div className="text-center p-2.5 bg-red-50 dark:bg-red-950/20 rounded-xl mb-2 border border-red-100/50 dark:border-red-900/30 flex items-center justify-center gap-1.5 text-red-800 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                     <Icon name="xCircle" className="w-3.5 h-3.5 text-red-600" /> Student marked Absent
                </div>
                <button onClick={() => handleAction(mode === 'trip' ? StudentStatus.NotBoarded : StudentStatus.NotArrived)} className="w-full bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 font-bold rounded-xl border border-orange-100/50 dark:border-orange-900/30 h-11 flex items-center justify-center gap-1.5 text-xs hover:bg-orange-100/30 transition-all uppercase tracking-wider">
                    <Icon name="xCircle" className="w-3.5 h-3.5 shrink-0" /> Reset Status
                </button>
            </>;
            default: return null;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Student Transit Status">
            <div className="flex flex-col gap-3.5 sm:gap-5 w-full">
                {/* Header Information resembling Grab/Uber top of sheet */}
                <div className="flex justify-between items-center w-full">
                    <div className="text-left">
                        <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-[#E70D8D] dark:text-pink-400">
                            {mode === 'trip' ? 'Trip Stop Action' : 'Gate Check In/Out'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 font-semibold mt-0.5 sm:mt-1">
                            {student.status === StudentStatus.Boarded ? 'On Board • Headed to Destination' :
                             student.status === StudentStatus.Alighted ? 'Safely Arrived & Alighted' :
                             'Pending Driver action below'}
                        </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-slate-200 uppercase tracking-wider bg-gray-100 dark:bg-slate-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded">
                            {student.status === StudentStatus.Absent ? 'Absent' : 'Active'}
                        </span>
                    </div>
                </div>

                {/* Main Card (Uber driver/plate card replica) */}
                <div className="w-full bg-gray-50/70 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 relative overflow-hidden shadow-xs text-left">
                    {/* Top sub-section: Avatars on left, Plate number on right */}
                    <div className="flex justify-between items-center">
                        {/* Overlapping Avatar Area */}
                        <div className="relative">
                            <img 
                                src={student.imgUrl} 
                                alt={student.name} 
                                className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-slate-900 shadow-md"
                            />
                            {/* Overlapping car icon circle badge */}
                            <div className="absolute -bottom-1 -right-2 w-8 h-8 rounded-full bg-[#303690] dark:bg-indigo-600 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg animate-pulse-subtle">
                                <Icon name={selectedVehicle?.type === 'van' ? 'van' : 'bus'} className="w-4 h-4 text-white" />
                            </div>
                        </div>

                        {/* License Plate box */}
                        <div className="text-right">
                            <div className="bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border-2 border-gray-900 dark:border-slate-700 shadow-sm inline-block">
                                <p className="font-mono text-base font-black text-gray-900 dark:text-white tracking-widest leading-none">
                                    {student.admissionNumber}
                                </p>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">
                                {selectedVehicle ? selectedVehicle.registration : 'Bus Transit'}
                            </p>
                        </div>
                    </div>

                    {/* Bottom sub-section: Name/Stop sequence on left, Zone on right */}
                    <div className="flex justify-between items-end pt-1">
                        <div className="text-left max-w-[70%]">
                            <h4 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                                {student.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500 dark:text-slate-400 font-bold">
                                <span>{student.grade}</span>
                                <span className="text-gray-300 dark:text-slate-600">&bull;</span>
                                <span className="text-[#303690] dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                     Stop #{stopNumber}
                                </span>
                            </div>
                        </div>
                        
                        <div className="text-right">
                            <span className="text-[10px] font-black text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/20 px-2.5 py-1 rounded-full uppercase tracking-wider border border-pink-100/50 dark:border-pink-905/20">
                                {selectedVehicle ? selectedVehicle.zone : 'Zone'}
                            </span>
                        </div>
                    </div>

                    {/* Schedule & ETA panel in premium replica style */}
                    <div className="border-t border-gray-100 dark:border-slate-800/80 pt-3 mt-1 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                <Icon name="clock" className="w-4 h-4 text-[#E70D8D] dark:text-pink-400 shrink-0" />
                                <span>Planned {actionVerb}: <span className="text-gray-900 dark:text-white font-black">{getETAString()}</span></span>
                            </div>
                            <span className="text-[9px] uppercase font-black tracking-wider text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                On Schedule
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold pl-6">
                            Stop order: #{stopNumber} of {totalCount} assigned students.
                        </p>
                    </div>

                    {/* Student Warning/Alert if present */}
                    {student.alert && (
                        <div className="border-t border-gray-100 dark:border-slate-800/80 pt-3 mt-1">
                            <div className="bg-red-50/70 dark:bg-red-950/20 border border-red-100/45 dark:border-red-900/20 p-2.5 rounded-xl flex items-center gap-2">
                                <Icon name="alertTriangle" className="w-4 h-4 text-red-500 shrink-0" />
                                <p className="text-xs font-bold text-red-600 dark:text-red-400 text-left leading-normal">
                                    Parent Note: {student.alert}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Primary status change buttons and communication actions */}
                <div className="w-full space-y-3 pt-2">
                    {getActions()}
                    
                    {/* Communication controls in replica style */}
                    <div className="flex items-center gap-2.5 w-full mt-3">
                        <button 
                            onClick={() => { onNotify(student.name); onClose(); }} 
                            className="flex-grow bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 py-2.5 px-3 rounded-xl border border-gray-100 dark:border-slate-800/80 font-bold text-xs text-left flex items-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                            <Icon name="messageCircle" className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
                            <span>Notify Parent of Arrival</span>
                        </button>
                        
                        <button 
                            onClick={() => { onCall(student.name); onClose(); }} 
                            className="bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-100 dark:border-slate-800/80 rounded-full w-9.5 h-9.5 flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-[0.95]"
                            title="Call Parent"
                        >
                            <Icon name="phone" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const GuardianOtpModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSuccess: (guardianName: string, studentName: string) => void;
}> = ({ isOpen, onClose, onSuccess }) => {
    const [view, setView] = useState<'enterCode' | 'showDetails' | 'success'>('enterCode');
    const [otp, setOtp] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [error, setError] = useState('');
    const [verificationData, setVerificationData] = useState<{guardian: Guardian, student: Student} | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    const handleVerifyCode = () => {
        setError('');
        setIsVerifying(true);
        setTimeout(() => {
            if (otp === '1234') { // Mock logic
                const guardian = MOCK_GUARDIAN;
                // In a real app, you'd probably find student by code and grade
                const student = MOCK_STUDENTS.find(s => s.id === guardian.authorizedStudentId);
                
                if (guardian && student) {
                    if (student.grade === selectedGrade) { // Grade check
                        setVerificationData({ guardian, student });
                        setView('showDetails');
                    } else {
                        setError('Code is valid, but grade does not match. Please check and try again.');
                    }
                } else {
                    setError('Could not find matching guardian/student.');
                }
            } else {
                setError('Invalid or expired code. Please try again.');
            }
            setIsVerifying(false);
        }, 1500);
    };

    const handleConfirmRelease = () => {
        if (verificationData) {
            setIsConfirming(true);
            // Simulate API call
            setTimeout(() => {
                onSuccess(verificationData.guardian.name, verificationData.student.name);
                setView('success');
                setIsConfirming(false);
                
                // Auto reset after 2.5 seconds
                setTimeout(() => {
                    setOtp('');
                    setError('');
                    setSelectedGrade('');
                    setVerificationData(null);
                    setView('enterCode');
                    setIsConfirming(false);
                }, 2500);
            }, 1800);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            const timeout = setTimeout(() => {
                setOtp('');
                setError('');
                setSelectedGrade('');
                setVerificationData(null);
                setView('enterCode');
                setIsConfirming(false);
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [isOpen]);

    const renderEnterCode = () => (
        <div className="flex flex-col gap-4">
            <p className="text-gray-600 text-center mb-2">Select the student&apos;s grade and enter the 4-digit code from the guardian&apos;s app.</p>
            
            <div className="w-full">
                <label htmlFor="grade-select" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Grade</label>
                <select 
                    id="grade-select" 
                    value={selectedGrade} 
                    onChange={e => setSelectedGrade(e.target.value)}
                    className="w-full p-4 rounded-xl text-gray-800 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E70D8D]"
                >
                    <option value="" disabled>Select a grade...</option>
                    {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'].map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                    ))}
                </select>
            </div>

            <div className="w-full">
                <label htmlFor="otp-input" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 mt-2">Pickup Code</label>
                <input 
                    id="otp-input"
                    type="tel" 
                    maxLength={4} 
                    value={otp} 
                    onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                    className="w-full p-4 text-2xl tracking-[1em] text-center border-2 rounded-xl bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E70D8D] font-mono text-[#303690] dark:text-white" 
                    placeholder="----"
                />
            </div>

            {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            
            <button 
                onClick={handleVerifyCode} 
                disabled={!selectedGrade || otp.length !== 4 || isVerifying}
                className="w-full bg-[#E70D8D] text-white font-bold p-4 rounded-xl disabled:bg-gray-300 h-14 flex items-center justify-center shadow-lg mt-2"
            >
                {isVerifying ? <Spinner className="text-white"/> : 'Verify Code'}
            </button>
        </div>
    );

    const renderShowDetails = () => {
        if (!verificationData) return null;
        const { guardian, student } = verificationData;
        return (
            <div className="flex flex-col gap-4">
                <div className="bg-pink-50/50 p-5 rounded-3xl border border-pink-100 w-full relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-pink-100 rounded-full opacity-20" />
                    <div className="absolute -left-2 -bottom-2 w-16 h-16 bg-pink-100 rounded-full opacity-20" />
                    
                    <div className="relative space-y-5">
                        {/* Guardian Section */}
                        <div className="flex items-start gap-4">
                            <ProfileAvatar 
                                name={guardian.name} 
                                imgUrl={guardian.imgUrl} 
                                sizeClassName="w-16 h-16" 
                                className="ring-4 ring-white shadow-md flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-[#E70D8D] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Authorized Guardian</span>
                                </div>
                                <p className="font-black text-[#303690] dark:text-white text-xl leading-tight truncate">{guardian.name}</p>
                                <p className="text-sm font-medium text-[#E70D8D] mt-1 flex items-center gap-1">
                                    <Icon name="user" className="w-3.5 h-3.5" />
                                    {guardian.relationship}
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-2 border border-pink-100/50 dark:border-slate-800">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Phone Number</p>
                                        <p className="text-xs font-bold text-[#303690] dark:text-white truncate">{guardian.phone}</p>
                                    </div>
                                    <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-2 border border-pink-100/50 dark:border-slate-800">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">ID Number</p>
                                        <p className="text-xs font-bold text-[#303690] dark:text-white truncate">{guardian.idNumber}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Connection Bridge */}
                        <div className="flex items-center justify-center gap-3 py-1">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
                            <div className="bg-white rounded-full p-1.5 shadow-sm border border-pink-100">
                                <Icon name="userCheck" className="w-4 h-4 text-[#E70D8D]" />
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
                        </div>

                        {/* Student Section */}
                        <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-white/80 dark:border-slate-800">
                            <ProfileAvatar 
                                name={student.name} 
                                imgUrl={student.imgUrl} 
                                sizeClassName="w-14 h-14" 
                                className="ring-2 ring-white flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Picking Up</span>
                                </div>
                                <p className="font-bold text-[#303690] dark:text-white text-lg leading-tight truncate">{student.name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm font-bold text-gray-600">{student.grade}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                    <span className="text-sm font-medium text-gray-500">ID: {student.admissionNumber}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 mt-2">
                    <p className="text-xs text-gray-400 text-center px-4">By confirming, you verify that the identities match the faces presented.</p>
                    <button 
                        onClick={handleConfirmRelease} 
                        disabled={isConfirming}
                        className="w-full bg-[#E70D8D] text-white font-black py-4 rounded-2xl shadow-xl shadow-pink-200 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg h-16 disabled:bg-pink-300"
                    >
                        {isConfirming ? (
                            <Spinner className="text-white w-6 h-6" />
                        ) : (
                            <>
                                <Icon name="checkCircle" className="w-6 h-6" />
                                Confirm & Release
                            </>
                        )}
                    </button>
                    {!isConfirming && (
                        <button 
                            onClick={() => {
                                setOtp('');
                                setVerificationData(null);
                                setView('enterCode');
                            }} 
                            className="w-full text-gray-400 font-bold py-2 text-sm hover:text-gray-600 transition-colors"
                        >
                            Back to Code Entry
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderSuccess = () => {
        if (!verificationData) return null;
        const { guardian, student } = verificationData;
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="w-24 h-24 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mb-6"
                >
                    <Icon name="checkCircle" className="w-14 h-14 text-green-500" />
                </motion.div>
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <h3 className="text-2xl font-black text-[#303690] dark:text-white mb-2">Release Authorized!</h3>
                    <p className="text-gray-600 dark:text-slate-350 mb-6 font-medium">
                        <span className="font-bold text-[#E70D8D]">{student.name}</span> has been successfully released to <span className="font-bold text-[#303690] dark:text-white">{guardian.name}</span>.
                    </p>
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 inline-flex items-center gap-2">
                        <Icon name="clock" className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recorded at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </motion.div>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Guardian Verification">
            {view === 'enterCode' && renderEnterCode()}
            {view === 'showDetails' && renderShowDetails()}
            {view === 'success' && renderSuccess()}
        </Modal>
    );
};

const VersionInfoModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        void navigator.clipboard.writeText(DEVICE_SIGNATURE);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="App Information">
            <div className="text-center space-y-4">
                <Icon name="logo" className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#303690] dark:text-white">Terra GO Driver App</h3>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-gray-600 dark:text-slate-350">Version <span className="font-semibold">{APP_VERSION}</span></p>
                    <div 
                        className="bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 group cursor-pointer active:scale-95 transition-transform" 
                        onClick={handleCopy}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCopy(); }}
                        role="button"
                        tabIndex={0}
                    >
                        <p className="text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Signature:</p>
                        <p className="text-[9px] font-mono text-gray-800 dark:text-white font-bold">{DEVICE_SIGNATURE}</p>
                        <Icon name="copy" className={`w-3 h-3 ${copied ? 'text-green-500' : 'text-gray-400'}`} />
                        {copied && <span className="absolute -top-8 bg-black text-white text-[8px] px-2 py-1 rounded animate-fade-in-up">Copied!</span>}
                    </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
                
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 text-left bg-gray-50 dark:bg-slate-800 p-4 rounded-xl">
                    <h4 className="font-bold text-[#303690] dark:text-white mb-2">What&apos;s New in This Version:</h4>
                    <ul className="list-disc list-inside text-gray-600 dark:text-slate-300 space-y-1 text-sm">
                        <li>Device registration flow implemented.</li>
                        <li>Enhanced security for student transit.</li>
                        <li>Device signature identification for support.</li>
                    </ul>
                </div>

                <button onClick={onClose} className="w-full mt-4 bg-[#E70D8D] text-white font-bold p-3 rounded-xl hover:opacity-90 shadow-md">Close</button>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
            `}</style>
        </Modal>
    );
};

const LogoutConfirmationModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; }> = ({ isOpen, onClose, onConfirm }) => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleConfirm = () => {
        setIsLoggingOut(true);
        setTimeout(() => {
            onConfirm();
            setIsLoggingOut(false);
        }, 1000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Logout">
            <div className="flex flex-col items-center pb-2">
                <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mb-6">
                    <Icon name="logOut" className="w-8 h-8 text-[#E70D8D]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ending Session?</h3>
                <p className="text-gray-500 text-center mb-8 max-w-xs">
                    You will need to sign in again to access your trips and student lists.
                </p>
                <div className="grid grid-cols-2 gap-4 w-full">
                    <button onClick={onClose} className="py-4 rounded-2xl bg-gray-50 text-gray-600 font-bold hover:bg-gray-100 transition-colors text-sm uppercase tracking-wide">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isLoggingOut} 
                        className="py-4 rounded-2xl bg-[#E70D8D] text-white font-bold shadow-lg shadow-pink-200 hover:shadow-xl hover:opacity-95 transition-all transform active:scale-[0.98] flex items-center justify-center text-sm uppercase tracking-wide"
                    >
                        {isLoggingOut ? <Spinner className="text-white"/> : 'Logout'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const DateRangePickerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onApply: (start: Date, end: Date) => void;
    initialRange: { start: Date | null, end: Date | null };
}> = ({ isOpen, onClose, onApply, initialRange }) => {
    const toInputFormat = (date: Date | null) => date ? date.toISOString().split('T')[0] : '';
    
    const [start, setStart] = useState(() => toInputFormat(initialRange.start));
    const [end, setEnd] = useState(() => toInputFormat(initialRange.end));
    const [error, setError] = useState('');

    const handleApply = () => {
        setError('');
        if (start && end) {
            const startDate = new Date(start + 'T00:00:00');
            const endDate = new Date(end + 'T00:00:00');
            if (endDate < startDate) {
                setError('End date cannot be before start date.');
                return;
            }
            onApply(startDate, endDate);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select Date Range">
            <div className="space-y-4">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input 
                        type="date" 
                        id="startDate" 
                        value={start} 
                        onChange={e => setStart(e.target.value)} 
                        className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-[#E70D8D] focus:ring-[#E70D8D] sm:text-sm p-3 bg-gray-50"
                    />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                    <input 
                        type="date" 
                        id="endDate" 
                        value={end} 
                        onChange={e => setEnd(e.target.value)} 
                        className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-[#E70D8D] focus:ring-[#E70D8D] sm:text-sm p-3 bg-gray-50"
                    />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button onClick={handleApply} className="w-full bg-[#E70D8D] text-white font-bold p-3 rounded-xl mt-4 hover:opacity-90">Apply Filter</button>
            </div>
        </Modal>
    );
};

const HistoryScreen: React.FC<{
    onBack: () => void;
    initialTab: 'trip' | 'verification';
    onSelectTrip: (trip: TripHistoryItem) => void;
    onSelectVerification: (verification: VerificationHistoryItem) => void;
    customDateRange: { start: Date | null, end: Date | null };
    onOpenDateRangePicker: () => void;
    setCustomDateRange: (range: { start: Date | null, end: Date | null }) => void;
}> = ({ onBack, initialTab, onSelectTrip, onSelectVerification, customDateRange, onOpenDateRangePicker, setCustomDateRange }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const filterByDate = (itemDate: Date) => {
        if (!customDateRange.start || !customDateRange.end) return true;
        return itemDate >= customDateRange.start && itemDate <= customDateRange.end;
    };

    const trips = MOCK_TRIP_HISTORY.filter(t => filterByDate(t.startTime));
    const verifications = MOCK_VERIFICATION_HISTORY.filter(v => filterByDate(v.timestamp));

    const clearFilters = () => setCustomDateRange({ start: null, end: null });
    const hasFilter = customDateRange.start && customDateRange.end;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100">
            <Header title="History" onBack={onBack} />
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1 mb-4 select-none">
                    <button 
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'trip' ? 'bg-[#E70D8D] text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'}`} 
                        onClick={() => setActiveTab('trip')}
                    >
                        Trips
                    </button>
                    <button 
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'verification' ? 'bg-[#E70D8D] text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'}`} 
                        onClick={() => setActiveTab('verification')}
                    >
                        Verifications
                    </button>
                </div>
                <div className="flex justify-between items-center">
                    <button onClick={onOpenDateRangePicker} className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-350 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors">
                        <Icon name="clock" className="w-4 h-4"/>
                        {hasFilter ? `${formatDate(customDateRange.start!)} - ${formatDate(customDateRange.end!)}` : 'Filter by Date'}
                    </button>
                    {hasFilter && <button onClick={clearFilters} className="text-xs text-red-500 dark:text-red-400 font-bold uppercase hover:underline">Clear</button>}
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto min-h-0 p-4">
                {activeTab === 'trip' ? (
                    <div className="space-y-3">
                        {trips.length > 0 ? trips.map(trip => (
                            <button 
                                key={trip.id} 
                                onClick={() => onSelectTrip(trip)} 
                                className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4 cursor-pointer hover:border-pink-200 dark:hover:border-pink-900/40 transition-colors w-full text-left"
                            >
                                <div className="bg-pink-50 dark:bg-pink-950/20 p-3 rounded-full">
                                    <Icon name={trip.type === 'Morning' ? 'sun' : 'moon'} className="w-5 h-5 text-[#E70D8D] dark:text-pink-400"/>
                                </div>
                                <div className="flex-grow">
                                    <p className="font-bold text-gray-800 dark:text-slate-150">{trip.type} Trip</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">{formatDate(trip.startTime)} • {trip.startTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                                </div>
                                <div className="text-right">
                                     <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Students</p>
                                     <p className="font-bold text-[#303690] dark:text-indigo-300">{trip.students.length}</p>
                                </div>
                                <Icon name="arrowRight" className="w-4 h-4 text-gray-300 dark:text-slate-600"/>
                            </button>
                        )) : <EmptyState message="No trips found for the selected period." icon="bus" />}
                    </div>
                ) : (
                    <div className="space-y-3">
                         {verifications.length > 0 ? verifications.map(v => (
                            <button 
                                key={v.id} 
                                onClick={() => onSelectVerification(v)} 
                                className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4 cursor-pointer hover:border-pink-200 dark:hover:border-pink-900/40 transition-colors w-full text-left"
                            >
                                <div className="relative">
                                    <img src={v.studentImgUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center"><Icon name="check" className="w-2 h-2 text-white"/></div>
                                </div>
                                <div className="flex-grow">
                                    <p className="font-bold text-gray-800 dark:text-slate-150 text-sm">{v.studentName}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-405">Released to: <span className="font-medium text-gray-700 dark:text-slate-300">{v.guardianName}</span></p>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500">{formatDate(v.timestamp)}</p>
                            </button>
                        )) : <EmptyState message="No verifications found for the selected period." icon="shield" />}
                    </div>
                )}
            </div>
        </div>
    );
};

const TripReportScreen: React.FC<{ trip: TripHistoryItem; onClose: () => void; }> = ({ trip, onClose }) => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100 absolute inset-0 z-20">
         <div className="bg-[#E70D8D] text-white p-6 shadow-md relative">
            <button onClick={onClose} className="absolute top-6 left-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                <Icon name="arrowRight" className="w-5 h-5 text-white rotate-180" />
            </button>
            <div className="text-center mt-4">
                <h2 className="text-2xl font-bold">{trip.type} Trip Report</h2>
                <p className="opacity-80 text-sm">{trip.startTime.toLocaleDateString()} • {trip.route.name}</p>
            </div>
         </div>
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <SummaryCard icon="users" label="Total Students" value={`${trip.students.length}`} />
                <SummaryCard icon="alertTriangle" label="Issues" value={`${trip.issues.length}`} />
            </div>

            <div>
                <h3 className="text-sm font-bold uppercase text-gray-500 dark:text-slate-400 mb-3 tracking-wider">Details</h3>
                 <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-800 pb-3">
                        <span className="text-gray-600 dark:text-slate-400">Start Time</span>
                        <span className="font-bold text-gray-800 dark:text-slate-200">{trip.startTime.toLocaleTimeString()}</span>
                    </div>
                     <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-800 pb-3">
                        <span className="text-gray-600 dark:text-slate-400">End Time</span>
                        <span className="font-bold text-gray-800 dark:text-slate-200">{trip.endTime?.toLocaleTimeString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-slate-400">Absent Students</span>
                        <span className="font-bold text-red-500 dark:text-red-400">{trip.students.filter(s => s.status === StudentStatus.Absent).length}</span>
                    </div>
                 </div>
            </div>

             {trip.issues.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold uppercase text-gray-500 dark:text-slate-400 mb-3 tracking-wider">Reported Issues</h3>
                    <ul className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 space-y-3">
                        {trip.issues.map((issue, idx) => (
                             <li key={idx} className="flex gap-3 items-start">
                                <Icon name="alertTriangle" className="w-5 h-5 text-yellow-500 dark:text-yellow-405 flex-shrink-0 mt-0.5"/>
                                <div className="flex-grow">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-gray-800 dark:text-slate-100 text-sm">{issue.type}</p>
                                        {issue.recipientType === 'parent' ? (
                                            <span className="text-[10px] font-bold bg-pink-100 dark:bg-pink-900/40 text-[#E70D8D] px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Icon name="users" className="w-3 h-3" />
                                                {issue.recipientCount ? `${issue.recipientCount} Parents Notified` : 'Parents Notified'}
                                            </span>
                                        ) : issue.recipientType === 'school' ? (
                                            <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-[#303690] dark:text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Icon name="shield" className="w-3 h-3" />
                                                School Notified
                                            </span>
                                        ) : null}
                                    </div>
                                    {issue.note && <p className="text-sm text-gray-600 dark:text-slate-300 leading-snug mt-0.5">{issue.note}</p>}
                                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{issue.timestamp.toLocaleTimeString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </div>
);

const VerificationDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    verification: VerificationHistoryItem | null;
}> = ({ isOpen, onClose, verification }) => {
    if (!verification) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Verification Details">
            <div className="space-y-6">
                 <div className="flex justify-center gap-6 items-center">
                    <div className="text-center">
                        <img src={verification.studentImgUrl} className="w-16 h-16 rounded-full object-cover border-2 border-green-100 mb-2 mx-auto" alt=""/>
                        <p className="text-xs font-bold text-gray-500 uppercase">Student</p>
                        <p className="font-bold text-[#303690] text-sm">{verification.studentName}</p>
                    </div>
                     <div className="text-gray-300"><Icon name="arrowRight" className="w-6 h-6"/></div>
                    <div className="text-center">
                        <img src={verification.guardianImgUrl} className="w-16 h-16 rounded-full object-cover border-2 border-blue-100 mb-2 mx-auto" alt=""/>
                         <p className="text-xs font-bold text-gray-500 uppercase">Guardian</p>
                        <p className="font-bold text-gray-800 text-sm">{verification.guardianName}</p>
                    </div>
                 </div>

                 <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{verification.timestamp.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Verified By</span><span className="font-medium">{verification.verifiedBy}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Guardian Phone</span><span className="font-medium">{verification.guardianPhone}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Relationship</span><span className="font-medium">{verification.guardianRelationship}</span></div>
                 </div>

                 <button onClick={onClose} className="w-full bg-gray-100 text-gray-600 font-bold p-3 rounded-xl hover:bg-gray-200">Close</button>
            </div>
        </Modal>
    );
};

const DataUsageHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    history: DataUsageItem[];
    onReset: () => void;
}> = ({ isOpen, onClose, history, onReset }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Data Usage History">
        <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-4">
                <Icon name="barChart2" className="w-8 h-8 text-[#303690]"/>
                <div>
                    <p className="text-sm text-gray-600">Total Usage (Session)</p>
                    <p className="text-2xl font-bold text-[#303690]">{history.reduce((acc, curr) => acc + curr.usage, 0).toFixed(2)} MB</p>
                </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="text-gray-500 text-left">
                        <tr><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium text-right">Usage</th></tr>
                    </thead>
                    <tbody className="text-gray-800">
                        {history.map((item, i) => (
                            <tr key={i} className="border-b border-gray-50 last:border-0">
                                <td className="py-2">{item.date}</td>
                                <td className="py-2 text-right font-mono">{item.usage.toFixed(2)} MB</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={onReset} className="flex-1 bg-red-50 text-red-600 font-bold p-3 rounded-xl hover:bg-red-100 text-sm">Reset Statistics</button>
                <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 font-bold p-3 rounded-xl hover:bg-gray-200 text-sm">Close</button>
            </div>
        </div>
    </Modal>
);


const HomeScreenSkeleton = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white p-6 shadow-sm border-b border-gray-100">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <div className="flex gap-2 mt-2">
                        <Skeleton className="h-5 w-16 rounded" />
                        <Skeleton className="h-5 w-24 rounded" />
                    </div>
                </div>
                <Skeleton className="w-12 h-12 rounded-full" />
            </div>
        </div>
        <div className="flex-grow p-6 space-y-6">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
        </div>
        <div className="py-4 text-center">
            <Skeleton className="h-4 w-20 rounded mx-auto" />
        </div>
    </div>
);

const TripSelectionSkeleton = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white p-4 border-b border-gray-100">
            <Skeleton className="h-8 w-40 rounded-lg mx-auto" />
        </div>
        <div className="px-4 py-4 bg-white border-b border-gray-100">
            <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-xl" />
                    <div className="flex-grow space-y-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-1/2 rounded" />
                            <Skeleton className="h-2 w-2 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-1/3 rounded" />
                    </div>
                    <Skeleton className="w-8 h-8 rounded-full" />
                </div>
            ))}
        </div>
    </div>
);

const RouteSelectionSkeleton = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white p-4 border-b border-gray-100">
            <Skeleton className="h-8 w-40 rounded-lg mx-auto" />
        </div>
        <div className="p-4 bg-white border-b border-gray-100 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between px-1">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-px flex-grow ml-4 rounded" />
            </div>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-2xl" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-5 w-1/2 rounded" />
                        <Skeleton className="h-4 w-1/3 rounded" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const LocationSelectionSkeleton = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white p-4 border-b border-gray-100">
            <Skeleton className="h-8 w-40 rounded-lg mx-auto" />
        </div>
        <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-xl" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-5 w-1/2 rounded" />
                        <Skeleton className="h-4 w-3/4 rounded" />
                        <Skeleton className="h-3 w-1/3 rounded" />
                    </div>
                    <Skeleton className="w-5 h-5 rounded" />
                </div>
            ))}
        </div>
    </div>
);



const StudentListSkeleton = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white p-4 border-b border-gray-100">
            <Skeleton className="h-8 w-40 rounded-lg mx-auto" />
        </div>
        <div className="bg-white px-4 py-3 border-b border-gray-100">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-6 w-10 rounded" />
                </div>
                <div className="space-y-1 text-right">
                    <Skeleton className="h-3 w-16 rounded ml-auto" />
                    <Skeleton className="h-6 w-10 rounded ml-auto" />
                </div>
            </div>
        </div>
        <div className="flex bg-white border-b border-gray-100">
            <Skeleton className="flex-1 h-12 rounded-none" />
            <Skeleton className="flex-1 h-12 rounded-none" />
        </div>
        <div className="p-4 bg-white border-b border-gray-50 space-y-4">
            <div className="flex justify-center items-center gap-3">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="flex-grow overflow-y-auto">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white p-4 border-b border-gray-50 flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-5 w-1/2 rounded" />
                        <Skeleton className="h-3 w-1/3 rounded" />
                        <Skeleton className="h-5 w-16 rounded-full mt-2" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-16 rounded-lg" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ProfileScreenSkeleton = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white p-4 border-b border-gray-100">
            <Skeleton className="h-8 w-32 rounded-lg mx-auto" />
        </div>
        <div className="p-6 flex flex-col items-center">
            <Skeleton className="w-32 h-32 rounded-full mb-4" />
            <Skeleton className="h-8 w-48 rounded-lg mb-2" />
            <Skeleton className="h-5 w-32 rounded-lg mb-8" />
            <div className="w-full bg-white rounded-2xl border border-gray-100 p-2 space-y-1">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center p-4 gap-4">
                        <Skeleton className="w-9 h-9 rounded-full" />
                        <Skeleton className="h-5 w-32 rounded" />
                        <Skeleton className="h-5 w-24 rounded ml-auto" />
                    </div>
                ))}
            </div>
            <Skeleton className="h-14 w-full rounded-xl mt-8" />
        </div>
    </div>
);

const HistoryScreenSkeleton = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white p-4 border-b border-gray-100">
            <Skeleton className="h-8 w-32 rounded-lg mx-auto" />
        </div>
        <div className="p-4 bg-white border-b border-gray-100 space-y-4">
            <div className="flex bg-gray-100 rounded-xl p-1">
                <Skeleton className="flex-1 h-9 rounded-lg" />
                <Skeleton className="flex-1 h-9 rounded-lg" />
            </div>
            <div className="flex justify-between items-center">
                <Skeleton className="h-9 w-40 rounded-lg" />
            </div>
        </div>
        <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                    <Skeleton className="w-11 h-11 rounded-full" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-5 w-1/2 rounded" />
                        <Skeleton className="h-3 w-1/3 rounded" />
                    </div>
                    <div className="text-right space-y-1">
                        <Skeleton className="h-3 w-12 rounded ml-auto" />
                        <Skeleton className="h-5 w-8 rounded ml-auto" />
                    </div>
                    <Skeleton className="w-4 h-4 rounded ml-auto" />
                </div>
            ))}
        </div>
    </div>
);

const TripSummarySkeleton = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white p-4 border-b border-gray-100">
            <Skeleton className="h-8 w-32 rounded-lg mx-auto" />
        </div>
        <div className="p-6 space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
            </div>
            <div className="space-y-3">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
        </div>
        <div className="p-4 bg-white border-t border-gray-100 space-y-3 mt-auto">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
        </div>
    </div>
);

const SettingsScreenSkeleton = () => (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white p-4 border-b border-gray-100">
            <Skeleton className="h-8 w-32 rounded-lg mx-auto" />
        </div>
        <div className="p-6 space-y-8">
            {[1, 2].map(section => (
                <div key={section} className="space-y-3">
                    <Skeleton className="h-4 w-24 rounded ml-4" />
                    <div className="bg-white rounded-2xl border border-gray-100 p-2 space-y-1">
                        {[1, 2].map(item => (
                            <div key={item} className="flex items-center p-4 gap-4">
                                <Skeleton className="w-5 h-5 rounded" />
                                <Skeleton className="h-5 w-32 rounded flex-grow" />
                                <Skeleton className="w-10 h-6 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);


export default App;