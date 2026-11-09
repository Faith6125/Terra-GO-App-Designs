import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Vehicle } from '../types';
import { MOCK_ASSIGNED_VEHICLES } from '../constants';

interface VehicleContextType {
  selectedVehicle: Vehicle;
  setSelectedVehicle: (vehicle: Vehicle) => void;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(MOCK_ASSIGNED_VEHICLES[0]);

  return (
    <VehicleContext.Provider value={{ selectedVehicle, setSelectedVehicle }}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicle = () => {
  const context = useContext(VehicleContext);
  if (context === undefined) {
    throw new Error('useVehicle must be used within a VehicleProvider');
  }
  return context;
};
