export interface SpaceType {
  id: string;
  category: string;
  name: string;
  rpImp: number; // CFM/person
  raImp: number; // CFM/ft2
  rpMet: number; // L/s/person
  raMet: number; // L/s/m2
  defaultDensityImp: number; // people/1000 ft2
  defaultDensityMet: number; // people/100 m2
  exhaustImp?: number; // CFM/unit (usually per ft2 or per unit)
  exhaustMet?: number; // L/s/unit
  exhaustType?: 'area' | 'unit'; // based on area or per unit (like toilets)
}

export const SPACE_TYPES: SpaceType[] = [
  // Office Buildings
  { id: 'office', category: 'Office Buildings', name: 'Office Space', rpImp: 5, raImp: 0.06, rpMet: 2.5, raMet: 0.3, defaultDensityImp: 5, defaultDensityMet: 5 },
  { id: 'reception', category: 'Office Buildings', name: 'Reception Areas', rpImp: 5, raImp: 0.06, rpMet: 2.5, raMet: 0.3, defaultDensityImp: 30, defaultDensityMet: 30 },
  { id: 'telephone', category: 'Office Buildings', name: 'Telephone/data entry', rpImp: 5, raImp: 0.06, rpMet: 2.5, raMet: 0.3, defaultDensityImp: 60, defaultDensityMet: 60 },
  { id: 'lobbies', category: 'Office Buildings', name: 'Main entry lobbies', rpImp: 5, raImp: 0.06, rpMet: 2.5, raMet: 0.3, defaultDensityImp: 10, defaultDensityMet: 10 },
  
  // Educational Facilities
  { id: 'daycare', category: 'Educational', name: 'Daycare (through age 4)', rpImp: 10, raImp: 0.18, rpMet: 5.0, raMet: 0.9, defaultDensityImp: 25, defaultDensityMet: 25 },
  { id: 'classroom', category: 'Educational', name: 'Classrooms (age 5-8)', rpImp: 10, raImp: 0.12, rpMet: 5.0, raMet: 0.6, defaultDensityImp: 25, defaultDensityMet: 25 },
  { id: 'classroom9plus', category: 'Educational', name: 'Classrooms (age 9+)', rpImp: 10, raImp: 0.12, rpMet: 5.0, raMet: 0.6, defaultDensityImp: 35, defaultDensityMet: 35 },
  { id: 'art_class', category: 'Educational', name: 'Art classrooms', rpImp: 10, raImp: 0.18, rpMet: 5.0, raMet: 0.9, defaultDensityImp: 20, defaultDensityMet: 20 },
  { id: 'science_lab', category: 'Educational', name: 'Science laboratories', rpImp: 10, raImp: 0.18, rpMet: 5.0, raMet: 0.9, defaultDensityImp: 25, defaultDensityMet: 25 },
  { id: 'wood_metal', category: 'Educational', name: 'Wood/metal shop', rpImp: 10, raImp: 0.18, rpMet: 5.0, raMet: 0.9, defaultDensityImp: 20, defaultDensityMet: 20 },
  { id: 'computer_lab', category: 'Educational', name: 'Computer lab', rpImp: 10, raImp: 0.12, rpMet: 5.0, raMet: 0.6, defaultDensityImp: 25, defaultDensityMet: 25 },
  { id: 'media_center', category: 'Educational', name: 'Media center', rpImp: 10, raImp: 0.12, rpMet: 5.0, raMet: 0.6, defaultDensityImp: 25, defaultDensityMet: 25 },
  { id: 'multiuse_asm', category: 'Educational', name: 'Multiuse assembly', rpImp: 7.5, raImp: 0.06, rpMet: 3.8, raMet: 0.3, defaultDensityImp: 100, defaultDensityMet: 100 },
  
  // Food & Beverage
  { id: 'restaurant', category: 'Food & Beverage', name: 'Restaurant dining rooms', rpImp: 7.5, raImp: 0.18, rpMet: 3.8, raMet: 0.9, defaultDensityImp: 70, defaultDensityMet: 70 },
  { id: 'cafeteria', category: 'Food & Beverage', name: 'Cafeteria / fast food', rpImp: 7.5, raImp: 0.18, rpMet: 3.8, raMet: 0.9, defaultDensityImp: 100, defaultDensityMet: 100 },
  { id: 'bars', category: 'Food & Beverage', name: 'Bars, cocktail lounges', rpImp: 7.5, raImp: 0.18, rpMet: 3.8, raMet: 0.9, defaultDensityImp: 100, defaultDensityMet: 100 },
  
  // General
  { id: 'breakroom', category: 'General', name: 'Breakrooms', rpImp: 5, raImp: 0.06, rpMet: 2.5, raMet: 0.3, defaultDensityImp: 25, defaultDensityMet: 25 },
  { id: 'coffee', category: 'General', name: 'Coffee stations', rpImp: 5, raImp: 0.06, rpMet: 2.5, raMet: 0.3, defaultDensityImp: 20, defaultDensityMet: 20 },
  { id: 'corridor', category: 'General', name: 'Corridors', rpImp: 0, raImp: 0.06, rpMet: 0, raMet: 0.3, defaultDensityImp: 0, defaultDensityMet: 0 },
  { id: 'conference', category: 'General', name: 'Conference / meeting', rpImp: 5, raImp: 0.06, rpMet: 2.5, raMet: 0.3, defaultDensityImp: 50, defaultDensityMet: 50 },
  { id: 'storage', category: 'General', name: 'Storage rooms', rpImp: 0, raImp: 0.12, rpMet: 0, raMet: 0.6, defaultDensityImp: 0, defaultDensityMet: 0 },
  
  // Retail
  { id: 'retail', category: 'Retail', name: 'Sales (except below)', rpImp: 7.5, raImp: 0.12, rpMet: 3.8, raMet: 0.6, defaultDensityImp: 15, defaultDensityMet: 15 },
  { id: 'mall', category: 'Retail', name: 'Mall concourses', rpImp: 7.5, raImp: 0.06, rpMet: 3.8, raMet: 0.3, defaultDensityImp: 40, defaultDensityMet: 40 },
  { id: 'supermarket', category: 'Retail', name: 'Supermarket', rpImp: 7.5, raImp: 0.06, rpMet: 3.8, raMet: 0.3, defaultDensityImp: 8, defaultDensityMet: 8 },
  { id: 'barber', category: 'Retail', name: 'Barber/beauty shops', rpImp: 7.5, raImp: 0.12, rpMet: 3.8, raMet: 0.6, defaultDensityImp: 25, defaultDensityMet: 25 },
  
  // Sports
  { id: 'gym', category: 'Sports & Entertainment', name: 'Gymnasium / Sports Arena', rpImp: 20, raImp: 0.3, rpMet: 10, raMet: 1.5, defaultDensityImp: 30, defaultDensityMet: 30 },
  { id: 'spectator', category: 'Sports & Entertainment', name: 'Spectator areas', rpImp: 7.5, raImp: 0.06, rpMet: 3.8, raMet: 0.3, defaultDensityImp: 150, defaultDensityMet: 150 },
  { id: 'disco', category: 'Sports & Entertainment', name: 'Disco / dance floors', rpImp: 20, raImp: 0.06, rpMet: 10, raMet: 0.3, defaultDensityImp: 100, defaultDensityMet: 100 },
  { id: 'health_club', category: 'Sports & Entertainment', name: 'Health club / aerobics', rpImp: 20, raImp: 0.06, rpMet: 10, raMet: 0.3, defaultDensityImp: 40, defaultDensityMet: 40 },
  
  // Public Assembly
  { id: 'worship', category: 'Public Assembly', name: 'Places of worship', rpImp: 5, raImp: 0.06, rpMet: 2.5, raMet: 0.3, defaultDensityImp: 120, defaultDensityMet: 120 },
  { id: 'library', category: 'Public Assembly', name: 'Libraries', rpImp: 5, raImp: 0.12, rpMet: 2.5, raMet: 0.6, defaultDensityImp: 10, defaultDensityMet: 10 },
  { id: 'museum', category: 'Public Assembly', name: 'Museums / galleries', rpImp: 7.5, raImp: 0.06, rpMet: 3.8, raMet: 0.3, defaultDensityImp: 40, defaultDensityMet: 40 },
  { id: 'auditorium', category: 'Public Assembly', name: 'Auditorium seating', rpImp: 5, raImp: 0.06, rpMet: 2.5, raMet: 0.3, defaultDensityImp: 150, defaultDensityMet: 150 },
  
  // Exhaust / Specialized
  { id: 'restroom_public', category: 'Exhaust & Specialized', name: 'Public Restrooms', rpImp: 0, raImp: 0, rpMet: 0, raMet: 0, defaultDensityImp: 0, defaultDensityMet: 0, exhaustImp: 50, exhaustMet: 25, exhaustType: 'unit' },
  { id: 'restroom_private', category: 'Exhaust & Specialized', name: 'Private Restrooms', rpImp: 0, raImp: 0, rpMet: 0, raMet: 0, defaultDensityImp: 0, defaultDensityMet: 0, exhaustImp: 25, exhaustMet: 12.5, exhaustType: 'unit' },
  { id: 'locker', category: 'Exhaust & Specialized', name: 'Locker Rooms', rpImp: 0, raImp: 0, rpMet: 0, raMet: 0, defaultDensityImp: 0, defaultDensityMet: 0, exhaustImp: 0.5, exhaustMet: 2.5, exhaustType: 'area' },
  { id: 'janitor', category: 'Exhaust & Specialized', name: 'Janitor Closets', rpImp: 0, raImp: 0, rpMet: 0, raMet: 0, defaultDensityImp: 0, defaultDensityMet: 0, exhaustImp: 1.0, exhaustMet: 5.0, exhaustType: 'area' },
  { id: 'copy', category: 'Exhaust & Specialized', name: 'Copy / Print Rooms', rpImp: 0, raImp: 0, rpMet: 0, raMet: 0, defaultDensityImp: 0, defaultDensityMet: 0, exhaustImp: 0.5, exhaustMet: 2.5, exhaustType: 'area' },
  { id: 'parking', category: 'Exhaust & Specialized', name: 'Enclosed Parking Garage', rpImp: 0, raImp: 0, rpMet: 0, raMet: 0, defaultDensityImp: 0, defaultDensityMet: 0, exhaustImp: 0.75, exhaustMet: 3.7, exhaustType: 'area' },
];
