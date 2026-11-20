import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const contractsDirectory = resolve(__dirname, '../../../../contracts');

function parseEnum(source: string, expression: RegExp): [string, number][] {
  const body = source.match(expression)?.[1];
  if (!body) {
    throw new Error(`Could not find enum in source`);
  }
  const members: [string, number][] = [];
  for (const line of body.split('\n')) {
    const match = line
      .replace(/\/\/.*$/, '')
      .match(/^\s*(\w+)\s*=\s*(\d+)\s*,?\s*$/);
    if (match) {
      members.push([match[1], Number(match[2])]);
    }
  }
  return members.sort((left, right) => left[1] - right[1]);
}

describe('shared Soroban contract error codes', () => {
  const sharedCodes = readFileSync(
    resolve(contractsDirectory, 'shared/error-codes.ts'),
    'utf8',
  );
  const paymentRust = readFileSync(
    resolve(contractsDirectory, 'payment_escrow/src/lib.rs'),
    'utf8',
  );
  const revenueRust = readFileSync(
    resolve(contractsDirectory, 'revenue_distribution/src/lib.rs'),
    'utf8',
  );

  it('matches every payment_escrow Rust error code', () => {
    expect(
      parseEnum(
        sharedCodes,
        /export enum PaymentEscrowError\s*\{([\s\S]*?)\n\}/,
      ),
    ).toEqual(parseEnum(paymentRust, /pub enum Error\s*\{([\s\S]*?)\n\}/));
  });

  it('matches every revenue_distribution Rust error code', () => {
    expect(
      parseEnum(
        sharedCodes,
        /export enum RevenueDistributionError\s*\{([\s\S]*?)\n\}/,
      ),
    ).toEqual(parseEnum(revenueRust, /pub enum Error\s*\{([\s\S]*?)\n\}/));
  });
});
