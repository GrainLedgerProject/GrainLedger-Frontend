import React from 'react';
import { AppIcon, type AppIconName, type AppIconProps } from './AppIcon';

// Compatibility names: all rendering remains behind the single AppIcon API.
function icon(name: AppIconName) {
  return function NamedIcon(props: Omit<AppIconProps, 'name'>) {
    return <AppIcon {...props} name={name} />;
  };
}

export const AlertOctagon = icon('AlertOctagon');
export const AlertTriangle = icon('AlertTriangle');
export const ArrowLeft = icon('ArrowLeft');
export const ArrowRight = icon('ArrowRight');
export const Building = icon('Building');
export const Building2 = icon('Building2');
export const Check = icon('Check');
export const CheckCircle = icon('CheckCircle');
export const CheckCircle2 = icon('CheckCircle2');
export const Cloud = icon('Cloud');
export const FileText = icon('FileText');
export const FlaskConical = icon('FlaskConical');
export const Inbox = icon('Inbox');
export const Info = icon('Info');
export const KeyRound = icon('KeyRound');
export const Lock = icon('Lock');
export const LogOut = icon('LogOut');
export const MapPin = icon('MapPin');
export const Phone = icon('Phone');
export const PlusCircle = icon('PlusCircle');
export const QrCode = icon('QrCode');
export const RefreshCw = icon('RefreshCw');
export const Scale = icon('Scale');
export const Search = icon('Search');
export const Server = icon('Server');
export const Share2 = icon('Share2');
export const Shield = icon('Shield');
export const ShieldAlert = icon('ShieldAlert');
export const ShieldCheck = icon('ShieldCheck');
export const Sliders = icon('Sliders');
export const Sparkles = icon('Sparkles');
export const Trash2 = icon('Trash2');
export const Truck = icon('Truck');
export const User = icon('User');
export const Warehouse = icon('Warehouse');
