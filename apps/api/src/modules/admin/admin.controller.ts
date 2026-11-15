import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import type {
  AdminMetricsOverview,
  AdminStoryDetail,
  AdminStoryListQuery,
  AdminStorySummary,
  AdminUserRow,
  AttachNarrationInput,
  AuditLogRow,
  CategoryInput,
  FeatureFlagRow,
  ModerationActionInput,
  NarrationAdminSummary,
  NarratorInput,
  Paginated,
  PublishResponse,
  StoryInput,
  StoryOfDayEntry,
  SubmissionStatus,
  SubmissionSummary,
  TribeInput,
  TribeSummary,
  UpdateNarrationInput,
  CategorySummary,
} from '@ubuntu-tales/shared';
import { z } from 'zod';
import { CurrentUser, Roles } from '../../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { parseLimit, type RawQuery } from '../../common/http/query-params';
import { AdminCatalogueService } from './admin-catalogue.service';
import { AdminNarrationsService } from './admin-narrations.service';
import { AdminStoriesService } from './admin-stories.service';
import { AdminUsersService } from './admin-users.service';
import { toAdminStorySummary } from './admin.mapper';

const storyInputSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(400),
  moral: z.string().max(300).optional(),
  tribeId: z.string().uuid(),
  categoryId: z.string().uuid(),
  narratorId: z.string().uuid().optional(),
  regionLabel: z.string().max(80).optional(),
  attribution: z.string().max(300).optional(),
  paragraphs: z.array(z.string().min(1)).min(1),
  accessLevel: z.enum(['FREE', 'PREMIUM']).optional(),
  isFeatured: z.boolean().optional(),
  coverAssetId: z.string().uuid().optional(),
});

