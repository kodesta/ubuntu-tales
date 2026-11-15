import { Controller, Get, Param } from '@nestjs/common';
import type { NarrationDetail } from '@ubuntu-tales/shared';
import { Public } from '../../common/auth/auth.decorators';
import { CacheablePublic } from '../../common/http/cacheable-public.decorator';
import { NarrationsService } from './narrations.service';

@Controller('narrations')
@Public()
@CacheablePublic()
export class NarrationsController {
  constructor(private readonly narrations: NarrationsService) {}

  @Get(':id')
  get(@Param('id') id: string): Promise<NarrationDetail> {
    return this.narrations.get(id);
  }
}
