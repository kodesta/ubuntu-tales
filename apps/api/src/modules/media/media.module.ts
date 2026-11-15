import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaProcessor } from './media.processor';
import { MediaService } from './media.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, MediaProcessor],
  exports: [MediaService, MediaProcessor],
})
export class MediaModule {}