const tribeSchema = z.object({
  slug: z.string().min(2).max(60),
  name: z.string().min(2).max(80),
  region: z.enum(['NORTH_AFRICA', 'WEST_AFRICA', 'CENTRAL_AFRICA', 'EAST_AFRICA', 'SOUTHERN_AFRICA']),
  countries: z.array(z.string()).default([]),
  countriesLabel: z.string().min(1),
  tagline: z.string().optional(),
  description: z.string().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  themeVariant: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const categorySchema = z.object({
  slug: z.string().min(2).max(40),
  name: z.string().min(1).max(60),
  badge: z.string().min(1).max(40),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const narratorSchema = z.object({
  slug: z.string().min(2).max(60),
  name: z.string().min(1).max(80),
  bio: z.string().optional(),
  roleLabel: z.string().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw AppException.validation(
      'The request is invalid.',
      parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })),
    );
  }
  return parsed.data;
}

/** `/admin/*` — the editorial console API (production plan 03 §2.10). All routes are EDITOR+. */
@Controller('admin')
@Roles('EDITOR', 'ADMIN')
export class AdminController {
  constructor(
    private readonly stories: AdminStoriesService,
    private readonly narrations: AdminNarrationsService,
    private readonly catalogue: AdminCatalogueService,
    private readonly users: AdminUsersService,
    private readonly prisma: PrismaService,
  ) {}

  // ───────────── stories ─────────────

  @Get('stories')
  listStories(@Query() query: RawQuery): Promise<Paginated<AdminStorySummary>> {
    return this.stories.list({
      ...(typeof query.status === 'string' ? { status: query.status as AdminStoryListQuery['status'] } : {}),
      ...(typeof query.tribe === 'string' ? { tribe: query.tribe } : {}),
      ...(typeof query.category === 'string' ? { category: query.category } : {}),
      ...(typeof query.q === 'string' ? { q: query.q } : {}),
      limit: parseLimit(query.limit),
    });
  }

  @Get('stories/:id')
  getStory(@Param('id') id: string): Promise<AdminStoryDetail> {
    return this.stories.get(id);
  }

  @Post('stories')
  createStory(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown): Promise<AdminStoryDetail> {
    return this.stories.create(parse(storyInputSchema, body) as StoryInput, user.id);
  }

  @Patch('stories/:id')
  updateStory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AdminStoryDetail> {
    return this.stories.update(id, parse(storyInputSchema.partial(), body) as Partial<StoryInput>, user.id);
  }

  @Post('stories/:id/publish')
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<PublishResponse> {
    return this.stories.publish(id, user.id);
  }

  @Post('stories/:id/unpublish')
  unpublish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<PublishResponse> {
    return this.stories.unpublish(id, user.id);
  }

  @Post('stories/:id/archive')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<PublishResponse> {
    return this.stories.archive(id, user.id);
  }

  // ───────────── narrations ─────────────

  @Get('narrations')
  listNarrations(@Query('storyId') storyId?: string): Promise<NarrationAdminSummary[]> {
    return this.narrations.list(storyId);
  }

  @Post('stories/:storyId/narrations')
  attachNarration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storyId') storyId: string,
    @Body() body: unknown,
  ): Promise<NarrationAdminSummary> {
    const schema = z.object({
      narratorId: z.string().uuid(),
      audioAssetId: z.string().uuid(),
      locale: z.string().optional(),
      soundscapeId: z.string().uuid().optional(),
      sentenceTimings: z
        .array(z.object({ sentenceId: z.string(), startMs: z.number(), endMs: z.number() }))
        .optional(),
      timingStatus: z.enum(['NONE', 'AUTO', 'VERIFIED']).optional(),
      isDefault: z.boolean().optional(),
      isPublished: z.boolean().optional(),
    });
    return this.narrations.attach(storyId, parse(schema, body) as AttachNarrationInput, user.id);
  }

  @Patch('narrations/:id')
  updateNarration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<NarrationAdminSummary> {
    const schema = z.object({
      sentenceTimings: z
        .array(z.object({ sentenceId: z.string(), startMs: z.number(), endMs: z.number() }))
        .optional(),
      timingStatus: z.enum(['NONE', 'AUTO', 'VERIFIED']).optional(),
      isDefault: z.boolean().optional(),
      isPublished: z.boolean().optional(),
      soundscapeId: z.string().uuid().nullable().optional(),
    });
    return this.narrations.update(id, parse(schema, body) as UpdateNarrationInput, user.id);
  }

  // ───────────── catalogue ─────────────

  @Post('tribes')
  createTribe(@Body() body: unknown): Promise<TribeSummary> {
    return this.catalogue.createTribe(parse(tribeSchema, body) as TribeInput);
  }

  @Patch('tribes/:id')
  updateTribe(@Param('id') id: string, @Body() body: unknown): Promise<TribeSummary> {
    return this.catalogue.updateTribe(id, parse(tribeSchema.partial(), body) as Partial<TribeInput>);
  }

  @Post('categories')
  createCategory(@Body() body: unknown): Promise<CategorySummary> {
    return this.catalogue.createCategory(parse(categorySchema, body) as CategoryInput);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: unknown): Promise<CategorySummary> {
    return this.catalogue.updateCategory(id, parse(categorySchema.partial(), body) as Partial<CategoryInput>);
  }

  @Post('narrators')
  createNarrator(@Body() body: unknown): Promise<{ id: string; slug: string; name: string }> {
    return this.catalogue.createNarrator(parse(narratorSchema, body) as NarratorInput);
  }

  @Patch('narrators/:id')
  updateNarrator(@Param('id') id: string, @Body() body: unknown): Promise<{ id: string; slug: string; name: string }> {
    return this.catalogue.updateNarrator(id, parse(narratorSchema.partial(), body) as Partial<NarratorInput>);
  }

  // ───────────── story of the day ─────────────

  @Get('story-of-the-day')
  listStoryOfTheDay(@Query('from') from?: string, @Query('to') to?: string): Promise<StoryOfDayEntry[]> {
    const start = from ?? new Date().toISOString().slice(0, 10);
    const end = to ?? new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    return this.catalogue.listStoryOfTheDay(start, end);
  }

  @Put('story-of-the-day/:date')
  setStoryOfTheDay(@Param('date') date: string, @Body() body: unknown): Promise<StoryOfDayEntry> {
    const schema = z.object({ storyId: z.string().uuid() });
    const parsed = parse(schema, body);
    return this.catalogue.setStoryOfTheDay(date, parsed.storyId);
  }

  @Delete('story-of-the-day/:date')
  removeStoryOfTheDay(@Param('date') date: string): Promise<{ ok: true }> {
    return this.catalogue.removeStoryOfTheDay(date);
  }

  // ───────────── submissions queue ─────────────

  @Get('submissions')
  queue(@Query() query: RawQuery) {
    return this.users.queueSubmissions(
      typeof query.status === 'string' ? (query.status as SubmissionStatus) : undefined,
      parseLimit(query.limit),
      typeof query.cursor === 'string' ? query.cursor : undefined,
    );
  }

  @Post('submissions/:id/claim')
  claim(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SubmissionSummary> {
    return this.users.claimSubmission(user, id);
  }

  @Post('submissions/:id/request-changes')
  requestChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SubmissionSummary> {
    const schema = z.object({ note: z.string().max(1000).optional() });
    return this.users.requestSubmissionChanges(user, id, parse(schema, body) as ModerationActionInput);
  }

  @Post('submissions/:id/approve')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown): Promise<SubmissionSummary> {
    const schema = z.object({ note: z.string().max(1000).optional() });
    return this.users.approveSubmission(user, id, parse(schema, body) as ModerationActionInput);
  }

  @Post('submissions/:id/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown): Promise<SubmissionSummary> {
    const schema = z.object({ note: z.string().max(1000).optional() });
    return this.users.rejectSubmission(user, id, parse(schema, body) as ModerationActionInput);
  }

  // ───────────── users / flags / audit / metrics ─────────────

  @Get('users')
  @Roles('ADMIN')
  listUsers(@Query() query: RawQuery): Promise<Paginated<AdminUserRow>> {
    return this.users.listUsers(typeof query.q === 'string' ? query.q : undefined, parseLimit(query.limit));
  }

  @Patch('users/:id')
  @Roles('ADMIN')
  updateUser(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const schema = z.object({
      systemRole: z.enum(['READER', 'CONTRIBUTOR', 'EDITOR', 'ADMIN']).optional(),
      status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']).optional(),
    });
    return this.users.updateUser(user, id, parse(schema, body));
  }

  @Get('feature-flags')
  flags(): Promise<FeatureFlagRow[]> {
    return this.users.listFlags();
  }

  @Put('feature-flags/:key')
  setFlag(@Param('key') key: string, @Body() body: unknown): Promise<FeatureFlagRow> {
    const parsed = parse(z.object({ enabled: z.boolean() }), body);
    return this.users.setFlag(key, parsed.enabled);
  }

  @Get('audit-log')
  @Roles('ADMIN')
  audit(@Query() query: RawQuery): Promise<Paginated<AuditLogRow>> {
    return this.users.auditLog(parseLimit(query.limit));
  }

  @Get('metrics/overview')
  metrics(): Promise<AdminMetricsOverview> {
    return this.users.metrics();
  }
}
