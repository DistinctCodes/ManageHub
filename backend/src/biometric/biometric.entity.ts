import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('biometric_data')
export class BiometricDataEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  deviceId: string;

  @Column()
  biometricType: 'fingerprint' | 'face' | 'voice';

  @Column('int')
  dataQuality: number;

  @Column('text')
  payload: string;

  @Column()
  generatedAt: Date;
} 