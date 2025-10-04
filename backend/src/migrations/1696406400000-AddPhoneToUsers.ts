import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhoneToUsersAndSeedDemo1696406400000 implements MigrationInterface {
    name = 'AddPhoneToUsersAndSeedDemo1696406400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add phone column to users table
        await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying(15)`);
        
        // Insert demo users for testing profile functionality
        // Note: Password is bcrypt hash of "password123"
        const demoUsers = [
            {
                id: 'demo-admin-001',
                firstname: 'John',
                lastname: 'Doe',
                username: 'johndoe',
                email: 'john.doe@managehub.demo',
                phone: '+1234567890',
                password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO',
                role: 'admin',
                isVerified: true,
                isActive: true,
                isDeleted: false,
                isSuspended: false,
                profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
            },
            {
                id: 'demo-user-001',
                firstname: 'Jane',
                lastname: 'Smith',
                username: 'janesmith',
                email: 'jane.smith@managehub.demo',
                phone: '+1987654321',
                password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO',
                role: 'user',
                isVerified: true,
                isActive: true,
                isDeleted: false,
                isSuspended: false,
                profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'
            },
            {
                id: 'demo-user-002',
                firstname: 'Michael',
                lastname: 'Johnson',
                username: 'michaelj',
                email: 'michael.johnson@managehub.demo',
                phone: '+1555123456',
                password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO',
                role: 'user',
                isVerified: true,
                isActive: true,
                isDeleted: false,
                isSuspended: false,
                profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
            },
            {
                id: 'demo-user-003',
                firstname: 'Sarah',
                lastname: 'Williams',
                username: 'sarahw',
                email: 'sarah.williams@managehub.demo',
                phone: '+1444987654',
                password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO',
                role: 'user',
                isVerified: false,
                isActive: true,
                isDeleted: false,
                isSuspended: false,
                profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
            },
            {
                id: 'demo-user-004',
                firstname: 'Robert',
                lastname: 'Brown',
                username: 'robbrown',
                email: 'robert.brown@managehub.demo',
                phone: '+1333456789',
                password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO',
                role: 'user',
                isVerified: true,
                isActive: true,
                isDeleted: false,
                isSuspended: false,
                profilePicture: null
            },
            {
                id: 'demo-user-005',
                firstname: 'Emily',
                lastname: 'Davis',
                username: 'emilyd',
                email: 'emily.davis@managehub.demo',
                phone: null,
                password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO',
                role: 'user',
                isVerified: true,
                isActive: true,
                isDeleted: false,
                isSuspended: false,
                profilePicture: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face'
            }
        ];

        // Insert demo users (only if they don't already exist)
        for (const user of demoUsers) {
            const exists = await queryRunner.query(
                `SELECT id FROM "users" WHERE email = $1`,
                [user.email]
            );
            
            if (exists.length === 0) {
                await queryRunner.query(`
                    INSERT INTO "users" (
                        id, firstname, lastname, username, email, phone, password, 
                        role, "isVerified", "isActive", "isDeleted", "isSuspended", 
                        "profilePicture", "createdAt", "updatedAt"
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
                    )
                `, [
                    user.id, user.firstname, user.lastname, user.username, user.email,
                    user.phone, user.password, user.role, user.isVerified, user.isActive,
                    user.isDeleted, user.isSuspended, user.profilePicture
                ]);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove demo users
        await queryRunner.query(`DELETE FROM "users" WHERE email LIKE '%@managehub.demo'`);
        
        // Remove phone column
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
    }
}