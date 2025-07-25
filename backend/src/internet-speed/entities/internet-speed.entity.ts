import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class InternetSpeedResult {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Lagos, Nigeria' })
  @Column()
  location: string;

  @ApiProperty({ example: 45.6, description: 'Download speed in Mbps' })
  @Column('float')
  downloadSpeed: number;

  @ApiProperty({ example: 12.3, description: 'Upload speed in Mbps' })
  @Column('float')
  uploadSpeed: number;

  @ApiProperty({ example: 20, description: 'Ping in ms' })
  @Column()
  ping: number;

  @ApiProperty()
  @CreateDateColumn()
  timestamp: Date;
}