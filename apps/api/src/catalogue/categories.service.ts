import { Injectable } from '@nestjs/common';
import type { CategorySummary } from '@ubuntu-tales/shared';
import { PrismaService } from '../infra/prisma/prisma.service';
import { toCategorySummary } from './catalogue.mapper';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<CategorySummary[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return categories.map(toCategorySummary);
  }
}
