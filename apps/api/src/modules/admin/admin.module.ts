import { Module } from '@nestjs/common';
import { SubmissionsModule } from '../submissions/submissions.module';
import { AdminCatalogueService } from './admin-catalogue.service';
import { AdminNarrationsService } from './admin-narrations.service';
import { AdminStoriesService } from './admin-stories.service';
import { AdminUsersService } from './admin-users.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [SubmissionsModule],
  controllers: [AdminController],
  providers: [AdminStoriesService, AdminNarrationsService, AdminCatalogueService, AdminUsersService],
})
export class AdminModule {}
