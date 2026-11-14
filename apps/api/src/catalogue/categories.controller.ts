import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/auth/auth.decorators';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { CategoriesService } from './categories.service';

@Controller('categories')
@CacheablePublic()
@Public()
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.list();
  }
}
