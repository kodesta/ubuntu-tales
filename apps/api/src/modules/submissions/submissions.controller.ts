import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { Paginated, SubmissionDetail, SubmissionInput, SubmissionSummary } from '@ubuntu-tales/shared';
import { z } from 'zod';
import { CurrentUser } from '../../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { AppException } from '../../common/errors/app-exception';
import { parseCursor, parseLimit, type RawQuery } from '../../common/http/query-params';
import { SubmissionsService } from './submissions.service';

const submissionSchema = z.object({
  title: z.string().min(3).max(160),
  bodyText: z.string().min(1),
  moral: z.string().max(300).optional(),
  tribeId: z.string().uuid().optional(),
  customTribe: z.string().max(120).optional(),
  categoryId: z.string().uuid().optional(),
  attribution: z.string().max(300).optional(),
  coverAssetId: z.string().uuid().optional(),
  audioAssetId: z.string().uuid().optional(),
  rightsConfirmed: z.boolean(),
});

function parseBody(body: unknown): SubmissionInput {
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    throw AppException.validation(
      'The submission is invalid.',
      parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })),
    );
  }
  return parsed.data as SubmissionInput;
}

/** `/submissions` — community tales from readers (production plan 03 §2.8). */
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown): Promise<SubmissionDetail> {
    return this.submissions.create(user, parseBody(body));
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthenticatedUser, @Query() query: RawQuery): Promise<Paginated<SubmissionSummary>> {
    return this.submissions.mine(user.id, parseLimit(query.limit), parseCursor(query.cursor)?.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SubmissionDetail> {
    return this.submissions.get(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SubmissionDetail> {
    const partial = submissionSchema.partial().safeParse(body);
    if (!partial.success) {
      throw AppException.validation(
        'The submission is invalid.',
        partial.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })),
      );
    }
    return this.submissions.update(user, id, partial.data as Partial<SubmissionInput>);
  }

  @Post(':id/submit')
  submit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SubmissionSummary> {
    return this.submissions.submit(user, id);
  }

  @Post(':id/withdraw')
  withdraw(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SubmissionSummary> {
    return this.submissions.withdraw(user, id);
  }
}
