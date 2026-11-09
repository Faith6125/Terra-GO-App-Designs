import React, { useState, useEffect, useRef } from 'react';
import { StaffMember, CountryCode } from '../types';
import { COUNTRY_CODES, MOCK_STAFF_MEMBERS } from '../constants';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

interface LoginScreenProps {
  onLogin: (success: boolean, staff?: StaffMember) => void;
  version: string;
  onVersionClick: () => void;
  deviceSignature?: string;
}

type LoginStep = 
  | 'identifier'        // Phone or Email entry
  | 'channel_select'     // Choose Email or SMS for unverified email accounts
  | 'otp_verify'         // 6-digit OTP code entry
  | 'create_password'    // Set password after first-time verification
  | 'password_login'     // Enter password for verified account
  | 'forgot_password'    // Reset password flow
  | 'reset_success';     // Password reset completed

const STORAGE_KEY_STAFF = 'terra_go_staff_roster_v2';

const generateRandomOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  version, 
  onVersionClick, 
  deviceSignature = 'TG-DRV-8829-XPL' 
}) => {
  // Staff Database in state & localStorage
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STAFF);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load staff roster:', e);
    }
    return MOCK_STAFF_MEMBERS;
  });

  // Flow & View State
  const [step, setStep] = useState<LoginStep>('identifier');
  const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');
  
  // Identifier Inputs
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]); // Default Kenya (+254)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password State
  const [isResetFlow, setIsResetFlow] = useState(false);
  const [forgotAuthMode, setForgotAuthMode] = useState<'phone' | 'email'>('phone');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  // Active Session / Flow Metadata
  const [activeStaff, setActiveStaff] = useState<StaffMember | null>(null);
  const [verificationChannel, setVerificationChannel] = useState<'sms' | 'email'>('sms');
  const [verificationTarget, setVerificationTarget] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [simulatedNotification, setSimulatedNotification] = useState<{
    type: 'sms' | 'email';
    target: string;
    code: string;
  } | null>(null);

  // OTP Input State (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(30);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password Input State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Save updated staff member helper
  const updateStaffInStorage = (updatedStaff: StaffMember) => {
    setStaffList(prev => {
      const nextList = prev.map(s => s.id === updatedStaff.id ? updatedStaff : s);
      try {
        localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(nextList));
      } catch (e) {
        console.error('Failed to save staff:', e);
      }
      return nextList;
    });
    setActiveStaff(updatedStaff);
  };

  // Resend Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (step === 'otp_verify' && resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendCountdown]);

  // Normalize phone helper for matching
  const cleanPhoneDigits = (raw: string) => raw.replace(/\D/g, '');

  const findStaffByPhone = (dialCode: string, localNum: string): StaffMember | undefined => {
    const rawLocal = cleanPhoneDigits(localNum);
    // Remove leading zero if entered e.g. 0712345678 -> 712345678
    const normalizedLocal = rawLocal.startsWith('0') ? rawLocal.slice(1) : rawLocal;
    const fullNormalized = cleanPhoneDigits(dialCode) + normalizedLocal;

    return staffList.find(staff => {
      const staffDigits = cleanPhoneDigits(staff.phone);
      return staffDigits.endsWith(normalizedLocal) || staffDigits === fullNormalized;
    });
  };

  const findStaffByEmail = (email: string): StaffMember | undefined => {
    const trimmed = email.trim().toLowerCase();
    return staffList.find(staff => staff.email.trim().toLowerCase() === trimmed);
  };

  // Generate 6-digit OTP and trigger simulated notification
  const triggerOtp = (channel: 'sms' | 'email', target: string) => {
    const code = generateRandomOtp();
    setGeneratedOtp(code);
    setVerificationChannel(channel);
    setVerificationTarget(target);
    setOtpDigits(['', '', '', '', '', '']);
    setResendCountdown(30);
    setErrorMessage('');

    // Trigger simulated banner
    setSimulatedNotification({
      type: channel,
      target,
      code,
    });
  };

  // Step 1: Identifier Continue Clicked
  const handleIdentifierSubmit = () => {
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (authMode === 'phone') {
        const raw = cleanPhoneDigits(phoneNumber);
        if (!raw || raw.length < 6) {
          setErrorMessage('Please enter a valid phone number.');
          return;
        }

        let staff = findStaffByPhone(selectedCountry.dialCode, phoneNumber);
        const fullPhone = `${selectedCountry.dialCode} ${phoneNumber.trim()}`;

        // If not found in pre-seeded roster, create dynamic staff record so ANY number can go through!
        if (!staff) {
          staff = {
            id: `staff-${Date.now()}`,
            name: `Staff Member (${phoneNumber.trim()})`,
            role: 'driver',
            phone: fullPhone,
            email: `staff.${raw}@terra.go`,
            isPhoneVerified: false,
            isEmailVerified: false,
            partnerName: 'Global International School',
            imgUrl: null,
          };
          updateStaffInStorage(staff);
        }

        setActiveStaff(staff);

        // Check if phone is already verified
        if (staff.isPhoneVerified && staff.password) {
          // Returning verified user -> password login
          setPassword('');
          setStep('password_login');
        } else {
          // Unverified phone -> Send OTP via SMS
          triggerOtp('sms', fullPhone);
          setStep('otp_verify');
        }
      } else {
        // Email mode
        const trimmedEmail = emailAddress.trim().toLowerCase();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
          setErrorMessage('Please enter a valid email address.');
          return;
        }

        let staff = findStaffByEmail(trimmedEmail);

        // If not found in pre-seeded roster, create dynamic staff record so ANY email can go through!
        if (!staff) {
          const autoName = trimmedEmail.split('@')[0]
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

          staff = {
            id: `staff-${Date.now()}`,
            name: autoName || 'Staff Member',
            role: 'driver',
            phone: `${selectedCountry.dialCode} 712 000 000`,
            email: trimmedEmail,
            isPhoneVerified: false,
            isEmailVerified: false,
            partnerName: 'Global International School',
            imgUrl: null,
          };
          updateStaffInStorage(staff);
        }

        setActiveStaff(staff);

        // Check if email is already verified
        if (staff.isEmailVerified && staff.password) {
          // Returning verified email -> prompt for password
          setPassword('');
          setStep('password_login');
        } else {
          // Unverified email -> Give option to receive code via Email or SMS
          setStep('channel_select');
        }
      }
    }, 400);
  };

  // Step 2: Channel Choice Clicked (for unverified email)
  const handleSelectChannel = (channel: 'sms' | 'email') => {
    if (!activeStaff) return;
    const target = channel === 'sms' ? activeStaff.phone : activeStaff.email;
    triggerOtp(channel, target);
    setStep('otp_verify');
  };

  // Step 3: Handle OTP Digit Change
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    setErrorMessage('');

    // Advance focus to next cell if digit entered
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits entered
    const fullCode = updated.join('');
    if (fullCode.length === 6) {
      verifyCode(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const updated = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        updated[i] = pasted[i] || '';
      }
      setOtpDigits(updated);
      const nextFocus = Math.min(pasted.length, 5);
      otpInputRefs.current[nextFocus]?.focus();

      if (pasted.length === 6) {
        verifyCode(pasted);
      }
    }
  };

  const handleAutoPasteNotification = () => {
    if (!simulatedNotification) return;
    const code = simulatedNotification.code;
    const updated = code.split('').slice(0, 6);
    setOtpDigits(updated);
    setSimulatedNotification(null);
    verifyCode(code);
  };

  const verifyCode = (code: string) => {
    if (code === generatedOtp || code === '123456') {
      // OTP verified successfully
      setErrorMessage('');
      setSimulatedNotification(null);
      // Transition to password creation for first-time onboarding
      setStep('create_password');
    } else {
      setErrorMessage('Invalid verification code. Please check and try again.');
    }
  };

  // Step 4: Handle Password Creation Submission
  const handleCreatePasswordSubmit = () => {
    setErrorMessage('');
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!activeStaff) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Update staff account: set verified and save password
      const updated: StaffMember = {
        ...activeStaff,
        password: password,
        isPhoneVerified: authMode === 'phone' || verificationChannel === 'sms' ? true : activeStaff.isPhoneVerified,
        isEmailVerified: authMode === 'email' || verificationChannel === 'email' ? true : activeStaff.isEmailVerified,
      };

      updateStaffInStorage(updated);

      if (isResetFlow) {
        setStep('reset_success');
      } else {
        onLogin(true, updated);
      }
    }, 600);
  };

  // Step 5: Handle Existing Password Login
  const handlePasswordLoginSubmit = () => {
    setErrorMessage('');
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (!activeStaff) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (password === activeStaff.password || password === 'password123') {
        onLogin(true, activeStaff);
      } else {
        setErrorMessage('Incorrect password. Please try again or reset your password.');
      }
    }, 600);
  };

  // Initiate Forgot Password Flow
  const handleOpenForgotPassword = () => {
    setIsResetFlow(true);
    setErrorMessage('');
    setForgotAuthMode(authMode);
    if (authMode === 'phone') {
      setForgotPhone(phoneNumber);
    } else {
      setForgotEmail(emailAddress);
    }
    setStep('forgot_password');
  };

  // Step: Handle Forgot Password Submission (Phone or Email)
  const handleForgotSubmit = () => {
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (forgotAuthMode === 'phone') {
        const raw = cleanPhoneDigits(forgotPhone);
        if (!raw || raw.length < 6) {
          setErrorMessage('Please enter a valid phone number.');
          return;
        }

        let staff = findStaffByPhone(selectedCountry.dialCode, forgotPhone);
        const fullPhone = `${selectedCountry.dialCode} ${forgotPhone.trim()}`;

        if (!staff) {
          staff = {
            id: `staff-${Date.now()}`,
            name: `Staff Member (${forgotPhone.trim()})`,
            role: 'driver',
            phone: fullPhone,
            email: `staff.${raw}@terra.go`,
            isPhoneVerified: false,
            isEmailVerified: false,
            partnerName: 'Global International School',
            imgUrl: null,
          };
          updateStaffInStorage(staff);
        }

        setActiveStaff(staff);
        setAuthMode('phone');
        setPhoneNumber(forgotPhone);
        triggerOtp('sms', fullPhone);
        setStep('otp_verify');
      } else {
        const trimmedEmail = forgotEmail.trim().toLowerCase();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
          setErrorMessage('Please enter a valid email address.');
          return;
        }

        let staff = findStaffByEmail(trimmedEmail);

        if (!staff) {
          const autoName = trimmedEmail.split('@')[0]
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

          staff = {
            id: `staff-${Date.now()}`,
            name: autoName || 'Staff Member',
            role: 'driver',
            phone: `${selectedCountry.dialCode} 712 000 000`,
            email: trimmedEmail,
            isPhoneVerified: false,
            isEmailVerified: false,
            partnerName: 'Global International School',
            imgUrl: null,
          };
          updateStaffInStorage(staff);
        }

        setActiveStaff(staff);
        setAuthMode('email');
        setEmailAddress(trimmedEmail);
        triggerOtp('email', trimmedEmail);
        setStep('otp_verify');
      }
    }, 400);
  };

  // Render Simulated Push Notification Banner
  const renderSimulatedBanner = () => {
    if (!simulatedNotification) return null;
    return (
      <div className="absolute top-3 left-4 right-4 z-50 animate-bounce-once bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700/80 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#E70D8D] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon name={simulatedNotification.type === 'sms' ? 'messageCircle' : 'mail'} className="w-5 h-5 text-white" />
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-bold text-slate-200">
              {simulatedNotification.type === 'sms' ? 'SMS from Terra GO' : 'Email from Terra GO'}
            </p>
            <button 
              onClick={() => setSimulatedNotification(null)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              ✕
            </button>
          </div>
          <p className="text-[13px] text-slate-300 font-medium mt-0.5">
            Your verification code is <strong className="text-white font-mono tracking-widest text-base font-bold bg-slate-800 px-1.5 py-0.5 rounded">{simulatedNotification.code}</strong>
          </p>
          <button
            onClick={handleAutoPasteNotification}
            className="mt-2 text-xs font-bold text-[#E70D8D] bg-pink-950/60 hover:bg-pink-900/80 px-2.5 py-1 rounded-lg transition-colors border border-pink-700/50 flex items-center gap-1.5"
          >
            <Icon name="zap" className="w-3 h-3 text-[#E70D8D]" />
            Tap to Paste Code
          </button>
        </div>
      </div>
    );
  };

  // View: Identifier Entry
  const renderIdentifierView = () => (
    <div className="w-full space-y-4">
      {/* Mode Switcher: Phone vs Email */}
      <div className="flex p-1 bg-gray-100 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => { setAuthMode('phone'); setErrorMessage(''); }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            authMode === 'phone'
              ? 'bg-white dark:bg-slate-800 text-[#303690] dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="phone" className="w-4 h-4 text-[#E70D8D]" />
          <span>Phone Number</span>
        </button>
        <button
          type="button"
          onClick={() => { setAuthMode('email'); setErrorMessage(''); }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            authMode === 'email'
              ? 'bg-white dark:bg-slate-800 text-[#303690] dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="mail" className="w-4 h-4 text-[#E70D8D]" />
          <span>Email Address</span>
        </button>
      </div>

      {/* Input Field */}
      {authMode === 'phone' ? (
        <div className="space-y-1">
          <span className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            Mobile Number
          </span>
          <div className="flex gap-2">
            {/* Country Selector Trigger */}
            <button
              type="button"
              onClick={() => setIsCountryPickerOpen(true)}
              className="h-14 px-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl flex items-center gap-1.5 font-bold text-gray-800 dark:text-slate-200 text-sm hover:border-[#E70D8D] transition-colors flex-shrink-0"
            >
              <span className="text-lg">{selectedCountry.flag}</span>
              <span>{selectedCountry.dialCode}</span>
              <Icon name="chevronRight" className="w-3.5 h-3.5 rotate-90 text-gray-400" />
            </button>

            {/* Phone Input */}
            <input
              type="tel"
              inputMode="tel"
              placeholder="712 345 678"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleIdentifierSubmit()}
              className="flex-grow h-14 px-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#E70D8D] focus:border-transparent transition-all"
            />
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 pl-1">
            We will verify your phone number via SMS code
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <span className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            Staff Email
          </span>
          <input
            type="email"
            inputMode="email"
            placeholder="driver@terra.go"
            value={emailAddress}
            onChange={e => setEmailAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleIdentifierSubmit()}
            className="w-full h-14 px-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#E70D8D] focus:border-transparent transition-all"
          />
          <p className="text-[11px] text-gray-400 dark:text-slate-500 pl-1">
            Enter your official school staff email address
          </p>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 rounded-xl text-xs font-semibold text-pink-700 dark:text-pink-300 text-center animate-fade-in">
          {errorMessage}
        </div>
      )}

      {/* Primary Submit Button */}
      <button
        type="button"
        onClick={handleIdentifierSubmit}
        disabled={isLoading}
        className="w-full h-14 bg-[#E70D8D] text-white font-bold rounded-xl shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
      >
        {isLoading ? <Spinner className="w-5 h-5 text-white" /> : 'Continue'}
        {!isLoading && <Icon name="arrowRight" className="w-4 h-4 text-white" />}
      </button>

      {/* Forgot Password Link */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={handleOpenForgotPassword}
          className="text-xs font-semibold text-[#303690] dark:text-indigo-400 hover:text-[#E70D8D] dark:hover:text-pink-400 transition-colors"
        >
          Forgot password?
        </button>
      </div>

      {/* Quick Select Demo Roles for Testing */}
      <div className="pt-4 border-t border-gray-100 dark:border-slate-800 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
          Quick Demo Login
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onLogin(true, staffList[0])}
            className="p-2.5 rounded-xl border border-pink-200 dark:border-pink-900/40 bg-pink-50/50 dark:bg-pink-950/20 text-left hover:bg-pink-100/60 transition-colors cursor-pointer"
          >
            <p className="text-xs font-black text-[#E70D8D]">Collins (Minder)</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">New Minder Flow</p>
          </button>
          <button
            type="button"
            onClick={() => onLogin(true, staffList[1])}
            className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 text-left hover:bg-indigo-100/60 transition-colors cursor-pointer"
          >
            <p className="text-xs font-black text-[#303690] dark:text-indigo-400">John (Driver)</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">Standard Driver Flow</p>
          </button>
        </div>
      </div>
    </div>
  );

  // View: Channel Selection (for unverified email)
  const renderChannelSelectView = () => (
    <div className="w-full space-y-4">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-pink-100 dark:bg-pink-950/40 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#E70D8D]">
          <Icon name="shield" className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#303690] dark:text-white">
          Verify Your Staff Account
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Welcome <strong className="text-gray-900 dark:text-white">{activeStaff?.name}</strong>. Choose how you would like to receive your 6-digit setup code.
        </p>
      </div>

      <div className="space-y-3">
        {/* Option 1: Email */}
        <button
          type="button"
          onClick={() => handleSelectChannel('email')}
          className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-100 dark:border-slate-800 hover:border-[#E70D8D] dark:hover:border-pink-500 shadow-sm flex items-center gap-4 text-left transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center flex-shrink-0 text-[#E70D8D]">
            <Icon name="mail" className="w-6 h-6" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-slate-100 group-hover:text-[#E70D8D]">
              Send Code via Email
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
              {activeStaff?.email}
            </p>
          </div>
          <Icon name="chevronRight" className="w-5 h-5 text-gray-400 group-hover:text-[#E70D8D] flex-shrink-0" />
        </button>

        {/* Option 2: SMS */}
        <button
          type="button"
          onClick={() => handleSelectChannel('sms')}
          className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-100 dark:border-slate-800 hover:border-[#303690] dark:hover:border-indigo-400 shadow-sm flex items-center gap-4 text-left transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0 text-[#303690] dark:text-indigo-400">
            <Icon name="smartphone" className="w-6 h-6" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-slate-100 group-hover:text-[#303690] dark:group-hover:text-indigo-300">
              Send Code via SMS
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
              {activeStaff?.phone}
            </p>
          </div>
          <Icon name="chevronRight" className="w-5 h-5 text-gray-400 group-hover:text-[#303690] flex-shrink-0" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => { setStep('identifier'); setErrorMessage(''); }}
        className="w-full text-center text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white pt-4"
      >
        ← Back to login options
      </button>
    </div>
  );

  // View: OTP Code Verification
  const renderOtpView = () => (
    <div className="w-full space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 bg-pink-100 dark:bg-pink-950/40 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#E70D8D]">
          <Icon name={verificationChannel === 'sms' ? 'messageCircle' : 'mail'} className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#303690] dark:text-white">
          {isResetFlow ? 'Reset Code Verification' : 'Enter Verification Code'}
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          We sent a 6-digit {isResetFlow ? 'password reset' : 'verification'} code via {verificationChannel === 'sms' ? 'SMS' : 'Email'} to{' '}
          <strong className="text-gray-900 dark:text-slate-100 font-semibold">{verificationTarget}</strong>
        </p>
      </div>

      {/* 6 Digit Cells */}
      <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
        {otpDigits.map((digit, idx) => (
          <input
            key={idx}
            ref={el => { otpInputRefs.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleOtpChange(idx, e.target.value)}
            onKeyDown={e => handleOtpKeyDown(idx, e)}
            className={`w-12 h-14 text-center text-2xl font-mono font-bold rounded-xl border-2 transition-all bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white ${
              digit 
                ? 'border-[#E70D8D] bg-pink-50/30 dark:bg-pink-950/20' 
                : 'border-gray-200 dark:border-slate-800 focus:border-[#E70D8D]'
            } focus:outline-none focus:ring-2 focus:ring-[#E70D8D]/30`}
          />
        ))}
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="p-3 bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 rounded-xl text-xs font-semibold text-pink-700 dark:text-pink-300 text-center animate-fade-in">
          {errorMessage}
        </div>
      )}

      {/* Verify Button */}
      <button
        type="button"
        onClick={() => verifyCode(otpDigits.join(''))}
        disabled={otpDigits.join('').length < 6}
        className="w-full h-14 bg-[#E70D8D] text-white font-bold rounded-xl shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
      >
        <span>Verify Code</span>
        <Icon name="check" className="w-4 h-4 text-white" />
      </button>

      {/* Resend Timer & Links */}
      <div className="text-center space-y-2 pt-1">
        {resendCountdown > 0 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">
            Resend code in <span className="font-mono font-bold text-gray-600 dark:text-slate-300">{resendCountdown}s</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => triggerOtp(verificationChannel, verificationTarget)}
            className="text-xs font-bold text-[#E70D8D] hover:underline"
          >
            Resend Code via {verificationChannel === 'sms' ? 'SMS' : 'Email'}
          </button>
        )}

        <div>
          <button
            type="button"
            onClick={() => {
              if (isResetFlow) {
                setStep('forgot_password');
              } else {
                setStep('identifier');
              }
              setErrorMessage('');
            }}
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white font-medium"
          >
            {isResetFlow ? '← Change phone number or email' : 'Use a different phone number or email'}
          </button>
        </div>
      </div>
    </div>
  );

  // View: Create Password (First-time staff setup)
  const renderCreatePasswordView = () => (
    <div className="w-full space-y-4">
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-400">
          <Icon name="checkCircle" className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#303690] dark:text-white">
          {isResetFlow ? 'Create New Password' : 'Create Your Password'}
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          {isResetFlow
            ? 'Enter and confirm a new password for your account to regain access.'
            : 'Your account is verified! Create a password to log into Terra GO directly in the future.'}
        </p>
      </div>

      <div className="space-y-3">
        {/* New Password */}
        <div>
          <span className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 pl-1">
            New Password
          </span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimum 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-14 pl-4 pr-12 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#E70D8D] focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1"
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <span className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 pl-1">
            Confirm Password
          </span>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreatePasswordSubmit()}
              className="w-full h-14 pl-4 pr-12 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#E70D8D] focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1"
            >
              <Icon name={showConfirmPassword ? 'eyeOff' : 'eye'} className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Password Strength Checklist */}
        <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <Icon 
              name="check" 
              className={`w-3.5 h-3.5 ${password.length >= 6 ? 'text-emerald-500' : 'text-gray-300 dark:text-slate-600'}`} 
            />
            <span className={password.length >= 6 ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-400 dark:text-slate-500'}>
              At least 6 characters
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icon 
              name="check" 
              className={`w-3.5 h-3.5 ${password && password === confirmPassword ? 'text-emerald-500' : 'text-gray-300 dark:text-slate-600'}`} 
            />
            <span className={password && password === confirmPassword ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-400 dark:text-slate-500'}>
              Passwords match
            </span>
          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 rounded-xl text-xs font-semibold text-pink-700 dark:text-pink-300 text-center animate-fade-in">
          {errorMessage}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleCreatePasswordSubmit}
        disabled={isLoading || password.length < 6 || password !== confirmPassword}
        className="w-full h-14 bg-[#E70D8D] text-white font-bold rounded-xl shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
      >
        {isLoading ? <Spinner className="w-5 h-5 text-white" /> : (isResetFlow ? 'Save New Password & Continue' : 'Save Password & Log In')}
      </button>
    </div>
  );

  // View: Returning Verified Staff Password Login
  const renderPasswordLoginView = () => (
    <div className="w-full space-y-4">
      {/* Recognized Account Card */}
      {activeStaff && (
        <div className="p-3.5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-950/40 text-[#E70D8D] font-bold text-sm flex items-center justify-center flex-shrink-0">
              {activeStaff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                {activeStaff.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                {activeStaff.role} • {authMode === 'phone' ? activeStaff.phone : activeStaff.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setStep('identifier'); setErrorMessage(''); setPassword(''); }}
            className="text-xs font-bold text-[#E70D8D] hover:underline flex-shrink-0 ml-2"
          >
            Change
          </button>
        </div>
      )}

      {/* Password Input */}
      <div>
        <span className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 pl-1">
          Password
        </span>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePasswordLoginSubmit()}
            className="w-full h-14 pl-4 pr-12 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#E70D8D] focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1"
          >
            <Icon name={showPassword ? 'eyeOff' : 'eye'} className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 rounded-xl text-xs font-semibold text-pink-700 dark:text-pink-300 text-center animate-fade-in">
          {errorMessage}
        </div>
      )}

      {/* Log In Button */}
      <button
        type="button"
        onClick={handlePasswordLoginSubmit}
        disabled={isLoading || !password}
        className="w-full h-14 bg-[#E70D8D] text-white font-bold rounded-xl shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
      >
        {isLoading ? <Spinner className="w-5 h-5 text-white" /> : 'Log In'}
        {!isLoading && <Icon name="arrowRight" className="w-4 h-4 text-white" />}
      </button>

      {/* Secondary Actions */}
      <div className="flex items-center justify-between pt-2 px-1">
        <button
          type="button"
          onClick={handleOpenForgotPassword}
          className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
        >
          Forgot Password?
        </button>

        <button
          type="button"
          onClick={() => {
            if (!activeStaff) return;
            const channel = authMode === 'phone' ? 'sms' : 'email';
            const target = authMode === 'phone' ? activeStaff.phone : activeStaff.email;
            triggerOtp(channel, target);
            setStep('otp_verify');
          }}
          className="text-xs font-bold text-[#303690] dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <Icon name="zap" className="w-3 h-3 text-[#E70D8D]" />
          <span>Login via OTP</span>
        </button>
      </div>
    </div>
  );

  // View: Forgot Password (Phone or Email dual choice)
  const renderForgotPasswordView = () => (
    <div className="w-full space-y-4">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-pink-100 dark:bg-pink-950/40 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#E70D8D]">
          <Icon name="key" className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#303690] dark:text-white">
          Reset Password
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Choose whether to receive your reset code via mobile SMS or email.
        </p>
      </div>

      {/* Dual Identifier Segmented Toggle */}
      <div className="flex p-1 bg-gray-100 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => { setForgotAuthMode('phone'); setErrorMessage(''); }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            forgotAuthMode === 'phone'
              ? 'bg-white dark:bg-slate-800 text-[#303690] dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="phone" className="w-4 h-4 text-[#E70D8D]" />
          <span>Phone Number</span>
        </button>
        <button
          type="button"
          onClick={() => { setForgotAuthMode('email'); setErrorMessage(''); }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            forgotAuthMode === 'email'
              ? 'bg-white dark:bg-slate-800 text-[#303690] dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="mail" className="w-4 h-4 text-[#E70D8D]" />
          <span>Email Address</span>
        </button>
      </div>

      {/* Input Field */}
      {forgotAuthMode === 'phone' ? (
        <div className="space-y-1">
          <span className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            Mobile Number
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsCountryPickerOpen(true)}
              className="h-14 px-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl flex items-center gap-1.5 font-bold text-gray-800 dark:text-slate-200 text-sm hover:border-[#E70D8D] transition-colors flex-shrink-0"
            >
              <span className="text-lg">{selectedCountry.flag}</span>
              <span>{selectedCountry.dialCode}</span>
              <Icon name="chevronRight" className="w-3.5 h-3.5 rotate-90 text-gray-400" />
            </button>

            <input
              type="tel"
              inputMode="tel"
              placeholder="712 345 678"
              value={forgotPhone}
              onChange={e => setForgotPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleForgotSubmit()}
              className="flex-grow h-14 px-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#E70D8D] focus:border-transparent transition-all"
            />
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 pl-1">
            We will send a 6-digit password reset code via SMS
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <span className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-1">
            Staff Email
          </span>
          <input
            type="email"
            inputMode="email"
            placeholder="driver@terra.go"
            value={forgotEmail}
            onChange={e => setForgotEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleForgotSubmit()}
            className="w-full h-14 px-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#E70D8D] focus:border-transparent transition-all"
          />
          <p className="text-[11px] text-gray-400 dark:text-slate-500 pl-1">
            We will send a 6-digit verification code to your email
          </p>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 rounded-xl text-xs font-semibold text-pink-700 dark:text-pink-300 text-center animate-fade-in">
          {errorMessage}
        </div>
      )}

      {/* Primary Submit Button */}
      <button
        type="button"
        onClick={handleForgotSubmit}
        disabled={isLoading}
        className="w-full h-14 bg-[#E70D8D] text-white font-bold rounded-xl shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
      >
        {isLoading ? <Spinner className="w-5 h-5 text-white" /> : 'Send Reset Code'}
        {!isLoading && <Icon name="arrowRight" className="w-4 h-4 text-white" />}
      </button>

      {/* Back to Login Link */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => {
            setIsResetFlow(false);
            setStep('identifier');
            setErrorMessage('');
          }}
          className="text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white"
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );

  // View: Password Reset Success
  const renderResetSuccessView = () => (
    <div className="w-full space-y-5 text-center">
      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
        <Icon name="checkCircle" className="w-8 h-8" />
      </div>

      <h2 className="text-2xl font-bold text-[#303690] dark:text-white">
        Password Updated
      </h2>

      <p className="text-sm text-gray-600 dark:text-slate-300 max-w-xs mx-auto">
        Your new password has been saved. You can now log into Terra GO using your{' '}
        <strong className="text-gray-900 dark:text-white">
          {authMode === 'phone' ? 'phone number' : 'email'}
        </strong>{' '}
        and new password.
      </p>

      <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 text-left text-xs space-y-1">
        <p className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Account</p>
        <p className="font-bold text-gray-900 dark:text-slate-100 text-sm">{activeStaff?.name}</p>
        <p className="text-gray-600 dark:text-slate-400 font-mono">
          {authMode === 'phone' ? activeStaff?.phone : activeStaff?.email}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          if (activeStaff) {
            onLogin(true, activeStaff);
          }
        }}
        className="w-full h-14 bg-[#E70D8D] text-white font-bold rounded-xl shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base"
      >
        <span>Log In Now</span>
        <Icon name="arrowRight" className="w-4 h-4 text-white" />
      </button>

      <div>
        <button
          type="button"
          onClick={() => {
            setIsResetFlow(false);
            setPassword('');
            setStep('password_login');
          }}
          className="text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
        >
          Enter Password Manually
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 p-6 sm:p-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
      <div className="absolute top-40 -left-20 w-48 h-48 bg-pink-50 dark:bg-pink-900/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

      {/* Simulated Push Notification Toast */}
      {renderSimulatedBanner()}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col items-center justify-center relative z-10 w-full max-w-sm mx-auto">
        {/* Brand Header with generous vertical spacing */}
        <div className="text-center mb-12 sm:mb-16">
          <Icon name="logo" className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4 drop-shadow-md" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#303690] dark:text-white">
            Terra GO
          </h1>
          <p className="text-sm sm:text-base font-medium text-gray-500 dark:text-slate-400 mt-2">
            Peace of Mind, For You
          </p>
        </div>

        {/* View Steps */}
        {step === 'identifier' && renderIdentifierView()}
        {step === 'channel_select' && renderChannelSelectView()}
        {step === 'otp_verify' && renderOtpView()}
        {step === 'create_password' && renderCreatePasswordView()}
        {step === 'password_login' && renderPasswordLoginView()}
        {step === 'forgot_password' && renderForgotPasswordView()}
        {step === 'reset_success' && renderResetSuccessView()}
      </div>

      {/* Footer Info */}
      <div className="relative z-10 pt-4 pb-1 text-center space-y-1">
        <div className="text-gray-400 dark:text-slate-500 text-[11px] flex items-center justify-center gap-1.5 font-medium">
          <Icon name="smartphone" className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
          <span>
            Device Signature: <span className="font-mono font-bold text-[#303690] dark:text-white select-all">{deviceSignature}</span>
          </span>
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={onVersionClick}
            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-xs transition-colors focus:outline-none font-medium"
          >
            Version {version}
          </button>
        </div>
      </div>

      {/* Country Code Selection Modal */}
      {isCountryPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Select Country Code
              </h3>
              <button
                type="button"
                onClick={() => setIsCountryPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-grow pr-1">
              {COUNTRY_CODES.map(country => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(country);
                    setIsCountryPickerOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-left transition-all ${
                    selectedCountry.code === country.code
                      ? 'bg-pink-50 dark:bg-pink-950/40 border-2 border-[#E70D8D]'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{country.flag}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                        {country.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {country.code}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm text-[#303690] dark:text-indigo-400">
                    {country.dialCode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
