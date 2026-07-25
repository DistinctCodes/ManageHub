export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  capacity: number;
  amenities: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationWithWorkspaces extends Location {
  workspaceCount: number;
  bookingCount: number;
}

export interface LocationFilters {
  country?: string;
  city?: string;
  minCapacity?: number;
  search?: string;
}

export class LocationService {
  private locations: Location[] = [];

  createLocation(data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Location {
    const location: Location = {
      ...data,
      id: `loc_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.locations.push(location);
    return location;
  }

  getLocationById(id: string): Location | undefined {
    return this.locations.find((loc) => loc.id === id);
  }

  getAllLocations(): Location[] {
    return this.locations;
  }

  updateLocation(id: string, updates: Partial<Location>): Location | null {
    const location = this.getLocationById(id);
    if (!location) return null;
    Object.assign(location, updates, { updatedAt: new Date() });
    return location;
  }

  deleteLocation(id: string): boolean {
    const index = this.locations.findIndex((loc) => loc.id === id);
    if (index === -1) return false;
    this.locations.splice(index, 1);
    return true;
  }
}
