import { Injectable } from '@nestjs/common';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { Contact, ContactType } from './entities/contact.entity';

@Injectable()
export class ContactRepository extends Repository<Contact> {
  constructor(private dataSource: DataSource) {
    super(Contact, dataSource.createEntityManager());
  }

  async findWithFuzzySearch(
    search?: string,
    type?: ContactType,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ contacts: Contact[]; total: number }> {
    const queryBuilder: SelectQueryBuilder<Contact> =
      this.createQueryBuilder('contact');

    if (search) {
      // Implement fuzzy search using ILIKE for PostgreSQL
      // This searches in both name and organization fields
      queryBuilder.where(
        '(LOWER(contact.name) LIKE LOWER(:search) OR LOWER(contact.organization) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );

      // Add similarity search using PostgreSQL's SIMILARITY function if pg_trgm extension is available
      // This requires the pg_trgm extension to be enabled in PostgreSQL
      queryBuilder.orWhere(
        'SIMILARITY(LOWER(contact.name), LOWER(:exactSearch)) > 0.3 OR SIMILARITY(LOWER(contact.organization), LOWER(:exactSearch)) > 0.3',
        { exactSearch: search },
      );
    }

    if (type) {
      queryBuilder.andWhere('contact.type = :type', { type });
    }

    queryBuilder
      .orderBy('contact.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [contacts, total] = await queryBuilder.getManyAndCount();

    return { contacts, total };
  }

  async findByEmail(email: string): Promise<Contact | null> {
    return this.findOne({ where: { email } });
  }

  async findByIdWithValidation(id: string): Promise<Contact | null> {
    return this.findOne({ where: { id } });
  }
}
