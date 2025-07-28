// app.module.ts (Integration example)
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VisitorModule } from "./visitor/visitor.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres", // or 'mysql', 'sqlite', etc.
      host: "localhost",
      port: 5432,
      username: "your_username",
      password: "your_password",
      database: "visitor_log_db",
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      synchronize: true, // Set to false in production
    }),
    VisitorModule,
  ],
})
export class AppModule {}
