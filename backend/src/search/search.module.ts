import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { DataSource } from 'typeorm';
import { SearchResultDto } from './dto/search-result.dto';

@Module({
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule implements OnModuleInit {
  private readonly logger = new Logger(SearchModule.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    this.registerProductsSearch();
    this.registerUsersSearch();
  }

  private registerProductsSearch() {
    this.searchService.registerSearchable('products', async (query, limit) => {
      try {
        const sql = `
          SELECT 
            id, 
            name as title, 
            ts_headline('english', coalesce(description, ''), plainto_tsquery('english', $1)) as description, 
            'products' as type,
            '/products/' || id as url,
            ts_rank(to_tsvector('english', name || ' ' || coalesce(description, '')), plainto_tsquery('english', $1)) as score
          FROM products
          WHERE to_tsvector('english', name || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $1)
          ORDER BY score DESC
          LIMIT $2
        `;

        const results = await this.dataSource.query(sql, [query, limit]);
        
        return results.map(r => new SearchResultDto({
          type: r.type,
          id: r.id,
          title: r.title,
          description: r.description,
          url: r.url,
          score: r.score
        }));
      } catch (error) {
        this.logger.error(`Error searching products: ${error.message}`);
        return [];
      }
    });
  }

  private registerUsersSearch() {
    this.searchService.registerSearchable('users', async (query, limit) => {
      try {
        // Based on User entity: firstname, lastname, email
        const sql = `
          SELECT 
            id, 
            firstname || ' ' || lastname as title, 
            email as description, 
            'users' as type,
            '/users/' || id as url,
            ts_rank(to_tsvector('english', coalesce(firstname, '') || ' ' || coalesce(lastname, '') || ' ' || coalesce(email, '')), plainto_tsquery('english', $1)) as score
          FROM users
          WHERE to_tsvector('english', coalesce(firstname, '') || ' ' || coalesce(lastname, '') || ' ' || coalesce(email, '')) @@ plainto_tsquery('english', $1)
          ORDER BY score DESC
          LIMIT $2
        `;

        const results = await this.dataSource.query(sql, [query, limit]);
        
        return results.map(r => new SearchResultDto({
          type: r.type,
          id: r.id,
          title: r.title,
          description: r.description,
          url: r.url,
          score: r.score
        }));
      } catch (error) {
        this.logger.error(`Error searching users: ${error.message}`);
        return [];
      }
    });
  }
}
