import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm"

export enum WorkspaceType {
  HOT_DESK = "hot desk",
  PRIVATE_OFFICE = "private office",
  VIRTUAL = "virtual",
}

@Entity()
export class Workspace {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

  @Column({
    type: "enum",
    enum: WorkspaceType,
    default: WorkspaceType.HOT_DESK,
  })
  type: WorkspaceType

  @Column()
  capacity: number

  @Column({ default: true })
  isAvailable: boolean

  @Column("simple-array")
  amenities: string[]

  @Column()
  location: string

  @CreateDateColumn()
  createdAt: Date
}
