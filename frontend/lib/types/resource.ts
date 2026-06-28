export interface Resource {
  id: string;
  name: string;
  type?: string;
  description?: string;
  pricePerHour?: number;
  hourlyPrice?: number;
  price?: number;
  isAvailable?: boolean;
  available?: boolean;
  status?: string;
  imageUrl?: string;
  images?: string[];
  thumbnail?: string;
  coverImage?: string;
  location?: string;
  capacity?: number;
}

export interface ResourceAvailability {
  resourceId: string;
  date: string;
  available: boolean;
  message?: string;
  startTime?: string;
  endTime?: string;
  availableSlots?: number;
}

export interface ResourceBookingPayload {
  date: string;
  startTime: string;
  endTime: string;
  quantity?: number;
}

export interface ResourceBookingResponse {
  success?: boolean;
  message?: string;
  data?: {
    id?: string;
    bookingId?: string;
    booking?: {
      id?: string;
    };
    requiresPayment?: boolean;
    paymentRequired?: boolean;
    totalAmount?: number;
    amount?: number;
  };
}
