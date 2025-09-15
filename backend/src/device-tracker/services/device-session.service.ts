import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { DeviceTracker, DeviceStatus } from '../entities/device-tracker.entity';

export interface DeviceSession {
  deviceId: string;
  userId?: string;
  sessionToken: string;
  lastActivity: Date;
  isActive: boolean;
  ipAddress: string;
  userAgent?: string;
  expiresAt: Date;
}

export interface SessionSummary {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  suspiciousSessions: number;
  sessionsPerDevice: Array<{
    deviceId: string;
    sessionCount: number;
    lastActivity: Date;
  }>;
}

@Injectable()
export class DeviceSessionService {
  private sessions: Map<string, DeviceSession> = new Map();
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor(
    @InjectRepository(DeviceTracker)
    private deviceTrackerRepository: Repository<DeviceTracker>,
  ) {
    // Start cleanup timer
    setInterval(() => this.cleanupExpiredSessions(), this.CLEANUP_INTERVAL);
  }

  async createSession(
    deviceId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DeviceSession> {
    // Verify device exists
    const device = await this.deviceTrackerRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Generate session token
    const sessionToken = this.generateSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT);

    const session: DeviceSession = {
      deviceId,
      userId: userId || device.userId,
      sessionToken,
      lastActivity: now,
      isActive: true,
      ipAddress: ipAddress || device.ipAddress,
      userAgent: userAgent || device.userAgent,
      expiresAt,
    };

    this.sessions.set(sessionToken, session);

    // Update device last seen
    await this.updateDeviceActivity(deviceId);

    return session;
  }

  async getSession(sessionToken: string): Promise<DeviceSession | null> {
    const session = this.sessions.get(sessionToken);
    
    if (!session) {
      return null;
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionToken);
      return null;
    }

    return session;
  }

  async updateSessionActivity(sessionToken: string): Promise<void> {
    const session = this.sessions.get(sessionToken);
    
    if (session && session.isActive) {
      session.lastActivity = new Date();
      session.expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT);
      
      // Update device activity as well
      await this.updateDeviceActivity(session.deviceId);
    }
  }

  async terminateSession(sessionToken: string): Promise<void> {
    const session = this.sessions.get(sessionToken);
    
    if (session) {
      session.isActive = false;
      this.sessions.delete(sessionToken);
    }
  }

  async terminateAllSessionsForDevice(deviceId: string): Promise<number> {
    let terminatedCount = 0;
    
    for (const [token, session] of this.sessions.entries()) {
      if (session.deviceId === deviceId) {
        this.sessions.delete(token);
        terminatedCount++;
      }
    }
    
    return terminatedCount;
  }

  async terminateAllSessionsForUser(userId: string): Promise<number> {
    let terminatedCount = 0;
    
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
        terminatedCount++;
      }
    }
    
    return terminatedCount;
  }

  async getActiveSessionsForDevice(deviceId: string): Promise<DeviceSession[]> {
    const sessions: DeviceSession[] = [];
    
    for (const session of this.sessions.values()) {
      if (session.deviceId === deviceId && session.isActive && session.expiresAt > new Date()) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }

  async getActiveSessionsForUser(userId: string): Promise<DeviceSession[]> {
    const sessions: DeviceSession[] = [];
    
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.isActive && session.expiresAt > new Date()) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }

  async getSessionSummary(): Promise<SessionSummary> {
    const now = new Date();
    let totalSessions = 0;
    let activeSessions = 0;
    let expiredSessions = 0;
    let suspiciousSessions = 0;
    
    const deviceSessionCounts = new Map<string, { count: number; lastActivity: Date }>();
    
    for (const session of this.sessions.values()) {
      totalSessions++;
      
      if (session.expiresAt < now) {
        expiredSessions++;
      } else if (session.isActive) {
        activeSessions++;
      }
      
      // Check for suspicious activity (multiple sessions from different IPs)
      const deviceSessions = Array.from(this.sessions.values())
        .filter(s => s.deviceId === session.deviceId);
      const uniqueIPs = new Set(deviceSessions.map(s => s.ipAddress));
      
      if (uniqueIPs.size > 1) {
        suspiciousSessions++;
      }
      
      // Count sessions per device
      const current = deviceSessionCounts.get(session.deviceId);
      if (!current || session.lastActivity > current.lastActivity) {
        deviceSessionCounts.set(session.deviceId, {
          count: (current?.count || 0) + 1,
          lastActivity: session.lastActivity,
        });
      }
    }
    
    const sessionsPerDevice = Array.from(deviceSessionCounts.entries()).map(
      ([deviceId, { count, lastActivity }]) => ({
        deviceId,
        sessionCount: count,
        lastActivity,
      }),
    );
    
    return {
      totalSessions,
      activeSessions,
      expiredSessions,
      suspiciousSessions,
      sessionsPerDevice,
    };
  }

  async validateSession(sessionToken: string): Promise<boolean> {
    const session = await this.getSession(sessionToken);
    return session !== null && session.isActive;
  }

  async extendSession(sessionToken: string, additionalTime?: number): Promise<void> {
    const session = this.sessions.get(sessionToken);
    
    if (session && session.isActive) {
      const extension = additionalTime || this.SESSION_TIMEOUT;
      session.expiresAt = new Date(session.expiresAt.getTime() + extension);
    }
  }

  async getSuspiciousSessions(): Promise<DeviceSession[]> {
    const suspiciousSessions: DeviceSession[] = [];
    const deviceIpMap = new Map<string, Set<string>>();
    
    // Group sessions by device and collect unique IPs
    for (const session of this.sessions.values()) {
      if (!deviceIpMap.has(session.deviceId)) {
        deviceIpMap.set(session.deviceId, new Set());
      }
      deviceIpMap.get(session.deviceId)!.add(session.ipAddress);
    }
    
    // Find sessions from devices with multiple IPs
    for (const session of this.sessions.values()) {
      const deviceIPs = deviceIpMap.get(session.deviceId);
      if (deviceIPs && deviceIPs.size > 1) {
        suspiciousSessions.push(session);
      }
    }
    
    return suspiciousSessions;
  }

  private async updateDeviceActivity(deviceId: string): Promise<void> {
    await this.deviceTrackerRepository.update(
      { id: deviceId },
      { 
        lastSeenAt: new Date(),
        loginCount: () => 'login_count + 1',
      },
    );
  }

  private generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredTokens: string[] = [];
    
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        expiredTokens.push(token);
      }
    }
    
    expiredTokens.forEach(token => this.sessions.delete(token));
    
    if (expiredTokens.length > 0) {
      console.log(`Cleaned up ${expiredTokens.length} expired sessions`);
    }
  }

  // Method to get session statistics for monitoring
  getSessionStats(): {
    totalActiveSessions: number;
    memoryUsage: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  } {
    const now = new Date();
    let activeSessions = 0;
    let oldestSession: Date | null = null;
    let newestSession: Date | null = null;
    
    for (const session of this.sessions.values()) {
      if (session.isActive && session.expiresAt > now) {
        activeSessions++;
        
        if (!oldestSession || session.lastActivity < oldestSession) {
          oldestSession = session.lastActivity;
        }
        
        if (!newestSession || session.lastActivity > newestSession) {
          newestSession = session.lastActivity;
        }
      }
    }
    
    return {
      totalActiveSessions: activeSessions,
      memoryUsage: this.sessions.size,
      oldestSession,
      newestSession,
    };
  }
}