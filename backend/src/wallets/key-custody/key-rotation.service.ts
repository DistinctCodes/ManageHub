import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletKeyMaterial } from '../entities/wallet-key-material.entity';
import { AdminActionLogService } from '../../admin-audit/admin-action-log.service';
import { AdminActionType } from '../../admin-audit/admin-action-type.enum';
import { MetricsService } from '../../common/metrics.service';
import { ConfigService } from '@nestjs/config';
import { AdminAuditRecorder, rotateWalletKey } from './key-rotation.util';
import {
  EnvelopeKeyManagementService,
  WrappedKey,
} from './key-management.service';

const DEFAULT_BATCH_SIZE = 200;

export interface RotateKeysInput {
  fromKeyId: string;
  toKeyId: string;
  adminId: string;
  batchSize?: number;
  /** Stop after this many batches (bounds one invocation). */
  maxBatches?: number;
}

export interface KeyRotationSummary {
  fromKeyId: string;
  toKeyId: string;
  rotated: number;
  failed: number;
  /** Rows still wrapped under `fromKeyId` after this run. */
  remaining: number;
}

/**
 * Admin-only, resumable re-wrap of custodial data keys from an old KEK to
 * a new one (issue #1945).
 *
 * Rotation never touches the Stellar secret or its ciphertext: it unwraps
 * each row's data key with the old master, wraps the *same* data key with
 * the new master, and updates the wrap columns plus `kmsKeyId` in one
 * conditional UPDATE. Because that UPDATE only matches rows still carrying
 * the old `kmsKeyId`, a re-run is idempotent, and because progress is
 * committed row-by-row, an interrupted run resumes simply by invoking the
 * job again. Every successfully re-wrapped row is recorded in the admin
 * audit trail; progress and old-key backlog are published on `/metrics`.
 */
@Injectable()
export class KeyRotationService {
  private readonly logger = new Logger(KeyRotationService.name);

  constructor(
    @InjectRepository(WalletKeyMaterial)
    private readonly materialRepository: Repository<WalletKeyMaterial>,
    private readonly kms: EnvelopeKeyManagementService,
    private readonly audit: AdminActionLogService,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  async rotate(input: RotateKeysInput): Promise<KeyRotationSummary> {
    if (input.fromKeyId === input.toKeyId) {
      throw new Error('fromKeyId and toKeyId must differ');
    }
    const batchSize = this.resolveBatchSize(input.batchSize);
    const maxBatches = input.maxBatches ?? Number.POSITIVE_INFINITY;

    let rotated = 0;
    let failed = 0;

    try {
      let batches = 0;
      while (batches < maxBatches) {
        const rows = await this.materialRepository.find({
          where: { kmsKeyId: input.fromKeyId },
          order: { id: 'ASC' },
          take: batchSize,
        });
        if (rows.length === 0) {
          break;
        }
        for (const row of rows) {
          await this.rotateOne(row, input.toKeyId, input.adminId);
          rotated += 1;
        }
        batches += 1;
        if (rows.length < batchSize) {
          break;
        }
      }
    } catch (error) {
      failed += 1;
      const remaining = await this.countRemaining(input.fromKeyId);
      this.metrics.recordWalletKeyRotation({
        keyId: input.fromKeyId,
        rotated,
        failed,
        remaining,
      });
      this.logger.error(
        `Wallet key rotation ${input.fromKeyId} -> ${input.toKeyId} interrupted after ${rotated} rows: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }

    const remaining = await this.countRemaining(input.fromKeyId);
    this.metrics.recordWalletKeyRotation({
      keyId: input.fromKeyId,
      rotated,
      failed,
      remaining,
    });
    this.logger.log(
      `Wallet key rotation ${input.fromKeyId} -> ${input.toKeyId}: rotated=${rotated} remaining=${remaining}`,
    );
    return {
      fromKeyId: input.fromKeyId,
      toKeyId: input.toKeyId,
      rotated,
      failed,
      remaining,
    };
  }

  /**
   * Re-wraps a single row's data key, then records the rotation through the
   * shared key-rotation helper (which owns the admin-audit entry).
   */
  private async rotateOne(
    row: WalletKeyMaterial,
    toKeyId: string,
    adminId: string,
  ): Promise<void> {
    const audit: AdminAuditRecorder = {
      record: async (entry) => {
        await this.audit.record({
          actorId: entry.adminId,
          action: AdminActionType.KEY_MATERIAL_ROTATED,
          targetType: 'WalletKeyMaterial',
          targetId: row.id,
          detail: `${entry.action}: ${row.kmsKeyId} -> ${toKeyId} (wallet ${entry.walletId})`,
        });
      },
    };

    await rotateWalletKey(
      row.walletAccountId,
      adminId,
      () => this.rewrapRow(row, toKeyId),
      audit,
    );
  }

  private async rewrapRow(
    row: WalletKeyMaterial,
    toKeyId: string,
  ): Promise<void> {
    const fromKeyId = row.kmsKeyId;
    const dataKey = await this.kms.unwrapDataKey({
      keyId: fromKeyId,
      wrapped: row.wrappedDataKey,
      iv: row.wrappedDataKeyIv,
      tag: row.wrappedDataKeyTag,
    });

    let wrapped: WrappedKey;
    try {
      wrapped = await this.kms.wrapDataKey(dataKey, toKeyId);
    } finally {
      dataKey.fill(0);
    }

    // Conditional on the row still being on the old key: if another worker
    // already re-wrapped it (or a concurrent write changed it), this is a
    // no-op rather than an overwrite.
    const result = await this.materialRepository.update(
      { id: row.id, kmsKeyId: fromKeyId },
      {
        kmsKeyId: wrapped.keyId,
        wrappedDataKey: wrapped.wrapped,
        wrappedDataKeyIv: wrapped.iv,
        wrappedDataKeyTag: wrapped.tag,
      },
    );
    if (!result.affected) {
      throw new Error(
        'Wallet key material changed while rotating; re-run to resume',
      );
    }
  }

  private async countRemaining(keyId: string): Promise<number> {
    return this.materialRepository.count({ where: { kmsKeyId: keyId } });
  }

  private resolveBatchSize(configured?: number): number {
    const candidate = Number(
      configured ??
        this.config.get<number>(
          'WALLET_KEY_ROTATION_BATCH_SIZE',
          DEFAULT_BATCH_SIZE,
        ),
    );
    return Number.isFinite(candidate) && candidate > 0
      ? Math.floor(candidate)
      : DEFAULT_BATCH_SIZE;
  }
}
