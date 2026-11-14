import { Controller, Get } from '@nestjs/common';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { CategoriesService } from './categories.service';

@Controller('categories')
@CacheablePublic()
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.list();
  }
}
