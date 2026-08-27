<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Database migrations

The application never synchronizes entity changes to the database at startup.
Apply the checked-in migrations before starting an environment:

```bash
npm run migration:run
```

Create a migration after changing an entity (replace `DescriptiveName` with a
meaningful name), inspect the generated file, and commit it with the entity
change:

```bash
npm run migration:generate -- src/migrations/DescriptiveName
```

To undo the most recently applied migration in a local/development database:

```bash
npm run migration:revert
```

The commands use `src/database/data-source.ts` and the same environment
variables as the application (`DATABASE_HOST`, `DATABASE_PORT`,
`DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_SSL`, and
`PGSSLMODE`). Do not use `synchronize` or edit an already-applied migration.

## Authentication

The backend issues its own JWTs through `POST /auth/register` and
`POST /auth/login`. Tokens are signed with `JWT_SECRET` and then verified by
the HTTP guard and the payments socket gateway.

**Secure token storage**: JWTs are delivered to the browser via an
`httpOnly` cookie (`accessToken`) with `SameSite=strict` and `Secure` in
production. Because the cookie is `httpOnly`, it is not accessible to
JavaScript, which removes XSS as a token-theft vector. The frontend makes
same-origin requests and relies on the browser to attach the cookie
automatically; no `Authorization` header is built from client-side state.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Inventory Items Module

This module manages consumable stock items (stationery, spare parts, printer cartridges, etc.).

### Features

- CRUD operations for inventory items
- Stock movement tracking (IN/OUT)
- Reorder level monitoring
- Stock adjustment with reason tracking

### API Endpoints

- `POST /inventory-items` - Create a new inventory item
- `GET /inventory-items` - Get all inventory items
- `GET /inventory-items/:id` - Get a specific inventory item
- `PUT /inventory-items/:id` - Update an inventory item
- `DELETE /inventory-items/:id` - Delete an inventory item
- `PUT /inventory-items/:id/stock` - Update stock quantity
- `POST /inventory-items/:id/stock/add` - Add stock
- `POST /inventory-items/:id/stock/remove` - Remove stock
- `GET /inventory-items/:id/reorder-status` - Check if item is below reorder level
- `GET /inventory-items/:id/stock-movements` - Get stock movement history

### Entities

#### InventoryItem
- `id` - Primary key
- `name` - Item name
- `quantity` - Current stock quantity
- `reorderLevel` - Minimum stock level before reorder alert
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

#### StockMovement
- `id` - Primary key
- `type` - Movement type (IN/OUT)
- `quantity` - Quantity moved
- `reason` - Reason for movement
- `inventoryItem` - Reference to inventory item
- `createdAt` - Movement timestamp

## Credits Module — micropayment ledger & revenue distribution

An internal double-entry credit ledger for high-frequency, low-value
charges (per-minute resource usage, printing, meeting-room overage) that are
too small to settle on-chain individually, plus a configurable multi-party
revenue split engine and a batch settlement job that moves netted balances
off-platform over the Soroban rail.

- **Spend path** — `POST /credits/charge` debits a member's balance
  synchronously with no rail or chain call in the hot path, refusing
  anything that would breach the account's overdraft ceiling.
- **Top-up path** — a CONFIRMED payment carrying
  `metadata.purpose = "CREDIT_TOP_UP"` funds the payer's balance; one
  payment funds many micro-charges.
- **Split engine** — basis-point recipients validated to sum to exactly
  100% at configuration time, allocated by the largest-remainder method so
  rounding never loses or duplicates a minor unit.
- **Settlement** — hourly netting into at most one on-chain transfer per
  recipient, resumable after a crash and never marking a ledger entry
  settled before the rail confirms the payout.

Configuration lives under `CREDITS_*` in `.env.example`. For the schema,
the overdraft and rounding policies, the failure semantics and the full API
surface, see [Credits Module README](./src/credits/README.md).

## Booking references

`Payment.bookingId` is currently a forward-compatible booking reference used
by the payment idempotency and exclusivity rules. The dedicated bookings/check
in domain is not scaffolded in this repository yet, so the related env vars
were removed until that work lands.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
