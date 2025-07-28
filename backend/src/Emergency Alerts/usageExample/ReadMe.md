/ Example usage in app.module.ts
/\*
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyAlertsModule } from './emergency-alerts/emergency-alerts.module';

@Module({
imports: [
TypeOrmModule.forRoot({
type: 'postgres', // or your preferred database
host: 'localhost',
port: 5432,
username: 'your_username',
password: 'your_password',
database: 'your_database',
entities: [__dirname + '/**/*.entity{.ts,.js}'],
synchronize: true, // Don't use in production
}),
EmergencyAlertsModule,
],
})
export class AppModule {}
\*/
