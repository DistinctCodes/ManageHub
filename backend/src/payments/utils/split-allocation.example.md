# split-allocation.ts worked example

`allocateByBasisPoints` splits an integer `amount` across recipients whose
`basisPoints` sum to 10000 (100%), using the largest-remainder method.

## Example: splitting 100 three ways (3333/3333/3334 bps)

Shares: `A=3333bps`, `B=3333bps`, `C=3334bps`.

1. Scale each share: `100 * 3333 = 333300`, `100 * 3334 = 333400`.
2. Floor-divide by 10000: `A -> floor(333300/10000) = 33`, `B -> 33`,
   `C -> floor(333400/10000) = 33`.
3. Sum of floors = 99, so leftover = `100 - 99 = 1`.
4. Remainders: `A -> 3300`, `B -> 3300`, `C -> 3400`. `C` has the largest
   remainder, so it receives the leftover unit.

Result: `A=33`, `B=33`, `C=34`, summing to exactly 100.

If two shares tie on remainder, `sortOrder` (then input position) breaks
the tie deterministically, so the same input always allocates the same way.
