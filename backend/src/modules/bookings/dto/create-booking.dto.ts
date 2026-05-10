// backend/src/modules/bookings/dto/create-booking.dto.ts
export class CreateBookingDto {
  user_id!: number;
  room_type_id!: number;
  check_in_date!: string; // 'YYYY-MM-DD'
  check_out_date!: string;
  guests?: number;
}
