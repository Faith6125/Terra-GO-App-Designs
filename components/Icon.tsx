

import React from 'react';
import * as LucideIcons from 'lucide-react';
import { IconName } from '../types';
import { useVehicle } from './VehicleContext';

interface IconProps {
  name: IconName;
  className?: string;
}

const icons: Record<IconName, React.ElementType> = {
    bus: LucideIcons.Bus,
    van: LucideIcons.Van,
    user: LucideIcons.User,
    mapPin: LucideIcons.MapPin,
    checkCircle: LucideIcons.CircleCheck,
    circleCheck: LucideIcons.CircleCheck,
    check: LucideIcons.Check,
    x: LucideIcons.X,
    xCircle: LucideIcons.XCircle,
    alertTriangle: LucideIcons.AlertTriangle,
    clock: LucideIcons.Clock,
    logIn: LucideIcons.LogIn,
    logOut: LucideIcons.LogOut,
    arrowRight: LucideIcons.ArrowRight,
    sun: LucideIcons.Sun,
    moon: LucideIcons.Moon,
    map: LucideIcons.Map,
    userCheck: LucideIcons.UserCheck,
    search: LucideIcons.Search,
    users: LucideIcons.Users,
    shield: LucideIcons.Shield,
    fileText: LucideIcons.FileText,
    send: LucideIcons.Send,
    wifiOff: LucideIcons.WifiOff,
    info: LucideIcons.Info,
    smartphone: LucideIcons.Smartphone,
    settings: LucideIcons.Settings,
    bell: LucideIcons.Bell,
    database: LucideIcons.Database,
    helpCircle: LucideIcons.HelpCircle,
    wifi: LucideIcons.Wifi,
    barChart2: LucideIcons.BarChart2,
    crosshair: LucideIcons.Crosshair,
    zap: LucideIcons.Zap,
    loader: LucideIcons.Loader,
    copy: LucideIcons.Copy,
    chevronRight: LucideIcons.ChevronRight,
    refreshCw: LucideIcons.RefreshCw,
    logo: ({ className }: { className?: string }) => <img src="https://terrawebsite-uploads.sfo3.digitaloceanspaces.com/pic/Terra%20GO%20-%20Original/Artboard%204%20copy.svg" alt="Terra GO Logo" className={className} referrerPolicy="no-referrer" />,
    camera: LucideIcons.Camera,
    maximize: LucideIcons.Maximize,
    rotateCcw: LucideIcons.RotateCcw,
    phone: LucideIcons.Phone,
    messageCircle: LucideIcons.MessageCircle,
    chevronLeft: LucideIcons.ChevronLeft,
    edit: LucideIcons.Edit,
    star: LucideIcons.Star,
    lock: LucideIcons.Lock,
    unlock: LucideIcons.Unlock,
    mail: LucideIcons.Mail,
    eye: LucideIcons.Eye,
    eyeOff: LucideIcons.EyeOff,
    key: LucideIcons.KeyRound || LucideIcons.Key,
};

export const Icon: React.FC<IconProps> = ({ name, className }) => {
  const { selectedVehicle } = useVehicle();
  
  let IconComponent = icons[name];
  
  // If the icon is 'bus', we decide based on vehicleType
  if (name === 'bus') {
    IconComponent = selectedVehicle.type === 'bus' ? LucideIcons.Bus : LucideIcons.Van;
  }

  if (!IconComponent) {
    return null;
  }
  return <IconComponent className={className} />;
};
