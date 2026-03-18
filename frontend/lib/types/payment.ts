//import { Booking } from "@/lib/types/booking"

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED"

export interface Payment {
id: string
reference: string
amountKobo: number
status: PaymentStatus
paidAt: string | null
userId: string
bookingId: string
//booking?: Booking 
user?: { id: string; firstname: string; lastname: string; email: string }
createdAt: string
updatedAt: string
}

export interface InitiatePaymentResponse {
    authorizationUrl: string
    reference: string
}

