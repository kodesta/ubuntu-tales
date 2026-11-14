import { Module } from '@nestjs/common';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { LibraryController } from './library.controller';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { TribesController } from './tribes.controller';
import { TribesService } from './tribes.service';
import { ViewerOverlayService } from './viewer.service';

/**
 * The public catalogue read path: catalogue, search, home, library and griots. Optional auth makes
 * `StoryCard.viewer` available for authenticated callers without changing guest behaviour.
 */
@Module({
  controllers: [
    StoriesController,
    TribesController,
    CategoriesController,
    AuthorsController,
    HomeController,
    LibraryController,
  ],
  providers: [
    StoriesService,
    TribesService,
    CategoriesService,
    AuthorsService,
    HomeService,
    ViewerOverlayService,
  ],
  exports: [StoriesService, ViewerOverlayService],
})
export class CatalogueModule {}
