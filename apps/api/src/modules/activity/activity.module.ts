import { Module } from '@nestjs/common';
import { CatalogueModule } from '../../catalogue/catalogue.module';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import { SavedController } from './saved.controller';
import { SavedService } from './saved.service';

/**
 * Personal activity: saved stories, reading progress/stats and reactions (plan 03 §2.7).
 * Imports the catalogue module for the story mapper and recommendation ranking.
 */
@Module({
  imports: [CatalogueModule],
  controllers: [SavedController, ProgressController, ReactionsController, DownloadsController],
  providers: [SavedService, ProgressService, ReactionsService, DownloadsService],
})
export class ActivityModule {}
